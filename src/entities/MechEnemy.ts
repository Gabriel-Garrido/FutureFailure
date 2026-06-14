import { enemyConfig } from '../data/enemyConfig';
import { enemyMovementConfig } from '../data/enemyMovementConfig';
import { type EnemySpriteProfile } from '../data/enemySpriteConfig';
import { type DamagePayload } from '../data/combatConfig';
import { COLORS, DEPTHS } from '../game/constants';
import { EnemyBase } from './EnemyBase';
import { type Player } from './Player';

type MechIntent = 'patrol' | 'holdRange' | 'retreat' | 'windup' | 'recover' | 'stun';

export type MechDroneVolley = {
  everyNthBurst: number;
  count: number;
  cooldownMultiplier: number;
};

export type MechStunConfig = {
  /** Energy balls absorbed before the boss is stunned. */
  energyThreshold: number;
  durationMs: number;
};

export type MechOptions = {
  health?: number;
  /** Multiplies visual scale and hitbox. */
  sizeScale?: number;
  detectRange?: number;
  closeRetreatDistance?: number;
  attackStopDistance?: number;
  leashDistance?: number;
  shootCooldownMs?: number;
  windupMs?: number;
  enrageHealthFraction?: number;
  enrageCooldownMultiplier?: number;
  /** When set, the enemy behaves as the boss and periodically summons drones. */
  droneVolley?: MechDroneVolley;
  stun?: MechStunConfig;
};

export const BOSS_SUMMON_DRONES_EVENT = 'boss-summon-drones';
export const BOSS_HEALTH_EVENT = 'boss-health';

export class MechEnemy extends EnemyBase {
  private shootCooldownMs = 900;
  private windupMs = 0;
  private recoverAfterBurstMs = 0;
  private intent: MechIntent = 'patrol';
  private readonly glow: Phaser.GameObjects.Ellipse;

  private readonly sizeScale: number;
  private readonly detectRange: number;
  private readonly retreatDistance: number;
  private readonly attackDistance: number;
  private readonly leashDistance: number;
  private readonly baseCooldownMs: number;
  private readonly baseWindupMs: number;
  private readonly enrageHealthFraction: number;
  private readonly enrageCooldownMultiplier: number;
  private readonly droneVolley?: MechDroneVolley;
  private readonly stunConfig?: MechStunConfig;
  private readonly isBoss: boolean;
  private readonly maxHealthValue: number;

  private burstCounter = 0;
  private revealed = false;
  private energyHits = 0;
  private stunMs = 0;
  private stunPhase = 0;
  private stunVfx?: Phaser.GameObjects.Container;

  constructor(
    scene: Phaser.Scene,
    x: number,
    y: number,
    profile: EnemySpriteProfile,
    patrolMin: number,
    patrolMax: number,
    options: MechOptions = {},
  ) {
    super(scene, x, y, profile, options.health ?? enemyConfig.mech.health, patrolMin, patrolMax, 'mech');
    this.knockbackMultiplier = 0.34;
    this.sizeScale = options.sizeScale ?? 1;
    this.detectRange = options.detectRange ?? enemyConfig.mech.detectRange;
    this.retreatDistance = options.closeRetreatDistance ?? enemyMovementConfig.mech.closeRetreatDistance;
    this.attackDistance = options.attackStopDistance ?? enemyMovementConfig.mech.attackStopDistance;
    this.leashDistance = options.leashDistance ?? enemyMovementConfig.mech.leashDistance;
    this.baseCooldownMs = options.shootCooldownMs ?? enemyConfig.mech.shootCooldownMs;
    this.baseWindupMs = options.windupMs ?? enemyConfig.mech.windupMs;
    this.enrageHealthFraction = options.enrageHealthFraction ?? 0;
    this.enrageCooldownMultiplier = options.enrageCooldownMultiplier ?? 1;
    this.droneVolley = options.droneVolley;
    this.stunConfig = options.stun;
    this.isBoss = Boolean(options.droneVolley);
    this.maxHealthValue = options.health ?? enemyConfig.mech.health;

    if (this.sizeScale !== 1) {
      // Body size/offset are defined in source pixels and scale with the sprite,
      // so growing the visual scale grows the Arcade hitbox proportionally.
      this.setScale(profile.scale * this.sizeScale);
      this.knockbackMultiplier = 0.34 / this.sizeScale; // a heavier boss barely flinches
    }

    const body = this.body as Phaser.Physics.Arcade.Body;
    body.setMaxVelocity(this.isBoss ? 220 : 150, this.isBoss ? 720 : 680);

    const glowWidth = this.isBoss ? 88 * profile.scale * this.sizeScale * 1.8 : 128;
    const glowHeight = this.isBoss ? 46 : 30;
    this.glow = scene.add.ellipse(this.x, this.y, glowWidth, glowHeight, COLORS.red, 0.08)
      .setDepth(DEPTHS.enemies - 1)
      .setBlendMode(Phaser.BlendModes.ADD);
  }

