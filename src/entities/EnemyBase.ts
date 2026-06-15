import { COLORS, DEPTHS, EVENTS } from '../game/constants';
import { type DamagePayload } from '../data/combatConfig';
import { type EnemyDropKind } from '../data/dropConfig';
import { type EnemyMovementState, type GroundEnemyMovementConfig } from '../data/enemyMovementConfig';
import { type EnemySpriteProfile } from '../data/enemySpriteConfig';
import { gameText } from '../data/gameText';
import { spriteAnimationKey, type EnemyVisualRole } from '../data/spriteAnimationConfig';
import { type Player } from './Player';

export abstract class EnemyBase extends Phaser.Physics.Arcade.Sprite {
  protected health: number;
  protected direction: 1 | -1 = -1;
  protected hitFlashMs = 0;
  protected hitstunMs = 0;
  protected recoverMs = 0;
  protected knockbackMultiplier = 1;
  // When true, regular hits still deal damage and flash, but never apply
  // hitstun, knockback or the hurt reaction — only a dedicated stun stops it.
  protected staggerResistant = false;
  protected dead = false;
  protected movementState: EnemyMovementState = 'idle';
  protected readonly homeX: number;
  protected readonly homeY: number;
  readonly enemyKind: EnemyDropKind;

  constructor(
    scene: Phaser.Scene,
    x: number,
    y: number,
    protected readonly spriteProfile: EnemySpriteProfile,
    health: number,
    protected readonly patrolMin: number,
    protected readonly patrolMax: number,
    kind: EnemyDropKind,
  ) {
    super(scene, x, y, spriteProfile.textureKey, spriteProfile.initialFrame);
    this.health = health;
    this.homeX = x;
    this.homeY = y;
    this.enemyKind = kind;
    scene.add.existing(this);
    scene.physics.add.existing(this);
    this.setDepth(DEPTHS.enemies);
    this.setScale(spriteProfile.scale);
    this.setOrigin(spriteProfile.origin.x, spriteProfile.origin.y);
    if (spriteProfile.renderCrop) {
      const crop = spriteProfile.renderCrop;
      const left = crop.left ?? 0;
      const top = crop.top ?? 0;
      const right = crop.right ?? 0;
      const bottom = crop.bottom ?? 0;
      this.setCrop(left, top, this.frame.width - left - right, this.frame.height - top - bottom);
    }
    this.setCollideWorldBounds(false);
    const body = this.body as Phaser.Physics.Arcade.Body;
    body.setSize(spriteProfile.body.width, spriteProfile.body.height);
    body.setOffset(spriteProfile.body.offsetX, spriteProfile.body.offsetY);
    this.playEnemyAnimation('idle');
  }

  abstract updateEnemy(deltaMs: number, player: Player, projectiles: Phaser.Physics.Arcade.Group): void;

  takeDamage(payload: DamagePayload): boolean {
    if (this.dead) return true;
    this.health -= payload.amount;
    const hitDirection: 1 | -1 = this.x >= payload.hitX ? 1 : -1;
    const body = this.body as Phaser.Physics.Arcade.Body;
    if (this.health <= 0) {
      this.die(payload, hitDirection);
      return true;
    }

    this.hitFlashMs = 150;
    this.setTint(COLORS.cyan);
    if (!this.staggerResistant) {
      this.hitstunMs = payload.stunMs;
      this.recoverMs = Math.max(this.recoverMs, payload.stunMs + 120);
      this.setMovementState('stunned', 'damage');
      this.playEnemyAnimation('hurt');
      if (payload.knockback.enabled) {
        body.setVelocityX(Phaser.Math.Clamp(payload.knockback.x * hitDirection * this.knockbackMultiplier, -380, 380));
        if (body.allowGravity) body.setVelocityY(Math.min(body.velocity.y, payload.knockback.y * this.knockbackMultiplier));
        else body.setVelocityY(payload.knockback.y * 0.62 * this.knockbackMultiplier);
      }
    }
    this.scene.events.emit(EVENTS.enemyDamaged, this.x, this.y, hitDirection, payload);
    return false;
  }

  isDead(): boolean {
    return this.dead;
  }

  protected tickFlash(deltaMs: number): void {
    if (this.hitFlashMs <= 0) return;
    this.hitFlashMs -= deltaMs;
    if (this.hitFlashMs <= 0) this.clearTint();
  }

