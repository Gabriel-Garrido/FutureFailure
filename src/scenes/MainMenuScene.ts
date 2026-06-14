import Phaser from 'phaser';
import { gameText } from '../data/gameText';
import { COLORS, GAME_HEIGHT, GAME_WIDTH } from '../game/constants';
import { GAME_LANGS, getCurrentLang, setGameLang, type Lang } from '../game/i18n';
import { SaveSystem } from '../systems/SaveSystem';

const ORBITRON = "'Orbitron', 'Bahnschrift', 'Segoe UI', sans-serif";
const RAJDHANI = "'Rajdhani', 'Bahnschrift', 'Segoe UI', sans-serif";

export class MainMenuScene extends Phaser.Scene {
  constructor() {
    super('MainMenuScene');
  }

  create(): void {
    this.createBackground();
    this.createLogo();
    this.createHeadline();
    this.createStartButton();
    this.createControls();
    this.createLangSwitcher();

    this.input.keyboard?.once('keydown-X', () => this.startGame());
    this.input.keyboard?.on('keydown-R', () => {
      new SaveSystem().clear();
      this.scene.restart();
    });
    this.input.gamepad?.once('down', () => this.startGame());

    this.menuText(GAME_WIDTH / 2, 510, gameText.menu.resetHint, {
      fontFamily: RAJDHANI,
      fontSize: '12px',
      color: '#5f7d86',
    }).setOrigin(0.5);
  }

  private startGame(): void {
    this.scene.start('LevelOneScene');
  }

  /* ---------------- Ambient backdrop ---------------- */
  private createBackground(): void {
    this.add.rectangle(GAME_WIDTH / 2, GAME_HEIGHT / 2, GAME_WIDTH, GAME_HEIGHT, COLORS.background, 1);

    const glow = this.add.graphics().setBlendMode(Phaser.BlendModes.ADD);
    glow.fillStyle(COLORS.cyan, 0.05);
    glow.fillCircle(GAME_WIDTH / 2, 150, 280);
    glow.fillStyle(COLORS.cyan, 0.05);
    glow.fillCircle(GAME_WIDTH / 2, 150, 175);
    glow.fillStyle(COLORS.purple, 0.045);
    glow.fillCircle(GAME_WIDTH * 0.82, 110, 230);
    glow.fillStyle(COLORS.red, 0.03);
    glow.fillCircle(GAME_WIDTH * 0.16, 430, 220);

    this.createFloorGrid();
    this.createScanlines();
    this.createMotes();
  }

  private createFloorGrid(): void {
    const g = this.add.graphics();
    const horizon = 372;
    const bottom = GAME_HEIGHT;
    const vpX = GAME_WIDTH / 2;

    for (let i = -8; i <= 8; i += 1) {
      g.lineStyle(1, COLORS.cyan, 0.1);
      g.lineBetween(vpX + i * 20, horizon, vpX + i * 150, bottom);
    }
    for (let r = 1; r <= 7; r += 1) {
      const t = r / 7;
      const y = horizon + (bottom - horizon) * (t * t);
      const halfW = 70 + (GAME_WIDTH / 1.6) * (t * t);
      g.lineStyle(1, COLORS.cyan, 0.06 + 0.08 * t);
      g.lineBetween(vpX - halfW, y, vpX + halfW, y);
    }
  }

  private createScanlines(): void {
    const scan = this.add.graphics();
    scan.fillStyle(0x000000, 0.18);
    for (let y = 0; y < GAME_HEIGHT; y += 3) scan.fillRect(0, y, GAME_WIDTH, 1);
    scan.setAlpha(0.5);
  }

