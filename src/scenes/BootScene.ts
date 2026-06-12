import Phaser from 'phaser';
import { COLORS } from '../game/constants';

export class BootScene extends Phaser.Scene {
  constructor() {
    super('BootScene');
  }

  create(): void {
    this.createFallbackTextures();
    this.scene.start('PreloadScene');
  }

  private createFallbackTextures(): void {
    const graphics = this.add.graphics();
    graphics.fillStyle(COLORS.cyan, 1).fillRect(0, 0, 12, 12);
    graphics.generateTexture('particle-dot', 12, 12);
    graphics.clear();

    graphics.fillStyle(COLORS.cyan, 1).fillCircle(8, 8, 8);
    graphics.generateTexture('projectile', 16, 16);
    graphics.clear();

    graphics.fillStyle(COLORS.cyanDark, 1).fillRect(0, 0, 72, 120).fillStyle(COLORS.cyan, 1).fillRect(22, 10, 28, 30);
    graphics.generateTexture('fallback-player', 72, 120);
    graphics.clear();

    graphics.fillStyle(COLORS.red, 1).fillRect(0, 0, 80, 80);
    graphics.generateTexture('fallback-trooper', 80, 80);
    graphics.clear();

    graphics.fillStyle(COLORS.amber, 1).fillTriangle(45, 0, 90, 70, 0, 70);
    graphics.generateTexture('fallback-drone', 90, 70);
    graphics.clear();

    graphics.fillStyle(COLORS.red, 1).fillRect(0, 0, 120, 110).fillStyle(COLORS.steel, 1).fillRect(12, 12, 96, 70);
    graphics.generateTexture('fallback-mech', 120, 110);
    graphics.clear();

    graphics.fillStyle(COLORS.green, 1).fillCircle(32, 32, 28);
    graphics.generateTexture('fallback-pickup', 64, 64);
    graphics.clear();

    graphics.fillStyle(COLORS.steel, 1).fillRect(0, 0, 48, 48);
    graphics.generateTexture('fallback-crate', 48, 48);
    graphics.destroy();
  }
}