  protected tickDamageState(deltaMs: number): boolean {
    this.tickFlash(deltaMs);
    if (this.hitstunMs <= 0) return false;
    this.hitstunMs = Math.max(0, this.hitstunMs - deltaMs);
    this.setMovementState('stunned', 'hitstun');
    const body = this.body as Phaser.Physics.Arcade.Body;
    body.setVelocityX(Phaser.Math.Linear(body.velocity.x, 0, 0.08));
    if (!body.allowGravity) body.setVelocityY(Phaser.Math.Linear(body.velocity.y, 0, 0.12));
    return true;
  }

  protected tickRecover(deltaMs: number, deceleration: number): boolean {
    if (this.recoverMs <= 0) return false;
    this.recoverMs = Math.max(0, this.recoverMs - deltaMs);
    this.setMovementState('recover', 'recover');
    this.brakeX(deceleration, deltaMs);
    if (!((this.body as Phaser.Physics.Arcade.Body).allowGravity)) {
      const body = this.body as Phaser.Physics.Arcade.Body;
      body.setVelocityY(Phaser.Math.Linear(body.velocity.y, 0, 0.12));
    }
    return this.recoverMs > 0;
  }

  protected facePlayer(player: Player): void {
    this.direction = player.x >= this.x ? 1 : -1;
    this.setFlipX(this.direction < 0);
  }

  protected patrol(speed: number): void {
    const body = this.body as Phaser.Physics.Arcade.Body;
    if (this.x < this.patrolMin) this.direction = 1;
    if (this.x > this.patrolMax) this.direction = -1;
    body.setVelocityX(speed * this.direction);
    this.setFlipX(this.direction < 0);
  }

  protected patrolWithEdges(config: GroundEnemyMovementConfig, deltaMs: number): void {
    if (this.x <= this.patrolMin + 8) this.direction = 1;
    if (this.x >= this.patrolMax - 8) this.direction = -1;
    const body = this.body as Phaser.Physics.Arcade.Body;
    if ((body.blocked.down || body.touching.down) && !this.hasGroundAhead(this.direction, config.edgeProbeX, config.edgeProbeY)) {
      this.direction = -this.direction as 1 | -1;
    }
    this.setMovementState('patrol', 'patrol');
    this.moveTowardVelocityX(config.patrolSpeed * this.direction, config.acceleration, deltaMs);
    this.setFlipX(this.direction < 0);
  }

  protected leashToHome(config: GroundEnemyMovementConfig, deltaMs: number): boolean {
    if (Math.abs(this.x - this.homeX) <= 18) return false;
    this.setMovementState('leash', 'home');
    this.direction = this.x < this.homeX ? 1 : -1;
    this.moveTowardVelocityX(config.patrolSpeed * this.direction, config.acceleration, deltaMs);
    this.setFlipX(this.direction < 0);
    return true;
  }

  protected shouldLeash(player: Player, leashDistance: number): boolean {
    return Math.abs(player.x - this.homeX) > leashDistance || Math.abs(this.x - this.homeX) > leashDistance * 0.9;
  }

  protected moveTowardVelocityX(targetX: number, acceleration: number, deltaMs: number): void {
    const body = this.body as Phaser.Physics.Arcade.Body;
    body.setVelocityX(this.moveTowards(body.velocity.x, targetX, acceleration * (deltaMs / 1000)));
  }

  protected moveTowardVelocity(targetX: number, targetY: number, acceleration: number, deltaMs: number, maxSpeed: number): void {
    const body = this.body as Phaser.Physics.Arcade.Body;
    const dt = deltaMs / 1000;
    const nextX = this.moveTowards(body.velocity.x, targetX, acceleration * dt);
    const nextY = this.moveTowards(body.velocity.y, targetY, acceleration * dt);
    const vector = new Phaser.Math.Vector2(nextX, nextY);
    if (vector.length() > maxSpeed) vector.setLength(maxSpeed);
    body.setVelocity(vector.x, vector.y);
  }

  protected brakeX(deceleration: number, deltaMs: number): void {
    const body = this.body as Phaser.Physics.Arcade.Body;
    body.setVelocityX(this.moveTowards(body.velocity.x, 0, deceleration * (deltaMs / 1000)));
  }

  protected setMovementState(next: EnemyMovementState, reason = ''): void {
    if (this.movementState === next) return;
    const previous = this.movementState;
    this.movementState = next;
    this.playEnemyAnimation(this.animationRoleForState(next));
    this.scene.events.emit(EVENTS.enemyStateChanged, this, previous, next, reason);
  }

