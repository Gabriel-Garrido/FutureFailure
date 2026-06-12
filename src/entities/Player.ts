import { movementConfig } from '../data/movementConfig';
import { gameText } from '../data/gameText';
import { combatConfig, type AttackStage, type AttackStageConfig, type DamagePayload } from '../data/combatConfig';
import { COLORS, DEPTHS, EVENTS } from '../game/constants';
import { AudioSystem } from '../systems/AudioSystem';
import { type InputSnapshot } from '../systems/InputSystem';
import { MovementController } from '../systems/MovementController';
import { ParticleSystem } from '../systems/ParticleSystem';

export class Player extends Phaser.Physics.Arcade.Sprite {
  readonly movement: MovementController;
  readonly attackZone: Phaser.GameObjects.Zone;
  health = 5;
  maxHealth = 5;
  energy = 3;
  hasKeycard = false;
  private attackStage: AttackStage | 0 = 0;
  private lastAttackStage: AttackStage | 0 = 0;
  private attackElapsedMs = 0;
  private attackBufferMs = 0;
  private comboTimerMs = 0;
  private attackQueued = false;
  private previousGrounded = false;
  private previousDashing = false;
  private lastVelocityY = 0;
  private dashParticleMs = 0;
  private hurtFlashMs = 0;
  private hitTargets = new WeakSet<object>();
  private readonly recentDamageIds = new Map<string, number>();
  private readonly visual: Phaser.GameObjects.Sprite;
  private readonly visualFrameMetrics = [
    { centerX: 161, footY: 274 },
    { centerX: 124.5, footY: 274 },
    { centerX: 108, footY: 274 },
    { centerX: 98, footY: 274 },
    { centerX: 80.5, footY: 274 },
    { centerX: 161.5, footY: 241 },
    { centerX: 136.5, footY: 241 },
    { centerX: 114, footY: 277 },
    { centerX: 96, footY: 242 },
    { centerX: 92.5, footY: 243 },
    { centerX: 142, footY: 211 },
    { centerX: 140.5, footY: 193 },
    { centerX: 106.5, footY: 170 },
    { centerX: 139.5, footY: 215 },
    { centerX: 106, footY: 211 },
    { centerX: 141, footY: 194 },
    { centerX: 125.5, footY: 194 },
    { centerX: 154, footY: 194 },
    { centerX: 153.5, footY: 194 },
    { centerX: 95.5, footY: 194 },
  ];

  constructor(
    scene: Phaser.Scene,
    x: number,
    y: number,
    private readonly particles: ParticleSystem,
    private readonly audio: AudioSystem,
  ) {
    super(scene, x, y, scene.textures.exists('player') ? 'player' : 'fallback-player');
    scene.add.existing(this);
    scene.physics.add.existing(this);
    this.setDepth(DEPTHS.player - 1);
    this.setAlpha(0);
    this.setScale(0.32);
    this.setCollideWorldBounds(false);
    this.visual = scene.add.sprite(x, y, scene.textures.exists('player') ? 'player' : 'fallback-player');
    this.visual.setDepth(DEPTHS.player);
    this.visual.setScale(0.32);
    const body = this.body as Phaser.Physics.Arcade.Body;
    body.setSize(96, 224);
    body.setOffset(92, 44);
    this.movement = new MovementController(this, movementConfig);
    this.attackZone = scene.add.zone(x, y, 64, 58);
    scene.physics.add.existing(this.attackZone);
    (this.attackZone.body as Phaser.Physics.Arcade.Body).setAllowGravity(false);
    (this.attackZone.body as Phaser.Physics.Arcade.Body).enable = false;
  }