  private createMotes(): void {
    const palette = [COLORS.cyan, COLORS.purple, COLORS.green];
    for (let i = 0; i < 18; i += 1) {
      const color = palette[i % palette.length];
      const x = Phaser.Math.Between(40, GAME_WIDTH - 40);
      const y = Phaser.Math.Between(40, GAME_HEIGHT - 40);
      const dot = this.add.circle(x, y, Phaser.Math.FloatBetween(1, 2.6), color, Phaser.Math.FloatBetween(0.25, 0.6))
        .setBlendMode(Phaser.BlendModes.ADD);
      this.tweens.add({
        targets: dot,
        y: y - Phaser.Math.Between(22, 54),
        x: x + Phaser.Math.Between(-14, 14),
        alpha: 0.08,
        duration: Phaser.Math.Between(2600, 5200),
        yoyo: true,
        repeat: -1,
        delay: Phaser.Math.Between(0, 1600),
        ease: 'Sine.easeInOut',
      });
    }
  }

  /* ---------------- Logo ---------------- */
  private createLogo(): void {
    const cx = GAME_WIDTH / 2;
    const baseY = 84;
    if (!this.textures.exists('logo')) {
      this.menuText(cx, baseY, gameText.title, {
        fontFamily: ORBITRON,
        fontSize: '52px',
        color: '#e8feff',
        stroke: '#031014',
        strokeThickness: 6,
      }).setOrigin(0.5);
      return;
    }

    const targetWidth = 300;
    const logo = this.add.image(0, 0, 'logo').setOrigin(0.5);
    const scale = targetWidth / logo.width;
    logo.setScale(scale);

    const glow = this.add.image(0, 0, 'logo').setOrigin(0.5)
      .setScale(scale * 1.05)
      .setTint(COLORS.cyan)
      .setAlpha(0.32)
      .setBlendMode(Phaser.BlendModes.ADD);

    const container = this.add.container(cx, baseY, [glow, logo]).setDepth(5);
    this.tweens.add({
      targets: container,
      y: baseY + 7,
      duration: 2400,
      yoyo: true,
      repeat: -1,
      ease: 'Sine.easeInOut',
    });
    this.tweens.add({
      targets: glow,
      alpha: 0.5,
      duration: 1500,
      yoyo: true,
      repeat: -1,
      ease: 'Sine.easeInOut',
    });
  }

  /* ---------------- Headline ---------------- */
  private createHeadline(): void {
    const cx = GAME_WIDTH / 2;
    this.createKicker(cx, 188, gameText.menu.kicker, true);

    const heading = this.add.text(cx, 230, gameText.menu.heading, {
      fontFamily: RAJDHANI,
      fontStyle: '700',
      fontSize: '46px',
      color: '#eafdff',
    }).setOrigin(0.5).setResolution(2);
    heading.setShadow(0, 0, '#36f6ff', 18, false, true);

    this.add.text(cx, 276, gameText.menu.tagline, {
      fontFamily: RAJDHANI,
      fontStyle: '500',
      fontSize: '17px',
      color: '#9fc2cc',
      align: 'center',
    }).setOrigin(0.5).setResolution(2);
  }

  private createKicker(cx: number, y: number, text: string, withLines: boolean): Phaser.GameObjects.Text {
    const label = this.add.text(cx, y, text, {
      fontFamily: ORBITRON,
      fontStyle: '700',
      fontSize: '15px',
      color: '#36f6ff',
    }).setOrigin(0.5).setResolution(2);
    label.setLetterSpacing(7);

    if (withLines) {
      const halfW = label.displayWidth / 2;
      const gap = 16;
      const len = 28;
      const xL = cx - halfW - gap;
      const xR = cx + halfW + gap;
      const g = this.add.graphics();
      g.lineStyle(4, COLORS.cyan, 0.16);
      g.lineBetween(xL - len, y, xL, y);
      g.lineBetween(xR, y, xR + len, y);
      g.lineStyle(2, COLORS.cyan, 0.8);
      g.lineBetween(xL - len, y, xL, y);
      g.lineBetween(xR, y, xR + len, y);
      g.fillStyle(COLORS.cyan, 0.9);
      g.fillCircle(xL - len, y, 2.2);
      g.fillCircle(xR + len, y, 2.2);
    }
    return label;
  }

