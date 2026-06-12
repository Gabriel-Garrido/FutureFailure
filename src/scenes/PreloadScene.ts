import Phaser from 'phaser';
import { assetManifest } from '../assets/assetManifest';
import { COLORS, GAME_HEIGHT, GAME_WIDTH } from '../game/constants';

export class PreloadScene extends Phaser.Scene {
  constructor() {
    super('PreloadScene');
  }

  preload(): void {
    const bar = this.add.rectangle(GAME_WIDTH / 2, GAME_HEIGHT / 2, 1, 8, COLORS.cyan, 1);
    this.load.on('progress', (progress: number) => {
      bar.width = 420 * progress;
    });
    for (const asset of assetManifest) {
      this.load.spritesheet(asset.key, asset.path, {
        frameWidth: asset.frameWidth,
        frameHeight: asset.frameHeight,
      });
    }
  }

  create(): void {
    this.createPlayerAnimations();
    this.scene.start('MainMenuScene');
  }

  private createPlayerAnimations(): void {
    if (!this.textures.exists('player')) return;
    const animations = [
      { key: 'player-idle', frames: [0, 1, 2, 3, 4], frameRate: 8, repeat: -1 },
      { key: 'player-run', frames: [5, 6, 7, 8, 9], frameRate: 13, repeat: -1 },
      { key: 'player-jump', frames: [10, 11, 12], frameRate: 10, repeat: -1 },
      { key: 'player-fall', frames: [12, 13, 14], frameRate: 10, repeat: -1 },
      { key: 'player-attack', frames: [15, 16, 17, 18, 19], frameRate: 18, repeat: 0 },
      { key: 'player-dash', frames: [15, 16, 17, 18, 19], frameRate: 20, repeat: -1 },
    ];
    for (const animation of animations) {
      if (this.anims.exists(animation.key)) continue;
      this.anims.create({
        key: animation.key,
        frames: animation.frames.map((frame) => ({ key: 'player', frame })),
        frameRate: animation.frameRate,
        repeat: animation.repeat,
      });
    }
  }
}
