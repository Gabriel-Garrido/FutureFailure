import { enemyConfig } from '../data/enemyConfig';
import { enemyMovementConfig } from '../data/enemyMovementConfig';
import { type EnemySpriteProfile } from '../data/enemySpriteConfig';
import { COLORS, DEPTHS } from '../game/constants';
import { type Player } from './Player';
import { EnemyBase } from './EnemyBase';

export class TrooperEnemy extends EnemyBase {
  private shootCooldownMs = Phaser.Math.Between(300, 900);
  private windupMs = 0;

  constructor(scene: Phaser.Scene, x: number, y: number, profile: EnemySpriteProfile, patrolMin: number, patrolMax: number) {
    super(scene, x, y, profile, enemyConfig.trooper.health, patrolMin, patrolMax, 'trooper');
  }

  updateEnemy(deltaMs: number, player: Player, projectiles: Phaser.Physics.Arcade.Group): void {
    if (this.isDead()) return;
    const moveConfig = enemyMovementConfig.trooper;
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
    const canSee = distance < enemyConfig.trooper.detectRange && distanceY < 105;

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
    this.shootCooldownMs = Math.max(0, this.shootCooldownMs - deltaMs);

    if (this.windupMs > 0) {
      this.setMovementState('attackWindup', 'shoot');
      this.facePlayer(player);
      this.brakeX(moveConfig.deceleration, deltaMs);
      this.windupMs -= deltaMs;
      if (this.windupMs <= 0) {
        this.clearTint();
        this.shootAt(projectiles, this.x + this.direction * 43, this.y - 27, player.x, this.playerTorsoY(player), 310, COLORS.red, enemyConfig.trooper.damage);
        this.shootCooldownMs = enemyConfig.trooper.shootCooldownMs;
      }
      return;
    }

    if (distance < moveConfig.closeRetreatDistance) {
      const retreatDir: 1 | -1 = distanceX >= 0 ? -1 : 1;
      const blockedByPatrol = (retreatDir < 0 && this.x <= this.patrolMin + 22) || (retreatDir > 0 && this.x >= this.patrolMax - 22);
      this.setMovementState('chase', 'retreat');
      this.direction = retreatDir;
      this.setFlipX(this.direction < 0);
      if (blockedByPatrol || !this.hasGroundAhead(retreatDir, moveConfig.edgeProbeX, moveConfig.edgeProbeY)) this.brakeX(moveConfig.deceleration, deltaMs);
      else this.moveTowardVelocityX(moveConfig.chaseSpeed * retreatDir, moveConfig.acceleration, deltaMs);
      return;
    }

    if (distance > moveConfig.attackStopDistance) {
      this.setMovementState('chase', 'approach');
      this.moveTowardVelocityX(moveConfig.chaseSpeed * this.direction, moveConfig.acceleration, deltaMs);
      return;
    }

    this.setMovementState('idle', 'aim');
    this.brakeX(moveConfig.deceleration, deltaMs);
    if (this.shootCooldownMs <= 0) {
      this.windupMs = enemyConfig.trooper.windupMs;
      this.setMovementState('attackWindup', 'shoot');
      this.setTint(COLORS.amber);
      this.telegraph(COLORS.amber, 42, enemyConfig.trooper.windupMs);
      this.createAimLine(player);
    }
  }

  private createAimLine(player: Player): void {
    const line = this.scene.add.line(0, 0, this.x + this.direction * 43, this.y - 27, player.x, this.playerTorsoY(player), COLORS.amber, 0.28)
      .setOrigin(0, 0)
      .setDepth(DEPTHS.effects);
    this.scene.tweens.add({
      targets: line,
      alpha: 0,
      duration: enemyConfig.trooper.windupMs,
      ease: 'Cubic.easeOut',
      onComplete: () => line.destroy(),
    });
  }
}
