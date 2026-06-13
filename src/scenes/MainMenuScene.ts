import Phaser from 'phaser';
import { assetKey } from '../data/assetMap';
import { elementSprites } from '../data/elementSpriteConfig';
import { gameText } from '../data/gameText';
import { COLORS, GAME_HEIGHT, GAME_WIDTH } from '../game/constants';
import { SaveSystem } from '../systems/SaveSystem';

export class MainMenuScene extends Phaser.Scene {
  constructor() {
    super('MainMenuScene');
  }

  create(): void {
    this.createBackground();
    this.createPortalAccent();
    this.createContent();
    this.input.keyboard?.once('keydown-X', () => this.startGame());
    this.input.keyboard?.on('keydown-R', () => {
      new SaveSystem().clear();
      this.scene.restart();
    });
    this.input.gamepad?.once('down', () => this.startGame());
  }

  private startGame(): void {
    this.scene.start('LevelOneScene');
  }

  private createBackground(): void {
    this.add.rectangle(GAME_WIDTH / 2, GAME_HEIGHT / 2, GAME_WIDTH, GAME_HEIGHT, COLORS.background, 1);
    const graphics = this.add.graphics();
    graphics.lineStyle(1, COLORS.cyanDark, 0.08);
    for (let x = 80; x < GAME_WIDTH; x += 80) graphics.lineBetween(x, 0, x, GAME_HEIGHT);
    for (let y = 60; y < GAME_HEIGHT; y += 60) graphics.lineBetween(0, y, GAME_WIDTH, y);
    graphics.lineStyle(2, COLORS.cyanDark, 0.18);
    graphics.lineBetween(76, 418, GAME_WIDTH - 76, 418);
    graphics.lineBetween(150, 82, GAME_WIDTH - 150, 82);
    graphics.fillStyle(COLORS.cyanDark, 0.08);
    graphics.fillRect(0, 0, GAME_WIDTH, 42);
    graphics.fillRect(0, GAME_HEIGHT - 52, GAME_WIDTH, 52);
  }

  private createPortalAccent(): void {
    const key = assetKey('doors', '');
    this.add.circle(GAME_WIDTH / 2, 154, 96, COLORS.purple, 0.06);
    this.add.circle(GAME_WIDTH / 2, 154, 58, COLORS.cyan, 0.05);
    if (!key || !this.textures.exists(key)) return;
    const portal = this.add.sprite(GAME_WIDTH / 2, 148, key, elementSprites.doors.portal.frame);
    portal.setScale(0.76).setAlpha(0.32);
    this.tweens.add({
      targets: portal,
      alpha: 0.46,
      scaleX: 0.8,
      scaleY: 0.8,
      duration: 1300,
      yoyo: true,
      repeat: -1,
      ease: 'Sine.easeInOut',
    });
  }

  private createContent(): void {
    this.add.rectangle(GAME_WIDTH / 2, 304, 720, 238, COLORS.darkSteel, 0.78)
      .setStrokeStyle(2, COLORS.cyanDark, 0.62);
    this.add.rectangle(GAME_WIDTH / 2, 304, 688, 204, 0x071015, 0.52)
      .setStrokeStyle(1, COLORS.cyan, 0.18);

    this.menuText(GAME_WIDTH / 2, 90, gameText.title, {
      fontFamily: 'Arial, Helvetica, sans-serif',
      fontSize: '58px',
      color: '#e8feff',
      stroke: '#031014',
      strokeThickness: 6,
    }).setOrigin(0.5);
    this.menuText(GAME_WIDTH / 2, 146, gameText.subtitle, {
      fontFamily: 'Arial, Helvetica, sans-serif',
      fontSize: '22px',
      color: '#36f6ff',
      stroke: '#031014',
      strokeThickness: 4,
    }).setOrigin(0.5);
    this.menuText(GAME_WIDTH / 2, 238, gameText.menu.premise, {
      fontFamily: 'Arial, Helvetica, sans-serif',
      fontSize: '19px',
      color: '#ffffff',
      align: 'center',
      wordWrap: { width: 620 },
    }).setOrigin(0.5);
    this.menuText(GAME_WIDTH / 2, 296, gameText.menu.route, {
      fontFamily: 'Arial, Helvetica, sans-serif',
      fontSize: '16px',
      color: '#d7fbff',
      align: 'center',
      wordWrap: { width: 620 },
    }).setOrigin(0.5);
    this.menuText(GAME_WIDTH / 2, 356, gameText.menu.controls, {
      fontFamily: 'Arial, Helvetica, sans-serif',
      fontSize: '14px',
      color: '#9beef4',
      align: 'center',
      wordWrap: { width: 660 },
    }).setOrigin(0.5);

    const button = this.add.rectangle(GAME_WIDTH / 2, 444, 340, 48, COLORS.cyanDark, 0.42)
      .setStrokeStyle(2, COLORS.cyan, 0.72)
      .setInteractive({ useHandCursor: true });
    button.on('pointerdown', () => this.startGame());
    this.menuText(GAME_WIDTH / 2, 444, gameText.menu.start, {
      fontFamily: 'Arial, Helvetica, sans-serif',
      fontSize: '20px',
      color: '#ffffff',
      stroke: '#031014',
      strokeThickness: 4,
    }).setOrigin(0.5);
    this.menuText(GAME_WIDTH / 2, 494, 'Pulsa R para borrar el guardado y empezar desde cero', {
      fontFamily: 'Arial, Helvetica, sans-serif',
      fontSize: '13px',
      color: '#8ca8ad',
    }).setOrigin(0.5);
  }

  private menuText(x: number, y: number, text: string, style: Phaser.Types.GameObjects.Text.TextStyle): Phaser.GameObjects.Text {
    return this.add.text(x, y, text, style).setResolution(2);
  }
}
