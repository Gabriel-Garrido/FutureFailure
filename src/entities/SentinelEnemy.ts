import { enemyConfig } from '../data/enemyConfig';
import { COLORS } from '../game/constants';
import { EnemyBase } from './EnemyBase';
import { type Player } from './Player';

export class SentinelEnemy extends EnemyBase {
  private shootCooldownMs = Phaser.Math.Between(600, 1800);
  private windupMs = 0;
  private ageMs = 0;

  constructor(
    scene: Phaser.Scene,
    x: number,
    y: number,
    texture: string,
    frame: number,
    patrolMin: number,
    patrolMax: number,
  ) {
    super(scene, x, y, texture, frame, enemyConfig.sentinel.health, patrolMin, patrolMax, 'sentinel');
    this.knockbackMultiplier = 0.28;
    this.setScale(0.36);
    const body = this.body as Phaser.Physics.Arcade.Body;
    body.setAllowGravity(false);
    body.setSize(118, 96);
    body.setOffset(46, 58);
    body.setMaxVelocity(180, 180);
  }

  updateEnemy(deltaMs: number, player: Player, projectiles: Phaser.Physics.Arcade.Group): void {
    if (this.isDead()) return;
    const cfg = enemyConfig.sentinel;
    this.ageMs += deltaMs;
    this.shootCooldownMs = Math.max(0, this.shootCooldownMs - deltaMs);

    if (this.tickDamageState(deltaMs)) {
      this.windupMs = 0;
      this.anchorToHome(deltaMs);
      return;
    }
    if (this.tickRecover(deltaMs, 1400)) {
      this.windupMs = 0;
      this.anchorToHome(deltaMs);
      return;
    }

    this.anchorToHome(deltaMs);

    const dist = Phaser.Math.Distance.Between(this.x, this.y, player.x, player.y);

    // ── Shoot windup ─────────────────────────────────────────────────
    if (this.windupMs > 0) {
      this.facePlayer(player);
      this.windupMs -= deltaMs;
      if (this.windupMs <= 0) {
        this.clearTint();
        this.fireSpread(projectiles, player);
        this.shootCooldownMs = cfg.shootCooldownMs;
      }
      return;
    }

    if (dist >= cfg.detectRange) {
      this.setMovementState('idle', 'wait');
      return;
    }

    this.facePlayer(player);

    if (this.shootCooldownMs <= 0) {
      this.windupMs = cfg.windupMs;
      this.setMovementState('attackWindup', 'aim');
      this.setTint(COLORS.red);
      this.telegraph(COLORS.red, 54, cfg.windupMs);
    } else {
      this.setMovementState('patrol', 'track');
    }
  }

  private anchorToHome(deltaMs: number): void {
    const cfg = enemyConfig.sentinel;
    const targetY = this.homeY + Math.sin(this.ageMs / cfg.bobMs) * cfg.bobAmplitude;
    this.moveTowardVelocity(
      Phaser.Math.Clamp((this.homeX - this.x) * 2.2, -60, 60),
      Phaser.Math.Clamp((targetY - this.y) * 2.5, -38, 38),
      1350,
      deltaMs,
      44,
    );
  }

  private fireSpread(projectiles: Phaser.Physics.Arcade.Group, player: Player): void {
    const cfg = enemyConfig.sentinel;
    const muzzleX = this.x + this.direction * 28;
    const muzzleY = this.y;
    const aimAngle = Phaser.Math.Angle.Between(muzzleX, muzzleY, player.x, player.y - 18);
    const spread = Phaser.Math.DegToRad(cfg.spreadAngleDeg);
    const speed = 215;
    for (const angle of [aimAngle - spread, aimAngle, aimAngle + spread]) {
      const proj = projectiles.get(muzzleX, muzzleY) as import('./Projectile').Projectile | null;
      if (!proj) continue;
      proj.fire(muzzleX, muzzleY, Math.cos(angle) * speed, Math.sin(angle) * speed, false, COLORS.red, cfg.damage);
      this.scene.events.emit('enemy-shoot');
    }
  }
}
