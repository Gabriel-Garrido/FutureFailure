import Phaser from 'phaser';
import { gameText } from '../data/gameText';
import { COLORS, GAME_HEIGHT, GAME_WIDTH } from '../game/constants';

export class GameOverScene extends Phaser.Scene {
  constructor() {
    super('GameOverScene');
  }

  create(): void {
    this.scene.stop('UIScene');
    this.add.rectangle(GAME_WIDTH / 2, GAME_HEIGHT / 2, GAME_WIDTH, GAME_HEIGHT, COLORS.background, 0.88);
    this.add.rectangle(GAME_WIDTH / 2, 280, 560, 190, COLORS.darkSteel, 0.7).setStrokeStyle(2, COLORS.red, 0.65);
    this.add.text(GAME_WIDTH / 2, 218, gameText.gameOver.title, { fontFamily: 'Arial Black, Arial', fontSize: '42px', color: '#ff355f' }).setOrigin(0.5);
    this.add.text(GAME_WIDTH / 2, 278, gameText.gameOver.subtitle, { fontFamily: 'Arial', fontSize: '17px', color: '#d7fbff', align: 'center' }).setOrigin(0.5);
    this.add.text(GAME_WIDTH / 2, 338, gameText.gameOver.action, { fontFamily: 'Arial Black, Arial', fontSize: '18px', color: '#ffffff' }).setOrigin(0.5);
    this.input.keyboard?.once('keydown-X', () => this.restart());
    this.input.gamepad?.once('down', () => this.restart());
    this.input.once('pointerdown', () => this.restart());
  }

  private restart(): void {
    this.scene.stop('UIScene');
    this.scene.start('LevelOneScene');
  }
}