  updateEnemy(deltaMs: number, player: Player, projectiles: Phaser.Physics.Arcade.Group): void {
    if (this.isDead()) {
      this.glow.setVisible(false);
      this.clearStunVfx();
      return;
    }

    this.syncGlow();
    const moveConfig = enemyMovementConfig.mech;

    // Boss stun takes priority over every other state: it stands dazed and fully
    // exposed for the whole duration.
    if (this.stunMs > 0) {
      this.stunMs -= deltaMs;
      this.intent = 'stun';
      this.brakeX(moveConfig.deceleration, deltaMs);
      this.setGlow(COLORS.cyan, 0.2);
      this.tickStun(deltaMs);
      if (this.stunMs <= 0) this.endStun();
      return;
    }

    if (this.tickDamageState(deltaMs)) {
      this.cancelAttack();
      this.setGlow(COLORS.cyan, 0.16);
      return;
    }
    if (this.tickRecover(deltaMs, moveConfig.deceleration)) {
      this.cancelAttack();
      this.setGlow(COLORS.cyan, 0.1);
      return;
    }

    const body = this.body as Phaser.Physics.Arcade.Body;
    const distanceX = player.x - this.x;
    const distanceY = player.y - this.y;
    const distance = Math.abs(distanceX);
    const canSee = distance < this.detectRange && Math.abs(distanceY) < 170 * this.sizeScale;
    this.shootCooldownMs = Math.max(0, this.shootCooldownMs - deltaMs);
    this.recoverAfterBurstMs = Math.max(0, this.recoverAfterBurstMs - deltaMs);

    if (canSee) this.revealBoss();

    if (!canSee) {
      this.intent = 'patrol';
      this.cancelAttack();
      this.setGlow(COLORS.red, 0.06);
      this.patrolWithEdges(moveConfig, deltaMs);
      return;
    }

    if (this.shouldLeash(player, this.leashDistance)) {
      this.intent = 'patrol';
      this.cancelAttack();
      this.setGlow(COLORS.amber, 0.08);
      if (!this.leashToHome(moveConfig, deltaMs)) this.patrolWithEdges(moveConfig, deltaMs);
      return;
    }

    this.facePlayer(player);

    if (this.windupMs > 0) {
      this.intent = 'windup';
      this.setMovementState('attackWindup', 'mech-charge');
      this.brakeX(moveConfig.deceleration * 1.2, deltaMs);
      this.windupMs -= deltaMs;
      this.setGlow(COLORS.amber, 0.22 + Math.sin(this.windupMs / 45) * 0.06);
      if (this.windupMs <= 0) this.fireBurst(projectiles, player);
      return;
    }

    if (this.recoverAfterBurstMs > 0) {
      this.intent = 'recover';
      this.setMovementState('recover', 'mech-cooldown');
      this.brakeX(moveConfig.deceleration, deltaMs);
      this.setGlow(COLORS.red, 0.08);
      return;
    }

    // Retreat threshold must stay below the attack threshold so a clear firing
    // band exists between them.
    if (distance < this.retreatDistance) {
      this.intent = 'retreat';
      this.setMovementState('chase', 'mech-retreat');
      this.direction = distanceX >= 0 ? -1 : 1;
      this.setFlipX(this.direction < 0);
      this.moveTowardVelocityX(moveConfig.chaseSpeed * this.direction, moveConfig.acceleration * 0.95, deltaMs);
      this.setGlow(COLORS.amber, 0.13);
      return;
    }

    if (distance > this.attackDistance + 64) {
      this.intent = 'holdRange';
      this.setMovementState('chase', 'mech-pressure');
      this.direction = distanceX >= 0 ? 1 : -1;
      this.setFlipX(this.direction < 0);
      this.moveTowardVelocityX(moveConfig.chaseSpeed * this.direction, moveConfig.acceleration, deltaMs);
      this.setGlow(COLORS.red, 0.1);
      return;
    }

    this.intent = 'holdRange';
    this.setMovementState('idle', 'mech-aim');
    this.brakeX(moveConfig.deceleration, deltaMs);
    body.setVelocityX(Phaser.Math.Clamp(body.velocity.x, -75, 75));
    this.setGlow(COLORS.red, 0.12);

    if (this.shootCooldownMs <= 0) {
      this.windupMs = this.currentWindupMs();
      this.setTint(COLORS.amber);
      this.telegraph(COLORS.amber, 86 * this.sizeScale, this.windupMs);
      this.createAimLine(player);
    }
  }

