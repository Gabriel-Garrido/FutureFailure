import { enemyConfig } from '../data/enemyConfig';
import { enemyMovementConfig } from '../data/enemyMovementConfig';
import { COLORS } from '../game/constants';
import { EnemyBase } from './EnemyBase';
import { type Player } from './Player';

export class MechEnemy extends EnemyBase {
  private shootCooldownMs = 900;
  private windupMs = 0;

  constructor(scene: Phaser.Scene, x: number, y: number, texture: string, frame: number, patrolMin: number, patrolMax: number) {
    super(scene, x, y, texture, frame, enemyConfig.mech.health, patrolMin, patrolMax);
    this.knockbackMultiplier = 0.48;
    this.setScale(0.42);
    const body = this.body as Phaser.Physics.Arcade.Body;
    body.setSize(118, 165);
    body.setOffset(46, 34);
  }

  updateEnemy(deltaMs: number, player: Player, projectiles: Phaser.Physics.Arcade.Group): void {
    if (this.isDead()) return;
    const moveConfig = enemyMovementConfig.mech;
    if (this.tickDamageState(deltaMs)) {
      this.windupMs = 0;
      return;
    }
    if (this.tickRecover(deltaMs, moveConfig.deceleration)) {
      this.windupMs = 0;
      return;
    }

    const distanceX = player.x - this.x;
    const distanceY = Math.abs(player.y - this.y);
    const distance = Math.abs(distanceX);
    const canSee = distance < enemyConfig.mech.detectRange && distanceY < 130;
    this.shootCooldownMs = Math.max(0, this.shootCooldownMs - deltaMs);

    if (!canSee) {
      this.windupMs = 0;
      this.patrolWithEdges(moveConfig, deltaMs);
      return;
    }

    if (this.shouldLeash(player, moveConfig.leashDistance)) {
      this.windupMs = 0;
      if (!this.leashToHome(moveConfig, deltaMs)) this.patrolWithEdges(moveConfig, deltaMs);
      return;
    }

    this.facePlayer(player);

    if (this.windupMs > 0) {
      this.setMovementState('attackWindup', 'burst');
      this.brakeX(moveConfig.deceleration, deltaMs);
      this.windupMs -= deltaMs;
      if (this.windupMs <= 0) {
        this.clearTint();
        for (let i = 0; i < enemyConfig.mech.burstCount; i += 1) {
          this.scene.time.delayedCall(i * 140, () => {
            if (!this.isDead()) this.shoot(projectiles, this.x + this.direction * 44, this.y - 24, 270, COLORS.red, enemyConfig.mech.damage);
          });
        }
        this.shootCooldownMs = enemyConfig.mech.shootCooldownMs;
      }
      return;
    }

    if (distance > moveConfig.attackStopDistance) {
      this.setMovementState('chase', 'approach');
      this.moveTowardVelocityX(moveConfig.chaseSpeed * this.direction, moveConfig.acceleration, deltaMs);
      return;
    }

    this.brakeX(moveConfig.deceleration, deltaMs);
    if (this.shootCooldownMs <= 0) {
      this.windupMs = enemyConfig.mech.windupMs;
      this.setMovementState('attackWindup', 'burst');
      this.setTint(COLORS.amber);
      this.telegraph(COLORS.amber, 70, enemyConfig.mech.windupMs);
    }
  }
}
