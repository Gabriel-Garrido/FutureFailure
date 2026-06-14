import { enemyConfig } from '../data/enemyConfig';
import { enemyMovementConfig } from '../data/enemyMovementConfig';
import { type EnemySpriteProfile } from '../data/enemySpriteConfig';
import { COLORS, DEPTHS } from '../game/constants';
import { EnemyBase } from './EnemyBase';
import { type Player } from './Player';

type MechIntent = 'patrol' | 'holdRange' | 'retreat' | 'windup' | 'recover';

export class MechEnemy extends EnemyBase {
  private shootCooldownMs = 900;
  private windupMs = 0;
  private recoverAfterBurstMs = 0;
  private intent: MechIntent = 'patrol';
  private readonly glow: Phaser.GameObjects.Ellipse;

  constructor(scene: Phaser.Scene, x: number, y: number, profile: EnemySpriteProfile, patrolMin: number, patrolMax: number) {
    super(scene, x, y, profile, enemyConfig.mech.health, patrolMin, patrolMax, 'mech');
    this.knockbackMultiplier = 0.34;

    const body = this.body as Phaser.Physics.Arcade.Body;
    body.setMaxVelocity(150, 680);

    this.glow = scene.add.ellipse(this.x, this.y + 46, 128, 30, COLORS.red, 0.08)
      .setDepth(DEPTHS.enemies - 1)
      .setBlendMode(Phaser.BlendModes.ADD);
  }

  updateEnemy(deltaMs: number, player: Player, projectiles: Phaser.Physics.Arcade.Group): void {
    if (this.isDead()) {
      this.glow.setVisible(false);
      return;
    }

    this.syncGlow();
    const moveConfig = enemyMovementConfig.mech;
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
    const canSee = distance < enemyConfig.mech.detectRange && Math.abs(distanceY) < 170;
    this.shootCooldownMs = Math.max(0, this.shootCooldownMs - deltaMs);
    this.recoverAfterBurstMs = Math.max(0, this.recoverAfterBurstMs - deltaMs);

    if (!canSee) {
      this.intent = 'patrol';
      this.cancelAttack();
      this.setGlow(COLORS.red, 0.06);
      this.patrolWithEdges(moveConfig, deltaMs);
      return;
    }

    if (this.shouldLeash(player, moveConfig.leashDistance)) {
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

    if (distance < moveConfig.closeRetreatDistance) {
      this.intent = 'retreat';
      this.setMovementState('chase', 'mech-retreat');
      this.direction = distanceX >= 0 ? -1 : 1;
      this.setFlipX(this.direction < 0);
      this.moveTowardVelocityX(moveConfig.chaseSpeed * this.direction, moveConfig.acceleration * 0.95, deltaMs);
      this.setGlow(COLORS.amber, 0.13);
      return;
    }

    if (distance > moveConfig.attackStopDistance + 64) {
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
      this.windupMs = enemyConfig.mech.windupMs;
      this.setTint(COLORS.amber);
      this.telegraph(COLORS.amber, 86, enemyConfig.mech.windupMs);
      this.createAimLine(player);
    }
  }

  private fireBurst(projectiles: Phaser.Physics.Arcade.Group, player: Player): void {
    this.clearTint();
    const muzzleX = this.x + this.direction * 70;
    const muzzleY = this.y - 46;
    for (let i = 0; i < enemyConfig.mech.burstCount; i += 1) {
      this.scene.time.delayedCall(i * 155, () => {
        if (this.isDead()) return;
        const targetX = player.x + (i - 1) * 22;
        const targetY = this.playerTorsoY(player) + (i - 1) * 8;
        this.shootAt(projectiles, muzzleX, muzzleY, targetX, targetY, 285, COLORS.red, enemyConfig.mech.damage);
        this.kickbackPulse();
      });
    }
    this.shootCooldownMs = enemyConfig.mech.shootCooldownMs;
    this.recoverAfterBurstMs = 520;
  }

  private createAimLine(player: Player): void {
    const line = this.scene.add.line(0, 0, this.x, this.y - 46, player.x, this.playerTorsoY(player), COLORS.amber, 0.35)
      .setOrigin(0, 0)
      .setDepth(DEPTHS.effects);
    this.scene.tweens.add({
      targets: line,
      alpha: 0,
      duration: enemyConfig.mech.windupMs,
      ease: 'Cubic.easeOut',
      onComplete: () => line.destroy(),
    });
  }

  private kickbackPulse(): void {
    this.scene.tweens.add({
      targets: this,
      x: this.x - this.direction * 5,
      duration: 45,
      yoyo: true,
      ease: 'Cubic.easeOut',
    });
  }

  private cancelAttack(): void {
    this.windupMs = 0;
    if (this.intent === 'windup') this.clearTint();
  }

  private syncGlow(): void {
    this.glow.setPosition(this.x, this.y + 56);
    this.glow.setScale(this.flipX ? -1 : 1, 1);
  }

  private setGlow(color: number, alpha: number): void {
    this.glow.setFillStyle(color, alpha);
  }

  destroy(fromScene?: boolean): void {
    this.glow.destroy();
    super.destroy(fromScene);
  }
}