  updatePlayer(deltaMs: number, input: InputSnapshot): void {
    const wasDashing = this.previousDashing;
    const movementInput = this.shouldSuppressBurstMovement() ? { ...input, jumpPressed: false, dashPressed: false } : input;
    this.movement.update(deltaMs, movementInput);
    if (this.movement.state.dashing && !wasDashing) {
      this.scene.events.emit('player-dash', this.x, this.y);
      this.audio.blip('dash');
    }
    this.previousDashing = this.movement.state.dashing;
    this.updateAttackState(deltaMs, input);

    this.updateAttackZone();
    this.updateAnimation();
    this.syncVisual();
    this.updateFeedback(deltaMs);
  }

  isAttacking(): boolean {
    return this.attackStage !== 0 && this.isAttackWindowActive();
  }

  canHitAttack(target: object): boolean {
    return this.isAttacking() && !this.hitTargets.has(target);
  }

  markAttackHit(target: object): void {
    this.hitTargets.add(target);
  }

  currentAttackPayload(): DamagePayload | undefined {
    const config = this.currentAttackConfig();
    if (!config || !this.isAttacking()) return undefined;
    return {
      amount: config.amount,
      source: 'playerMelee',
      hitX: this.x,
      knockback: config.knockback,
      stunMs: config.stunMs,
      hitstop: config.hitstop,
      defeatHitstop: config.defeatHitstop,
      isFinisher: config.isFinisher,
      attackStage: config.stage,
    };
  }

  takeDamage(payload: DamagePayload): boolean {
    this.expireRecentDamageIds();
    if (payload.hitId && this.recentDamageIds.has(payload.hitId)) return false;
    if (this.movement.state.invulnerable || this.movement.state.dead) return false;
    if (payload.hitId) this.recentDamageIds.set(payload.hitId, this.scene.time.now + (payload.invulnerabilityMs ?? 300));
    this.health = Math.max(0, this.health - payload.amount);
    this.scene.game.events.emit(EVENTS.healthChanged, this.health, this.maxHealth);
    if (payload.knockback.enabled) {
      this.movement.damageKnockback(payload.hitX, payload.knockback, payload.stunMs, payload.invulnerabilityMs, payload.reaction);
    } else {
      this.movement.damageWithoutKnockback(payload.stunMs, payload.invulnerabilityMs, payload.reaction);
    }
    this.audio.blip('hurt');
    this.hurtFlashMs = payload.reaction?.flashMs ?? 260;
    this.visual.setTint(COLORS.red);
    if (payload.source === 'enemyProjectile') this.particles.playerEnergyDamage(this.x, this.y, this.x >= payload.hitX ? 1 : -1);
    else this.particles.playerDamage(this.x, this.y);
    this.scene.events.emit(EVENTS.playerDamaged, this.x, this.y, payload);
    if (this.health <= 0) this.die();
    return true;
  }

  heal(amount: number): void {
    this.health = Math.min(this.maxHealth, this.health + amount);
    this.scene.game.events.emit(EVENTS.healthChanged, this.health, this.maxHealth);
  }

  addEnergy(amount: number): void {
    this.energy = Phaser.Math.Clamp(this.energy + amount, 0, 5);
    this.scene.game.events.emit(EVENTS.energyChanged, this.energy, 5);
  }

  giveKeycard(): void {
    this.hasKeycard = true;
    this.scene.game.events.emit(EVENTS.keycardChanged, true);
    this.scene.game.events.emit(EVENTS.objectiveChanged, gameText.objectives.hasKeycard);
  }

  respawn(x: number, y: number): void {
    this.health = this.maxHealth;
    this.scene.game.events.emit(EVENTS.healthChanged, this.health, this.maxHealth);
    this.movement.respawn(x, y);
    this.hurtFlashMs = 0;
    this.visual.clearTint();
    this.visual.setAlpha(1);
    this.visual.setAngle(0);
    this.syncVisual();
  }

