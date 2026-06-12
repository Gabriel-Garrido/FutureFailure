import Phaser from 'phaser';
import { BootScene } from '../scenes/BootScene';
import { GameOverScene } from '../scenes/GameOverScene';
import { LevelOneScene } from '../scenes/LevelOneScene';
import { MainMenuScene } from '../scenes/MainMenuScene';
import { PreloadScene } from '../scenes/PreloadScene';
import { UIScene } from '../scenes/UIScene';
import { COLORS, GAME_HEIGHT, GAME_WIDTH } from './constants';

export function createGameConfig(): Phaser.Types.Core.GameConfig {
  return {
    type: Phaser.AUTO,
    parent: 'game',
    width: GAME_WIDTH,
    height: GAME_HEIGHT,
    backgroundColor: COLORS.background,
    pixelArt: true,
    roundPixels: true,
    fps: {
      target: 60,
      forceSetTimeOut: true,
    },
    scale: {
      mode: Phaser.Scale.FIT,
      autoCenter: Phaser.Scale.CENTER_BOTH,
    },
    input: {
      gamepad: true,
    },
    physics: {
      default: 'arcade',
      arcade: {
        gravity: { x: 0, y: 2000 },
        debug: false,
      },
    },
    scene: [BootScene, PreloadScene, MainMenuScene, LevelOneScene, UIScene, GameOverScene],
  };
}
