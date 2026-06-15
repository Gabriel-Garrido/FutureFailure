import { enemyConfig } from '../data/enemyConfig';
import { enemyMovementConfig } from '../data/enemyMovementConfig';
import { type EnemySpriteProfile, type EnemyVisualRole } from '../data/enemySpriteConfig';
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

export type BossSummonDronesPayload = {
  originX: number;
  originY: number;
  targetX: number;
  targetY: number;
  count: number;
};

const MECH_FRAME_SIZE = 209;
const MECH_MUZZLE_X_RATIO = 163 / MECH_FRAME_SIZE;
const MECH_MUZZLE_Y_RATIO = 0.54;
const MECH_RETURN_X_RATIO = 156 / MECH_FRAME_SIZE;
const MECH_RETURN_Y_RATIO = 0.56;
const MECH_BOTTOM_BY_ROLE: Record<'idle' | 'move' | 'attack' | 'hurt' | 'death', number> = {
  idle: 206,
  move: 206,
  attack: 182,
  hurt: 161,
  death: 135,
};
const MECH_CENTER_BY_ROLE: Record<'idle' | 'move' | 'attack' | 'hurt' | 'death', number> = {
  idle: 122,
  move: 118.5,
  attack: 111,
  hurt: 120.5,
  death: 104,
};

export class MechEnemy extends EnemyBase {
  private shootCooldownMs = 900;
  private windupMs = 0;
  private recoverAfterBurstMs = 0;
  private intent: MechIntent = 'patrol';
  private readonly glow: Phaser.GameObjects.Ellipse;
  // Boss-only: a pulsing outline of the chassis hitbox so the player can read
  // that the body — not the legs — is the part that hits and can be hit.
  private readonly bodyMarker?: Phaser.GameObjects.Rectangle;
  private markerPulse = 0;

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
    if (this.isBoss) {
      this.staggerResistant = true;
      // The chassis-only hitbox no longer reaches the floor, so gravity would
      // drop the boss through it. Pin it instead: it never needs to fall.
      body.setAllowGravity(false);
      body.setVelocityY(0);
      body.setVelocityX(0);
    }

    const finalScale = profile.scale * this.sizeScale;
    const glowWidth = this.isBoss ? profile.body.width * finalScale * 1.1 : 128;
    const glowHeight = this.isBoss ? profile.body.height * finalScale * 1.08 : 30;
    this.glow = scene.add.ellipse(this.x, this.y, glowWidth, glowHeight, COLORS.red, 0.08)
      .setDepth(this.isBoss ? DEPTHS.enemies + 1 : DEPTHS.enemies - 1)
      .setBlendMode(Phaser.BlendModes.ADD);