  private updateAttackState(deltaMs: number, input: InputSnapshot): void {
    this.attackBufferMs = Math.max(0, this.attackBufferMs - deltaMs);
    this.comboTimerMs = Math.max(0, this.comboTimerMs - deltaMs);

    if (input.attackPressed && !this.movement.state.dead) {
      if (this.canQueueCurrentAttack()) this.attackQueued = true;
      else this.attackBufferMs = combatConfig.combo.inputBufferMs;
    }

    if (this.attackStage !== 0) {
      this.attackElapsedMs += deltaMs;
      if ((input.dashPressed || input.jumpPressed) && this.canCancelCurrentAttack()) {
        this.endAttack(true);
      } else {
        const config = this.currentAttackConfig();
        if (config && this.attackElapsedMs >= config.durationMs) {
          const shouldChain = (this.attackQueued || this.attackBufferMs > 0) && config.stage < 3;
          if (shouldChain) this.startAttack((config.stage + 1) as AttackStage);
          else this.endAttack(false);
        }
      }
    }

    if (this.attackStage === 0 && this.attackBufferMs > 0 && !this.movement.state.dead) {
      this.startAttack(this.resolveBufferedAttackStage());
    }
  }

  private startAttack(stage: AttackStage): void {
    const config = combatConfig.combo.stages[stage - 1];
    this.hitTargets = new WeakSet<object>();
    this.attackStage = stage;
    this.lastAttackStage = stage;
    this.attackElapsedMs = 0;
    this.attackBufferMs = 0;
    this.attackQueued = false;
    this.comboTimerMs = combatConfig.combo.resetMs;
    this.audio.blip('blocked');
    this.applyAttackLunge(config);
    const arcColor = config.isFinisher ? COLORS.amber : COLORS.cyan;
    const arc = this.scene.add.ellipse(this.x + this.movement.state.facing * config.offsetX, this.y + config.offsetY - 6, config.width, config.height, arcColor, config.isFinisher ? 0.36 : 0.26);
    arc.setDepth(DEPTHS.effects);
    this.scene.tweens.add({ targets: arc, alpha: 0, scaleX: 1.36, scaleY: 1.16, duration: config.activeEndMs + 42, onComplete: () => arc.destroy() });
  }

  private updateAttackZone(): void {
    const body = this.attackZone.body as Phaser.Physics.Arcade.Body;
    const config = this.currentAttackConfig();
    if (!config) {
      body.enable = false;
      return;
    }
    this.attackZone.setPosition(this.x + this.movement.state.facing * config.offsetX, this.y + config.offsetY);
    this.attackZone.setSize(config.width, config.height);
    body.setSize(config.width, config.height, true);
    body.enable = this.isAttacking();
  }

  private updateAnimation(): void {
    if (this.movement.state.dead) {
      this.visual.setAngle(Phaser.Math.Linear(this.visual.angle, 70, 0.05));
      return;
    }
    if (!this.scene.anims.exists('player-idle')) {
      this.syncVisual();
      return;
    }
    const body = this.body as Phaser.Physics.Arcade.Body;
    if (this.attackStage !== 0) this.visual.play('player-attack', true);
    else if (this.movement.state.dashing) this.visual.play('player-dash', true);
    else if (!this.movement.state.grounded && body.velocity.y < 0) this.visual.play('player-jump', true);
    else if (!this.movement.state.grounded) this.visual.play('player-fall', true);
    else if (Math.abs(body.velocity.x) > 20) this.visual.play('player-run', true);
    else this.visual.play('player-idle', true);
  }

  private syncVisual(): void {
    const frameIndex = Number(this.visual.frame.name);
    const metrics = Number.isFinite(frameIndex) ? this.visualFrameMetrics[frameIndex] : undefined;
    const scale = Math.abs(this.visual.scaleX);
    const facing = this.movement.state.facing;
    const centerCorrection = metrics ? (140 - metrics.centerX) * scale * facing : 0;
    const footCorrection = metrics ? (274 - metrics.footY) * scale : 0;
    this.visual.setFlipX(facing < 0);
    this.visual.setPosition(this.x + centerCorrection, this.y + footCorrection);
  }