  takeDamage(payload: DamagePayload): boolean {
    const result = super.takeDamage(payload);
    if (!this.isBoss) return result;

    this.revealBoss();
    if (!this.isDead() && this.stunMs <= 0 && this.stunConfig && this.isEnergyBall(payload.source)) {
      this.energyHits += 1;
      if (this.energyHits >= this.stunConfig.energyThreshold) {
        this.energyHits = 0;
        this.beginStun(this.stunConfig.durationMs);
      }
    }
    this.scene.events.emit(BOSS_HEALTH_EVENT, Math.max(0, this.health), this.maxHealthValue, this.isDead());
    return result;
  }

  private isEnergyBall(source: DamagePayload['source']): boolean {
    return source === 'playerProjectile' || source === 'deflectedProjectile';
  }

  private revealBoss(): void {
    if (!this.isBoss || this.revealed) return;
    this.revealed = true;
    this.scene.events.emit(BOSS_HEALTH_EVENT, Math.max(0, this.health), this.maxHealthValue, false);
  }

  private currentWindupMs(): number {
    return this.isEnraged() ? this.baseWindupMs * 0.7 : this.baseWindupMs;
  }

  private currentCooldownMs(): number {
    return this.isEnraged() ? this.baseCooldownMs * this.enrageCooldownMultiplier : this.baseCooldownMs;
  }

  private isEnraged(): boolean {
    return this.enrageHealthFraction > 0 && this.health <= this.maxHealthValue * this.enrageHealthFraction;
  }

  private arcadeBody(): Phaser.Physics.Arcade.Body {
    return this.body as Phaser.Physics.Arcade.Body;
  }

  private feetY(): number {
    const body = this.arcadeBody();
    return body.y + body.height;
  }

  private muzzle(): { x: number; y: number } {
    if (this.isBoss) {
      const body = this.arcadeBody();
      return { x: this.x + this.direction * (body.halfWidth + 14), y: body.y + body.height * 0.3 };
    }
    return { x: this.x + this.direction * 70, y: this.y - 46 };
  }

  private fireBurst(projectiles: Phaser.Physics.Arcade.Group, player: Player): void {
    this.clearTint();
    const { x: muzzleX, y: muzzleY } = this.muzzle();
    this.burstCounter += 1;

    const volley = this.droneVolley;
    if (volley && this.burstCounter % volley.everyNthBurst === 0) {
      this.summonDrones(muzzleX, muzzleY, volley.count);
      this.shootCooldownMs = this.currentCooldownMs() * volley.cooldownMultiplier;
      this.recoverAfterBurstMs = 700;
      return;
    }

    this.energyBurst(projectiles, player, muzzleX, muzzleY);
    this.shootCooldownMs = this.currentCooldownMs();
    this.recoverAfterBurstMs = 520;
  }

  private energyBurst(projectiles: Phaser.Physics.Arcade.Group, player: Player, muzzleX: number, muzzleY: number): void {
    const damage = this.isBoss ? enemyConfig.boss.damage : enemyConfig.mech.damage;
    const speed = this.isBoss ? 300 : 285;
    for (let i = 0; i < enemyConfig.mech.burstCount; i += 1) {
      this.scene.time.delayedCall(i * 155, () => {
        if (this.isDead() || this.stunMs > 0) return;
        const targetX = player.x + (i - 1) * 22;
        const targetY = this.playerTorsoY(player) + (i - 1) * 8;
        this.shootAt(projectiles, muzzleX, muzzleY, targetX, targetY, speed, COLORS.red, damage);
        this.kickbackPulse();
      });
    }
  }

