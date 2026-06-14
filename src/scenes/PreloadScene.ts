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
    // Brand logo lives outside the asset pipeline (public/brand) so the
    // prepare-assets step never rewrites or strips it.
    this.load.image('logo', '/brand/logo.png');
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
    this.startWhenFontsReady();
  }

  /**
   * The menu renders Orbitron/Rajdhani into the canvas. Wait until those web
   * fonts are ready so the first paint uses them, with a hard timeout fallback
   * so a slow/offline font CDN never blocks the game from starting.
   */
  private startWhenFontsReady(): void {
    let started = false;
    const go = (): void => {
      if (started) return;
      started = true;
      this.scene.start('MainMenuScene');
    };

    const fontset = document.fonts;
    if (!fontset || typeof fontset.load !== 'function') {
      go();
      return;
    }

    const requests = ["700 46px 'Rajdhani'", "600 18px 'Rajdhani'", "800 20px 'Orbitron'", "700 15px 'Orbitron'"];
    Promise.all(requests.map((font) => fontset.load(font)))
      .then(() => fontset.ready)
      .catch(() => undefined)
      .then(go);
    this.time.delayedCall(1600, go);
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
