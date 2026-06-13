import { COLORS, DEPTHS } from '../game/constants';

export class Projectile extends Phaser.Physics.Arcade.Sprite {
  private static nextHitId = 1;

  damage = 1;
  fromPlayer = false;
  hitId = 'projectile-0';
  private impactConsumed = false;
  private lifespanMs = 2400;

  constructor(scene: Phaser.Scene, x: number, y: number) {
    super(scene, x, y, 'projectile');
    scene.add.existing(this);
    scene.physics.add.existing(this);
    this.setDepth(DEPTHS.effects);
    this.setTint(COLORS.cyan);
    this.setCircle(5);
    this.setActive(false);
    this.setVisible(false);
  }

  fire(x: number, y: number, velocityX: number, velocityY: number, fromPlayer: boolean, tint = COLORS.cyan, damage = 1): void {
    this.fromPlayer = fromPlayer;
    this.damage = damage;
    this.hitId = `${fromPlayer ? 'player' : 'enemy'}-projectile-${Projectile.nextHitId}`;
    Projectile.nextHitId += 1;
    this.impactConsumed = false;
    this.lifespanMs = 2400;
    this.setPosition(x, y);
    this.setTint(tint);
    this.setAlpha(fromPlayer ? 0.92 : 1);
    this.setScale(fromPlayer ? 0.92 : 1.16);
    this.setActive(true);
    this.setVisible(true);
    const body = this.body as Phaser.Physics.Arcade.Body;
    body.setAllowGravity(false);
    body.enable = true;
    const radius = fromPlayer ? 6 : 10;
    body.setCircle(radius, 8 - radius, 8 - radius);
    body.setVelocity(velocityX, velocityY);
  }

  consumeImpact(): boolean {
    if (this.impactConsumed) return false;
    this.impactConsumed = true;
    return true;
  }

  preUpdate(time: number, delta: number): void {
    super.preUpdate(time, delta);
    if (!this.active) return;
    this.lifespanMs -= delta;
    if (this.lifespanMs <= 0) this.kill();
  }

  kill(): void {
    this.impactConsumed = true;
    this.setActive(false);
    this.setVisible(false);
    this.setScale(1);
    const body = this.body as Phaser.Physics.Arcade.Body;
    body.enable = false;
    body.setVelocity(0, 0);
  }
}
