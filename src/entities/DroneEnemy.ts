import { enemyConfig } from '../data/enemyConfig';
import { enemyMovementConfig } from '../data/enemyMovementConfig';
import { type EnemySpriteProfile } from '../data/enemySpriteConfig';
import { COLORS } from '../game/constants';
import { EnemyBase } from './EnemyBase';
import { type Player } from './Player';

export class DroneEnemy extends EnemyBase {
  private shootCooldownMs = Phaser.Math.Between(700, 1300);
  private windupMs = 0;
  private ageMs = 0;
  private orbitSide: 1 | -1 = Phaser.Math.Between(0, 1) === 0 ? -1 : 1;
  private damagedPauseMs = 0;

  constructor(scene: Phaser.Scene, x: number, y: number, profile: EnemySpriteProfile, patrolMin: number, patrolMax: number) {
    super(scene, x, y, profile, enemyConfig.drone.health, patrolMin, patrolMax, 'drone');
    this.knockbackMultiplier = 1.15;
    const body = this.body as Phaser.Physics.Arcade.Body;
    body.setAllowGravity(false);
  }

  updateEnemy(deltaMs: number, player: Player, projectiles: Phaser.Physics.Arcade.Group): void {
    if (this.isDead()) return;
    const moveConfig = enemyMovementConfig.drone;
    if (this.tickDamageState(deltaMs)) {
      this.windupMs = 0;
      this.damagedPauseMs = Math.max(this.damagedPauseMs, 140);
      this.holdAltitude(deltaMs);
      return;
    }
    if (this.tickRecover(deltaMs, moveConfig.deceleration)) {
      this.windupMs = 0;
      return;
    }

    this.ageMs += deltaMs;
    this.damagedPauseMs = Math.max(0, this.damagedPauseMs - deltaMs);
    const distance = Phaser.Math.Distance.Between(this.x, this.y, player.x, player.y);
    const canSee = distance < enemyConfig.drone.detectRange && Math.abs(player.x - this.homeX) < moveConfig.leashDistance;
    this.shootCooldownMs = Math.max(0, this.shootCooldownMs - deltaMs);

    if (this.windupMs > 0) {
      this.setMovementState('attackWindup', 'shoot');
      this.facePlayer(player);
      this.holdAltitude(deltaMs);
      this.windupMs -= deltaMs;
      if (this.windupMs <= 0) {
        if (this.hitFlashMs <= 0) this.clearTint();
        const aimDir = player.x >= this.x ? 1 : -1;
        this.shootAt(projectiles, this.x + aimDir * 24, this.y, player.x, this.playerTorsoY(player), 240, COLORS.red, enemyConfig.drone.damage);
        this.shootCooldownMs = enemyConfig.drone.shootCooldownMs;
      }
      return;
    }

    if (canSee) {
      this.facePlayer(player);
      if (this.damagedPauseMs > 0) {
        this.holdAltitude(deltaMs);
        return;
      }
      this.steerAroundPlayer(player, deltaMs);
      if (distance < moveConfig.attackStopDistance && this.shootCooldownMs <= 0) {
        this.windupMs = 190;
        this.setMovementState('attackWindup', 'shoot');
        this.setTint(COLORS.red);
        this.telegraph(COLORS.red, 38, this.windupMs);
      }
      return;
    }

    if (this.shouldLeash(player, moveConfig.leashDistance) || Math.abs(this.x - this.homeX) > moveConfig.leashDistance * 0.7) {
      this.steerTo(this.homeX, this.homeY, 'leash', deltaMs);
      return;
    }

    this.patrolDrone(deltaMs);
  }

  private steerAroundPlayer(player: Player, deltaMs: number): void {
    const moveConfig = enemyMovementConfig.drone;
    let desiredX = player.x + this.orbitSide * moveConfig.idealDistanceX;
    if (desiredX < this.patrolMin + 40 || desiredX > this.patrolMax - 40) {
      this.orbitSide = -this.orbitSide as 1 | -1;
      desiredX = player.x + this.orbitSide * moveConfig.idealDistanceX;
    }
    desiredX = Phaser.Math.Clamp(desiredX, this.patrolMin + 32, this.patrolMax - 32);
    const desiredY = player.y + moveConfig.idealDistanceY + Math.sin(this.ageMs / moveConfig.verticalBobMs) * moveConfig.verticalBob;
    this.steerTo(desiredX, desiredY, 'chase', deltaMs);
  }

  private steerTo(targetX: number, targetY: number, state: 'patrol' | 'chase' | 'leash', deltaMs: number): void {
    const moveConfig = enemyMovementConfig.drone;
    const targetVelocityX = Phaser.Math.Clamp((targetX - this.x) * 1.35, -moveConfig.maxSpeed, moveConfig.maxSpeed);
    const targetVelocityY = Phaser.Math.Clamp((targetY - this.y) * 1.1, -moveConfig.maxSpeed * 0.8, moveConfig.maxSpeed * 0.8);
    this.setMovementState(state, state);
    this.moveTowardVelocity(targetVelocityX, targetVelocityY, moveConfig.acceleration, deltaMs, moveConfig.maxSpeed);
  }

  private patrolDrone(deltaMs: number): void {
    const moveConfig = enemyMovementConfig.drone;
    if (this.x <= this.patrolMin + 10) this.direction = 1;
    if (this.x >= this.patrolMax - 10) this.direction = -1;
    const desiredY = this.homeY + Math.sin(this.ageMs / moveConfig.verticalBobMs) * moveConfig.verticalBob;
    this.setFlipX(this.direction < 0);
    this.setMovementState('patrol', 'patrol');
    this.moveTowardVelocity(
      moveConfig.patrolSpeed * this.direction,
      Phaser.Math.Clamp((desiredY - this.y) * 1.2, -moveConfig.maxSpeed * 0.5, moveConfig.maxSpeed * 0.5),
      moveConfig.acceleration,
      deltaMs,
      moveConfig.maxSpeed,
    );
  }

  private holdAltitude(deltaMs: number): void {
    const moveConfig = enemyMovementConfig.drone;
    const desiredY = this.y + Math.sin(this.ageMs / moveConfig.verticalBobMs) * 8;
    this.moveTowardVelocity(0, Phaser.Math.Clamp((desiredY - this.y) * 0.8, -24, 24), moveConfig.deceleration, deltaMs, moveConfig.maxSpeed * 0.55);
  }
}
