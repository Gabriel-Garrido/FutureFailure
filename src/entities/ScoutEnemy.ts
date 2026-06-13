import { enemyConfig } from '../data/enemyConfig';
import { enemyMovementConfig } from '../data/enemyMovementConfig';
import { COLORS } from '../game/constants';
import { EnemyBase } from './EnemyBase';
import { type Player } from './Player';

export class ScoutEnemy extends EnemyBase {
  private chargeCooldownMs = Phaser.Math.Between(800, 1600);
  private chargeWindupMs = 0;
  private chargeTimeMs = 0;

  constructor(
    scene: Phaser.Scene,
    x: number,
    y: number,
    texture: string,
    frame: number,
    patrolMin: number,
    patrolMax: number,
  ) {
    super(scene, x, y, texture, frame, enemyConfig.scout.health, patrolMin, patrolMax, 'scout');
    this.knockbackMultiplier = 1.3;
    this.setScale(0.29);
    const body = this.body as Phaser.Physics.Arcade.Body;
    body.setSize(84, 130);
    body.setOffset(63, 55);
    body.setMaxVelocity(450, 680);
  }

  updateEnemy(deltaMs: number, player: Player, projectiles: Phaser.Physics.Arcade.Group): void {
    if (this.isDead()) return;
    const cfg = enemyMovementConfig.scout;

    if (this.tickDamageState(deltaMs)) {
      this.abortCharge();
      return;
    }
    if (this.tickRecover(deltaMs, cfg.deceleration)) {
      this.abortCharge();
      return;
    }

    this.chargeCooldownMs = Math.max(0, this.chargeCooldownMs - deltaMs);

    // ── Active charge rush ────────────────────────────────────────────
    if (this.chargeTimeMs > 0) {
      this.chargeTimeMs -= deltaMs;
      const body = this.body as Phaser.Physics.Arcade.Body;
      body.setVelocityX(enemyConfig.scout.chargeSpeed * this.direction);
      if (Math.abs(player.x - this.x) < enemyConfig.scout.attackRange) {
        this.shootAt(
          projectiles,
          this.x + this.direction * 22,
          this.y - 18,
          player.x,
          player.y - 20,
          340,
          COLORS.amber,
          enemyConfig.scout.damage,
        );
        this.chargeCooldownMs = enemyConfig.scout.chargeCooldownMs;
        this.chargeTimeMs = 0;
        this.recoverMs = Math.max(this.recoverMs, 360);
      } else if (this.chargeTimeMs <= 0) {
        this.chargeCooldownMs = enemyConfig.scout.chargeCooldownMs;
        this.recoverMs = Math.max(this.recoverMs, 320);
      }
      return;
    }

    // ── Charge windup telegraph ───────────────────────────────────────
    if (this.chargeWindupMs > 0) {
      this.setMovementState('attackWindup', 'chargeWindup');
      this.brakeX(cfg.deceleration * 1.6, deltaMs);
      this.chargeWindupMs -= deltaMs;
      if (this.chargeWindupMs <= 0) {
        this.clearTint();
        this.chargeTimeMs = enemyConfig.scout.chargeDurationMs;
      }
      return;
    }

    const dx = player.x - this.x;
    const distX = Math.abs(dx);
    const distY = Math.abs(player.y - this.y);
    const canSee = distX < enemyConfig.scout.detectRange && distY < 110;

    if (!canSee) {
      this.patrolWithEdges(cfg, deltaMs);
      return;
    }

    if (this.shouldLeash(player, cfg.leashDistance)) {
      if (!this.leashToHome(cfg, deltaMs)) this.patrolWithEdges(cfg, deltaMs);
      return;
    }

    this.facePlayer(player);

    // ── Initiate charge when close enough ────────────────────────────
    if (distX < enemyConfig.scout.chargeInitRange && this.chargeCooldownMs <= 0) {
      this.chargeWindupMs = enemyConfig.scout.chargeWindupMs;
      this.setTint(COLORS.amber);
      this.telegraph(COLORS.amber, 40, enemyConfig.scout.chargeWindupMs);
      this.setMovementState('attackWindup', 'charge');
      return;
    }

    // ── Chase toward player ───────────────────────────────────────────
    if (distX > cfg.closeRetreatDistance) {
      this.setMovementState('chase', 'approach');
      this.moveTowardVelocityX(cfg.chaseSpeed * this.direction, cfg.acceleration, deltaMs);
    } else {
      this.setMovementState('idle', 'circling');
      this.brakeX(cfg.deceleration, deltaMs);
    }
  }

  private abortCharge(): void {
    if (this.chargeWindupMs > 0 || this.chargeTimeMs > 0) this.clearTint();
    this.chargeWindupMs = 0;
    this.chargeTimeMs = 0;
  }
}
