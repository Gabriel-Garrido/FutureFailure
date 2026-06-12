import { COLORS, DEPTHS } from '../game/constants';

export class ParticleSystem {
  constructor(private readonly scene: Phaser.Scene) {}

  dash(x: number, y: number, dir: 1 | -1): void {
    this.burst(x - dir * 20, y + 12, COLORS.cyan, 7, { speed: 145, lifespan: 165, gravityY: 0 });
  }

  jump(x: number, y: number): void {
    this.burst(x, y + 34, COLORS.cyan, 6, { speed: 58, lifespan: 150, gravityY: 160 });
  }

  land(x: number, y: number): void {
    this.burst(x, y + 34, 0x95a3b8, 10, { speed: 72, lifespan: 235, gravityY: 300 });
  }

  hit(x: number, y: number, color = COLORS.cyan): void {
    this.burst(x, y, color, 14, { speed: 150, lifespan: 240, gravityY: 80 });
  }

  enemyHit(x: number, y: number, direction: 1 | -1): void {
    this.burst(x - direction * 10, y - 10, COLORS.cyan, 10, { speed: 165, lifespan: 210, gravityY: 40 });
    this.burst(x - direction * 18, y - 8, COLORS.amber, 5, { speed: 115, lifespan: 160, gravityY: 30 });
    this.impactSlash(x - direction * 14, y - 8, direction);
  }

  hurt(x: number, y: number): void {
    this.burst(x, y, COLORS.red, 18, { speed: 175, lifespan: 260, gravityY: 120 });
  }

  pickup(x: number, y: number): void {
    this.burst(x, y, COLORS.green, 16, { speed: 120, lifespan: 320, gravityY: -60 });
  }

  explosion(x: number, y: number): void {
    this.burst(x, y, COLORS.red, 24, { speed: 190, lifespan: 380, gravityY: 180 });
  }

  enemyDefeat(x: number, y: number): void {
    this.burst(x, y - 10, COLORS.red, 28, { speed: 230, lifespan: 420, gravityY: 160 });
    this.burst(x, y - 14, COLORS.cyan, 16, { speed: 170, lifespan: 320, gravityY: 80 });
    this.shockwave(x, y - 8, COLORS.amber, 62, 260);
  }

  playerDamage(x: number, y: number): void {
    this.burst(x, y - 26, COLORS.red, 18, { speed: 175, lifespan: 260, gravityY: 120 });
    this.shockwave(x, y - 24, COLORS.red, 44, 180);
  }

  playerEnergyDamage(x: number, y: number, direction: 1 | -1): void {
    this.burst(x - direction * 12, y - 24, COLORS.cyan, 14, { speed: 155, lifespan: 230, gravityY: 40 });
    this.burst(x - direction * 18, y - 20, COLORS.red, 8, { speed: 125, lifespan: 190, gravityY: 50 });
    this.shockwave(x - direction * 8, y - 24, COLORS.cyan, 38, 150);
  }

  private burst(x: number, y: number, color: number, quantity: number, config: { speed: number; lifespan: number; gravityY: number }): void {
    const manager = this.scene.add.particles(x, y, 'particle-dot', {
      speed: { min: config.speed * 0.25, max: config.speed },
      angle: { min: 0, max: 360 },
      quantity,
      lifespan: config.lifespan,
      scale: { start: 1, end: 0 },
      tint: color,
      gravityY: config.gravityY,
      blendMode: Phaser.BlendModes.ADD,
      emitting: false,
    });
    manager.setDepth(DEPTHS.effects);
    manager.explode(quantity);
    this.scene.time.delayedCall(config.lifespan + 100, () => manager.destroy());
  }

  private impactSlash(x: number, y: number, direction: 1 | -1): void {
    const slash = this.scene.add.rectangle(x, y, 42, 5, COLORS.amber, 0.78)
      .setRotation(direction * -0.35)
      .setDepth(DEPTHS.effects);
    this.scene.tweens.add({
      targets: slash,
      alpha: 0,
      scaleX: 1.45,
      duration: 105,
      ease: 'Cubic.easeOut',
      onComplete: () => slash.destroy(),
    });
  }

  private shockwave(x: number, y: number, color: number, size: number, duration: number): void {
    const ring = this.scene.add.ellipse(x, y, size, size * 0.55)
      .setStrokeStyle(2, color, 0.85)
      .setDepth(DEPTHS.effects);
    this.scene.tweens.add({
      targets: ring,
      alpha: 0,
      scaleX: 1.7,
      scaleY: 1.7,
      duration,
      ease: 'Cubic.easeOut',
      onComplete: () => ring.destroy(),
    });
  }
}