  private summonDrones(muzzleX: number, muzzleY: number, count: number): void {
    this.telegraph(COLORS.purple, 120 * this.sizeScale, 260);
    this.scene.events.emit(BOSS_SUMMON_DRONES_EVENT, muzzleX, muzzleY, count, this.direction);
    this.kickbackPulse();
  }

  private createAimLine(player: Player): void {
    const { x: muzzleX, y: muzzleY } = this.muzzle();
    const line = this.scene.add.line(0, 0, muzzleX, muzzleY, player.x, this.playerTorsoY(player), COLORS.amber, 0.35)
      .setOrigin(0, 0)
      .setDepth(DEPTHS.effects);
    this.scene.tweens.add({
      targets: line,
      alpha: 0,
      duration: this.windupMs,
      ease: 'Cubic.easeOut',
      onComplete: () => line.destroy(),
    });
  }

  private kickbackPulse(): void {
    this.scene.tweens.add({
      targets: this,
      x: this.x - this.direction * 5 * this.sizeScale,
      duration: 45,
      yoyo: true,
      ease: 'Cubic.easeOut',
    });
  }

  private cancelAttack(): void {
    this.windupMs = 0;
    if (this.intent === 'windup') this.clearTint();
  }

  /* ---------------- Stun ---------------- */
  private beginStun(durationMs: number): void {
    this.stunMs = durationMs;
    this.windupMs = 0;
    this.recoverAfterBurstMs = 0;
    this.intent = 'stun';
    this.hitstunMs = 0;
    this.setMovementState('stunned', 'boss-stun');
    this.playEnemyAnimation('hurt');
    this.setTint(COLORS.cyan);
    this.spawnStunVfx();
  }

  private endStun(): void {
    this.stunMs = 0;
    this.clearStunVfx();
    this.clearTint();
    this.shootCooldownMs = Math.min(this.shootCooldownMs, 360);
    this.setMovementState('idle', 'boss-stun-recover');
  }

  private tickStun(deltaMs: number): void {
    this.playEnemyAnimation('hurt');
    this.setTint(Math.floor(this.stunMs / 120) % 2 === 0 ? COLORS.cyan : 0xffffff);
    this.updateStunVfx(deltaMs);
  }

  private spawnStunVfx(): void {
    this.clearStunVfx();
    const container = this.scene.add.container(this.x, this.arcadeBody().y - 14 * this.sizeScale).setDepth(DEPTHS.effects + 3);
    const count = 5;
    for (let i = 0; i < count; i += 1) {
      const star = this.scene.add.star(0, 0, 5, 3.4 * this.sizeScale * 0.5, 7.5 * this.sizeScale * 0.5, COLORS.amber)
        .setBlendMode(Phaser.BlendModes.ADD);
      container.add(star);
    }
    this.stunVfx = container;
    this.stunPhase = 0;
    this.updateStunVfx(0);
  }

  private updateStunVfx(deltaMs: number): void {
    if (!this.stunVfx) return;
    this.stunVfx.setPosition(this.x, this.arcadeBody().y - 14 * this.sizeScale);
    this.stunPhase += deltaMs / 260;
    const rx = 66 * this.sizeScale * 0.5;
    const ry = 22 * this.sizeScale * 0.5;
    const stars = this.stunVfx.list as Phaser.GameObjects.Star[];
    stars.forEach((star, index) => {
      const angle = this.stunPhase + (Math.PI * 2 * index) / stars.length;
      star.setPosition(Math.cos(angle) * rx, Math.sin(angle) * ry);
      star.setScale(0.7 + 0.35 * Math.sin(angle * 2));
    });
  }

  private clearStunVfx(): void {
    this.stunVfx?.destroy();
    this.stunVfx = undefined;
  }

  private syncGlow(): void {
    if (this.isBoss) this.glow.setPosition(this.x, this.feetY() - 6);
    else this.glow.setPosition(this.x, this.y + 56 * this.sizeScale);
    this.glow.setScale(this.flipX ? -1 : 1, 1);
  }

  private setGlow(color: number, alpha: number): void {
    this.glow.setFillStyle(color, alpha);
  }

  destroy(fromScene?: boolean): void {
    this.clearStunVfx();
    this.glow.destroy();
    super.destroy(fromScene);
  }
}