  /* ---------------- Start button ---------------- */
  private createStartButton(): void {
    const cx = GAME_WIDTH / 2;
    const cy = 344;
    const w = 300;
    const h = 58;
    const b = 16;
    const points: Array<[number, number]> = [
      [-w / 2 + b, -h / 2],
      [w / 2, -h / 2],
      [w / 2, h / 2 - b],
      [w / 2 - b, h / 2],
      [-w / 2, h / 2],
      [-w / 2, -h / 2 + b],
    ];
    const trace = (g: Phaser.GameObjects.Graphics): void => {
      g.beginPath();
      g.moveTo(points[0][0], points[0][1]);
      for (let i = 1; i < points.length; i += 1) g.lineTo(points[i][0], points[i][1]);
      g.closePath();
    };

    const container = this.add.container(cx, cy).setDepth(6);

    const glow = this.add.graphics().setBlendMode(Phaser.BlendModes.ADD);
    glow.fillStyle(COLORS.cyan, 0.4);
    trace(glow);
    glow.fillPath();
    glow.setScale(1.08);

    const base = this.add.graphics();
    base.fillStyle(0x36f6ff, 1);
    trace(base);
    base.fillPath();
    // top gloss following the bevel contour
    base.fillStyle(0xffffff, 0.22);
    base.beginPath();
    base.moveTo(-w / 2, -h / 2 + b);
    base.lineTo(-w / 2 + b, -h / 2);
    base.lineTo(w / 2, -h / 2);
    base.lineTo(w / 2, -3);
    base.lineTo(-w / 2, -3);
    base.closePath();
    base.fillPath();
    // edges
    base.lineStyle(2, 0xbdf6ff, 0.9);
    trace(base);
    base.strokePath();
    base.lineStyle(2, 0xffffff, 0.5);
    base.lineBetween(-w / 2 + b + 2, -h / 2 + 3, w / 2 - 3, -h / 2 + 3);

    const label = this.add.text(0, 0, gameText.menu.launch, {
      fontFamily: ORBITRON,
      fontStyle: '800',
      fontSize: '21px',
      color: '#032027',
    }).setOrigin(0.5).setResolution(2);
    label.setLetterSpacing(4);
    label.setShadow(0, 1, 'rgba(255,255,255,0.5)', 2, false, true);

    const hit = this.add.rectangle(0, 0, w, h, 0xffffff, 0).setInteractive({ useHandCursor: true });

    container.add([glow, base, label, hit]);

    this.tweens.add({
      targets: glow,
      scaleX: 1.14,
      scaleY: 1.14,
      alpha: 0.62,
      duration: 1400,
      yoyo: true,
      repeat: -1,
      ease: 'Sine.easeInOut',
    });

    hit.on('pointerover', () => {
      this.tweens.add({ targets: container, scaleX: 1.04, scaleY: 1.04, duration: 140, ease: 'Quad.easeOut' });
    });
    hit.on('pointerout', () => {
      this.tweens.add({ targets: container, scaleX: 1, scaleY: 1, duration: 140, ease: 'Quad.easeOut' });
    });
    hit.on('pointerdown', () => this.startGame());
  }

