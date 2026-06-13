import Phaser from 'phaser';
import { assetManifest } from '../assets/assetManifest';
import { spriteAnimationDefinitions } from '../data/spriteAnimationConfig';
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
      if (asset.loadType === 'image') {
        this.load.image(asset.key, asset.path);
      } else {
        this.load.spritesheet(asset.key, asset.path, {
          frameWidth: asset.frameWidth,
          frameHeight: asset.frameHeight,
        });
      }
    }
  }

  create(): void {
    this.createSpriteAnimations();
    this.scene.start('MainMenuScene');
  }

  private createSpriteAnimations(): void {
    for (const animation of spriteAnimationDefinitions()) {
      if (!this.textures.exists(animation.textureKey)) continue;
      if (this.anims.exists(animation.key)) continue;
      this.anims.create({
        key: animation.key,
        frames: animation.frames.map((frame) => ({ key: animation.textureKey, frame })),
        frameRate: animation.frameRate,
        repeat: animation.repeat,
      });
    }
  }
}