  private updateFeedback(deltaMs: number): void {
    const body = this.body as Phaser.Physics.Arcade.Body;
    this.dashParticleMs = Math.max(0, this.dashParticleMs - deltaMs);
    this.hurtFlashMs = Math.max(0, this.hurtFlashMs - deltaMs);
    this.expireRecentDamageIds();
    this.updateDamageReadability();
    if (this.movement.state.dashing && this.dashParticleMs <= 0) {
      this.particles.dash(this.x, this.y, this.movement.state.facing);
      this.dashParticleMs = 24;
    }
    if (this.previousGrounded && !this.movement.state.grounded && body.velocity.y < -180 && !this.movement.state.dashing) {
      this.particles.jump(this.x, this.y);
    }
    if (!this.previousGrounded && this.movement.state.grounded && this.lastVelocityY > 340) {
      this.particles.land(this.x, this.y);
    }
    this.previousGrounded = this.movement.state.grounded;
    this.lastVelocityY = body.velocity.y;
  }

  private die(): void {
    this.movement.kill();
    this.visual.setAlpha(1);
    this.visual.setTint(COLORS.red);
    this.scene.events.emit(EVENTS.playerDied);
  }

  private currentAttackConfig(): AttackStageConfig | undefined {
    if (this.attackStage === 0) return undefined;
    return combatConfig.combo.stages[this.attackStage - 1];
  }

  private isAttackWindowActive(): boolean {
    const config = this.currentAttackConfig();
    return Boolean(config && this.attackElapsedMs >= config.activeStartMs && this.attackElapsedMs <= config.activeEndMs);
  }

  private canQueueCurrentAttack(): boolean {
    const config = this.currentAttackConfig();
    return Boolean(config && config.stage < 3 && this.attackElapsedMs >= config.chainStartMs && this.attackElapsedMs <= config.chainEndMs);
  }

  private canCancelCurrentAttack(): boolean {
    const config = this.currentAttackConfig();
    return Boolean(config && config.stage < 3 && this.attackElapsedMs >= config.cancelAfterMs);
  }

  private shouldSuppressBurstMovement(): boolean {
    const config = this.currentAttackConfig();
    return Boolean(config && this.attackElapsedMs < config.cancelAfterMs);
  }

  private endAttack(cancelled: boolean): void {
    const endedStage = this.attackStage;
    this.attackStage = 0;
    this.attackElapsedMs = 0;
    this.attackQueued = false;
    if (endedStage === 3) {
      this.lastAttackStage = 0;
      this.comboTimerMs = 0;
    } else {
      this.comboTimerMs = cancelled ? combatConfig.combo.resetMs * 0.55 : combatConfig.combo.resetMs;
    }
  }

  private resolveBufferedAttackStage(): AttackStage {
    if (this.comboTimerMs > 0 && this.lastAttackStage > 0 && this.lastAttackStage < 3) {
      return (this.lastAttackStage + 1) as AttackStage;
    }
    return 1;
  }

  private applyAttackLunge(config: AttackStageConfig): void {
    const body = this.body as Phaser.Physics.Arcade.Body;
    const nextVelocity = Phaser.Math.Clamp(body.velocity.x + config.lungeX * this.movement.state.facing, -430, 430);
    body.setVelocityX(nextVelocity);
  }

  private expireRecentDamageIds(): void {
    const now = this.scene.time.now;
    for (const [hitId, expiresAt] of this.recentDamageIds) {
      if (expiresAt <= now) this.recentDamageIds.delete(hitId);
    }
  }

  private updateDamageReadability(): void {
    if (this.movement.state.dead) return;
    if (this.hurtFlashMs > 0) {
      this.visual.setAlpha(1);
      this.visual.setTint(COLORS.red);
      return;
    }
    if (this.movement.state.invulnerable) {
      const blink = Math.floor(this.scene.time.now / 70) % 2 === 0;
      this.visual.setAlpha(blink ? 0.48 : 0.92);
      this.visual.setTint(0xffb3c1);
      return;
    }
    this.visual.setAlpha(1);
    this.visual.clearTint();
  }
}