  /* ---------------- Controls ---------------- */
  private createControls(): void {
    const cx = GAME_WIDTH / 2;
    this.createKicker(cx, 422, gameText.menu.controlsTitle, false);

    const rowY = 466;
    const capH = 30;
    const padX = 10;
    const minCapW = 32;
    const keyLabelGap = 8;
    const itemGap = 16;

    const g = this.add.graphics().setDepth(1);

    const built = gameText.menu.controlKeys.map((item) => {
      const keyText = this.add.text(0, 0, item.key, {
        fontFamily: ORBITRON,
        fontStyle: '700',
        fontSize: '15px',
        color: '#dff6fb',
      }).setOrigin(0.5).setResolution(2).setDepth(2);
      const labelText = this.add.text(0, 0, item.label, {
        fontFamily: RAJDHANI,
        fontStyle: '600',
        fontSize: '14px',
        color: '#8fb2bd',
      }).setOrigin(0, 0.5).setResolution(2).setDepth(2);
      labelText.setLetterSpacing(1);
      const capW = Math.max(minCapW, Math.ceil(keyText.width) + padX * 2);
      return { keyText, labelText, capW, labelW: Math.ceil(labelText.width) };
    });

    const totalW = built.reduce((sum, b) => sum + b.capW + keyLabelGap + b.labelW + itemGap, 0) - itemGap;
    let x = cx - totalW / 2;

    for (const b of built) {
      const capX = x;
      const capY = rowY - capH / 2;
      g.fillStyle(0x0b161e, 0.85);
      g.fillRoundedRect(capX, capY, b.capW, capH, 6);
      g.lineStyle(1.5, COLORS.cyan, 0.45);
      g.strokeRoundedRect(capX, capY, b.capW, capH, 6);
      g.lineStyle(2, COLORS.cyan, 0.3);
      g.lineBetween(capX + 5, capY + capH - 1, capX + b.capW - 5, capY + capH - 1);

      b.keyText.setPosition(capX + b.capW / 2, rowY);
      b.labelText.setPosition(capX + b.capW + keyLabelGap, rowY);
      x += b.capW + keyLabelGap + b.labelW + itemGap;
    }
  }

  /* ---------------- Language switcher ---------------- */
  private createLangSwitcher(): void {
    const pillW = 36;
    const pillH = 20;
    const gap = 4;
    const totalW = GAME_LANGS.length * pillW + (GAME_LANGS.length - 1) * gap;
    const startX = GAME_WIDTH - 14 - totalW;
    const cy = 18;
    const current = getCurrentLang();

    GAME_LANGS.forEach(({ code, label }, i) => {
      const x = startX + i * (pillW + gap);
      const isActive = code === current;

      const bg = this.add.graphics().setDepth(10);
      const drawPill = (color: number, alpha: number, stroke: number, strokeAlpha: number): void => {
        bg.clear();
        bg.fillStyle(color, alpha);
        bg.fillRoundedRect(x, cy - pillH / 2, pillW, pillH, 4);
        bg.lineStyle(1, stroke, strokeAlpha);
        bg.strokeRoundedRect(x, cy - pillH / 2, pillW, pillH, 4);
      };
      drawPill(
        isActive ? COLORS.cyan : 0x0b161e,
        isActive ? 1 : 0.75,
        COLORS.cyan,
        isActive ? 0 : 0.5,
      );

      const txt = this.add.text(x + pillW / 2, cy, label, {
        fontFamily: ORBITRON,
        fontStyle: '700',
        fontSize: '10px',
        color: isActive ? '#032027' : '#36f6ff',
      }).setOrigin(0.5).setResolution(2).setDepth(11);

      const hit = this.add.rectangle(x + pillW / 2, cy, pillW, pillH, 0xffffff, 0)
        .setInteractive({ useHandCursor: true })
        .setDepth(12);

      if (!isActive) {
        hit.on('pointerover', () => drawPill(COLORS.cyan, 0.15, COLORS.cyan, 0.9));
        hit.on('pointerout', () => drawPill(0x0b161e, 0.75, COLORS.cyan, 0.5));
        hit.on('pointerdown', () => this.switchLang(code));
      }
    });
  }

  private switchLang(lang: Lang): void {
    setGameLang(lang);
    this.scene.restart();
  }

  private menuText(x: number, y: number, text: string, style: Phaser.Types.GameObjects.Text.TextStyle): Phaser.GameObjects.Text {
    return this.add.text(x, y, text, style).setResolution(2);
  }
}