  protected shoot(projectiles: Phaser.Physics.Arcade.Group, x: number, y: number, speed: number, tint = COLORS.red, damage = 1): void {
    const projectile = projectiles.get(x, y) as import('./Projectile').Projectile | null;
    if (!projectile) return;
    projectile.fire(x, y, speed * this.direction, 0, false, tint, damage);
    projectile.setData('sourceEnemy', this);
    this.scene.events.emit('enemy-shoot');
  }

  /**
   * Fires a projectile aimed at a world target. Essential for airborne enemies,
   * whose purely horizontal shots would otherwise always sail over a grounded
   * player. The projectile keeps a constant speed along the aim vector.
   */
  protected shootAt(
    projectiles: Phaser.Physics.Arcade.Group,
    x: number,
    y: number,
    targetX: number,
    targetY: number,
    speed: number,
    tint = COLORS.red,
    damage = 1,
  ): void {
    const projectile = projectiles.get(x, y) as import('./Projectile').Projectile | null;
    if (!projectile) return;
    const dx = targetX - x;
    const dy = targetY - y;
    const length = Math.hypot(dx, dy) || 1;
    this.direction = dx >= 0 ? 1 : -1;
    this.setFlipX(this.direction < 0);
    projectile.fire(x, y, (dx / length) * speed, (dy / length) * speed, false, tint, damage);
    projectile.setData('sourceEnemy', this);
    this.scene.events.emit('enemy-shoot');
  }

  protected playerTorsoY(player: Player): number {
    return player.torsoAimY();
  }

  projectileReturnPoint(): { x: number; y: number } {
    return { x: this.x, y: this.y };
  }

  protected telegraph(color = COLORS.amber, size = 46, durationMs = 220): void {
    const marker = this.scene.add.ellipse(this.x, this.y - 18, size, size * 0.62)
      .setStrokeStyle(2, color, 0.86)
      .setDepth(DEPTHS.effects);
    this.scene.tweens.add({
      targets: marker,
      alpha: 0,
      scaleX: 1.7,
      scaleY: 1.45,
      duration: durationMs,
      ease: 'Cubic.easeOut',
      onComplete: () => marker.destroy(),
    });
  }

  protected die(payload: DamagePayload, direction: 1 | -1): void {
    if (this.dead) return;
    this.dead = true;
    const x = this.x;
    const y = this.y;
    const body = this.body as Phaser.Physics.Arcade.Body;
    body.enable = false;
    body.setVelocity(0, 0);
    this.playEnemyAnimation('death');
    this.scene.tweens.add({
      targets: this,
      alpha: 0,
      delay: 280,
      duration: 180,
      ease: 'Cubic.easeOut',
      onComplete: () => {
        this.setActive(false);
        this.setVisible(false);
      },
    });
    this.scene.game.events.emit(EVENTS.objectiveChanged, gameText.objectives.securityReduced);
    this.scene.events.emit(EVENTS.enemyDefeated, x, y, direction, payload, this.enemyKind);
  }

  protected playEnemyAnimation(role: EnemyVisualRole): boolean {
    const spec = this.spriteProfile.animations[role];
    if (!spec) return false;
    const key = spriteAnimationKey(this.spriteProfile.textureKey, role);
    if (!this.scene.anims.exists(key)) {
      this.setFrame(spec.frames[0] ?? this.spriteProfile.initialFrame);
      return false;
    }
    this.play(key, true);
    return true;
  }

  private animationRoleForState(state: EnemyMovementState): EnemyVisualRole {
    if (state === 'attackWindup') return 'attack';
    if (state === 'recover' || state === 'stunned') return 'hurt';
    if (state === 'patrol' || state === 'chase' || state === 'leash') return 'move';
    return 'idle';
  }

  protected hasGroundAhead(direction: 1 | -1, probeX: number, probeY: number): boolean {
    const body = this.body as Phaser.Physics.Arcade.Body;
    const x = this.x + probeX * direction;
    const y = body.y + body.height + probeY;
    const bodies = this.scene.physics.overlapRect(x - 4, y, 8, 10, false, true);
    return bodies.some((candidate: Phaser.Physics.Arcade.Body | Phaser.Physics.Arcade.StaticBody) => {
      const gameObject = candidate.gameObject as Phaser.GameObjects.GameObject | undefined;
      return candidate !== body && candidate.enable && gameObject?.active !== false;
    });
  }

  private moveTowards(current: number, target: number, maxDelta: number): number {
    if (Math.abs(target - current) <= maxDelta) return target;
    return current + Math.sign(target - current) * maxDelta;
  }
}