    if (this.isBoss) {
      this.bodyMarker = scene.add.rectangle(this.x, this.y, body.width, body.height, COLORS.red, 0.04)
        .setStrokeStyle(2, COLORS.red, 0.4)
        .setDepth(DEPTHS.enemies + 2)
        .setBlendMode(Phaser.BlendModes.ADD);
    }
  }

  updateEnemy(deltaMs: number, player: Player, projectiles: Phaser.Physics.Arcade.Group): void {
    if (this.isDead()) {
      this.glow.setVisible(false);
      this.bodyMarker?.setVisible(false);
      this.clearStunVfx();
      return;
    }

    this.syncOverlays(deltaMs);
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
    // band exists between them. facePlayer (called above) already oriented the
    // sprite toward the player — don't override direction/flipX here or the boss
    // turns its back to the player while retreating.
    if (distance < this.retreatDistance) {
      // When cooldown expires at close range, commit to firing rather than
      // retreating until the boss hits a wall and stops attacking entirely.
      if (this.shootCooldownMs <= 0) {
        this.intent = 'holdRange';
        this.windupMs = this.currentWindupMs();
        this.setTint(COLORS.amber);
        this.telegraph(COLORS.amber, 86 * this.sizeScale, this.windupMs);
        this.createAimLine(player);
        this.setMovementState('idle', 'mech-retreat-aim');
        this.brakeX(moveConfig.deceleration * 1.5, deltaMs);
        this.setGlow(COLORS.red, 0.12);
        return;
      }
      this.intent = 'retreat';
      this.setMovementState('chase', 'mech-retreat');
      // Use a local var for movement direction; this.direction stays toward player.
      const retreatDir: 1 | -1 = distanceX >= 0 ? -1 : 1;
      this.moveTowardVelocityX(moveConfig.chaseSpeed * retreatDir, moveConfig.acceleration * 0.95, deltaMs);
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

  private spriteFramePoint(xRatio: number, yRatio: number): { x: number; y: number } {
    const scale = this.scale;
    const displayWidth = this.frame.width * scale;
    const displayHeight = this.frame.height * scale;
    const left = this.x - displayWidth * this.originX;
    const top = this.y - displayHeight * this.originY;
    const x = left + displayWidth * (this.direction > 0 ? xRatio : 1 - xRatio);
    const y = top + displayHeight * yRatio;
    return { x, y };
  }

  private muzzle(): { x: number; y: number } {
    return this.spriteFramePoint(MECH_MUZZLE_X_RATIO, MECH_MUZZLE_Y_RATIO);
  }

  private fireBurst(projectiles: Phaser.Physics.Arcade.Group, player: Player): void {
    this.clearTint();
    const { x: muzzleX, y: muzzleY } = this.muzzle();
    this.burstCounter += 1;

    const volley = this.droneVolley;
    if (volley && this.burstCounter % volley.everyNthBurst === 0) {
      this.summonDrones(player, muzzleX, muzzleY, volley.count);
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

  private summonDrones(player: Player, muzzleX: number, muzzleY: number, count: number): void {
    this.telegraph(COLORS.purple, 120 * this.sizeScale, 260);
    const payload: BossSummonDronesPayload = {
      originX: muzzleX,
      originY: muzzleY,
      targetX: player.x,
      targetY: this.playerTorsoY(player),
      count,
    };
    this.scene.events.emit(BOSS_SUMMON_DRONES_EVENT, payload);
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

  projectileReturnPoint(): { x: number; y: number } {
    return this.spriteFramePoint(MECH_RETURN_X_RATIO, MECH_RETURN_Y_RATIO);
  }

  private kickbackPulse(): void {
    // Cap at 6 world-px so the large boss (sizeScale 3.2) doesn't visually jerk
    // 16 px per shot; 6 is still perceptible as recoil without looking like drift.
    const amount = Math.min(5 * this.sizeScale, 6);
    this.scene.tweens.add({
      targets: this,
      x: this.x - this.direction * amount,
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

  private syncOverlays(deltaMs: number): void {
    if (this.isBoss) {
      const body = this.arcadeBody();
      body.setAllowGravity(false);
      body.setVelocityY(0);
      body.setVelocityX(Phaser.Math.Clamp(body.velocity.x, -150, 150));
      const floorY = 1080;
      const currentRole = this.currentBossRole();
      const anchorRole = this.stunMs > 0 ? 'idle' : currentRole;
      const bottomPx = MECH_BOTTOM_BY_ROLE[anchorRole];
      const centerPx = MECH_CENTER_BY_ROLE[anchorRole];
      const desiredOriginX = Phaser.Math.Clamp(centerPx / this.frame.width, 0.35, 0.65);
      this.setOrigin(desiredOriginX, this.originY);
      const desiredY = floorY - (bottomPx - this.frame.height * this.originY) * this.scale;
      this.setY(desiredY);
      const cx = body.center.x;
      const cy = body.center.y;
      this.glow.setPosition(cx, cy);
      this.glow.setScale(1, 1);
      if (this.bodyMarker) {
        this.markerPulse += deltaMs;
        this.bodyMarker.setPosition(cx, cy);
        this.bodyMarker.setSize(body.width, body.height);
        this.bodyMarker.setAlpha(0.74 + 0.26 * Math.sin(this.markerPulse / 220));
      }
      return;
    }
    this.glow.setPosition(this.x, this.y + 56 * this.sizeScale);
    this.glow.setScale(this.flipX ? -1 : 1, 1);
  }

  private currentBossRole(): 'idle' | 'move' | 'attack' | 'hurt' | 'death' {
    if (!this.anims?.currentAnim) return 'idle';
    if (this.stunMs > 0 || this.intent === 'stun') return 'idle';
    const key = this.anims.currentAnim.key;
    if (key.endsWith('-attack')) return 'attack';
    if (key.endsWith('-hurt')) return 'hurt';
    if (key.endsWith('-death')) return 'death';
    if (key.endsWith('-move')) return 'move';
    return 'idle';
  }

  private setGlow(color: number, alpha: number): void {
    this.glow.setFillStyle(color, alpha);
  }

  destroy(fromScene?: boolean): void {
    this.clearStunVfx();
    this.glow.destroy();
    this.bodyMarker?.destroy();
    super.destroy(fromScene);
  }
}
