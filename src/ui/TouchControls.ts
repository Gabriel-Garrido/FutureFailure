import { COLORS, DEPTHS, GAME_HEIGHT, GAME_WIDTH } from '../game/constants';
import { InputSystem, type TouchButtonName } from '../systems/InputSystem';

type TouchControlButton = {
  name: TouchButtonName;
  x: number;
  y: number;
  radius: number;
  label: string;
  caption: string;
};

const storageKey = 'future-failure-touch-controls-visible';

function isMobileTouchDefault(scene: Phaser.Scene): boolean {
  return scene.sys.game.device.input.touch && !scene.sys.game.device.os.desktop;
}

export class TouchControls {
  private readonly controlsLayer: Phaser.GameObjects.Container;
  private readonly toggleText: Phaser.GameObjects.Text;
  private readonly zones: Phaser.GameObjects.Zone[] = [];
  private visibleControls = true;

  constructor(private readonly scene: Phaser.Scene, private readonly input: InputSystem) {
    if (!scene.sys.game.device.input.touch) {
      this.controlsLayer = scene.add.container(0, 0).setVisible(false);
      this.toggleText = scene.add.text(0, 0, '');
      return;
    }

    scene.events.once(Phaser.Scenes.Events.SHUTDOWN, () => this.input.releaseAllTouchButtons());
    this.visibleControls = this.loadVisibility();
    this.controlsLayer = scene.add.container(0, 0).setScrollFactor(0).setDepth(DEPTHS.ui + 20);
    this.createButtons();
    this.toggleText = this.createToggle();
    this.setControlsVisible(this.visibleControls);
  }

  private createButtons(): void {
    const buttons: TouchControlButton[] = [
      { name: 'left', x: 72, y: GAME_HEIGHT - 76, radius: 34, label: '<', caption: 'IZQ' },
      { name: 'right', x: 152, y: GAME_HEIGHT - 76, radius: 34, label: '>', caption: 'DER' },
      { name: 'shoot', x: GAME_WIDTH - 240, y: GAME_HEIGHT - 146, radius: 29, label: 'V', caption: 'ENERGIA' },
      { name: 'dash', x: GAME_WIDTH - 152, y: GAME_HEIGHT - 146, radius: 29, label: 'Z', caption: 'DASH' },
      { name: 'interact', x: GAME_WIDTH - 240, y: GAME_HEIGHT - 62, radius: 29, label: '^', caption: 'USAR' },
      { name: 'attack', x: GAME_WIDTH - 152, y: GAME_HEIGHT - 62, radius: 32, label: 'C', caption: 'ATAQUE' },
      { name: 'jump', x: GAME_WIDTH - 72, y: GAME_HEIGHT - 98, radius: 38, label: 'X', caption: 'SALTO' },
    ];

    for (const button of buttons) {
      this.createButton(button);
    }
  }

  private createButton(button: TouchControlButton): void {
    const shadow = this.scene.add.circle(button.x + 3, button.y + 4, button.radius + 3, 0x000000, 0.28);
    const outer = this.scene.add.circle(button.x, button.y, button.radius, COLORS.darkSteel, 0.58).setStrokeStyle(2, COLORS.cyan, 0.48);
    const inner = this.scene.add.circle(button.x, button.y, Math.max(10, button.radius - 10), COLORS.steel, 0.44).setStrokeStyle(1, COLORS.cyanDark, 0.42);
    const label = this.scene.add.text(button.x, button.y - 4, button.label, {
      fontFamily: 'Arial Black, Arial',
      fontSize: `${button.radius <= 30 ? 17 : 20}px`,
      color: '#d7fbff',
      stroke: '#031014',
      strokeThickness: 3,
    }).setOrigin(0.5);
    const caption = this.scene.add.text(button.x, button.y + button.radius + 8, button.caption, {
      fontFamily: 'Arial',
      fontSize: '9px',
      color: '#9beef4',
      stroke: '#031014',
      strokeThickness: 2,
    }).setOrigin(0.5);
    const zone = this.scene.add.zone(button.x, button.y, button.radius * 2.35, button.radius * 2.35).setScrollFactor(0);
    this.input.bindTouchButton(button.name, zone);
    this.zones.push(zone);
    this.controlsLayer.add([shadow, outer, inner, label, caption, zone]);
  }

  private createToggle(): Phaser.GameObjects.Text {
    const bg = this.scene.add.rectangle(GAME_WIDTH - 92, GAME_HEIGHT - 218, 116, 24, COLORS.darkSteel, 0.52)
      .setStrokeStyle(1, COLORS.cyan, 0.3)
      .setScrollFactor(0)
      .setDepth(DEPTHS.ui + 25)
      .setInteractive({ useHandCursor: true });
    const text = this.scene.add.text(GAME_WIDTH - 92, GAME_HEIGHT - 218, '', {
      fontFamily: 'Arial',
      fontSize: '10px',
      color: '#d7fbff',
      stroke: '#031014',
      strokeThickness: 2,
    }).setOrigin(0.5).setScrollFactor(0).setDepth(DEPTHS.ui + 26);

    const toggle = () => this.setControlsVisible(!this.visibleControls);
    bg.on('pointerdown', toggle);
    text.setInteractive({ useHandCursor: true }).on('pointerdown', toggle);
    return text;
  }

  private setControlsVisible(visible: boolean): void {
    this.visibleControls = visible;
    this.controlsLayer.setVisible(visible);
    this.toggleText.setText(visible ? 'TACTIL: ON' : 'TACTIL: OFF');
    for (const zone of this.zones) {
      if (visible) zone.setInteractive();
      else zone.disableInteractive();
    }
    if (!visible) this.input.releaseAllTouchButtons();
    this.saveVisibility(visible);
  }

  private loadVisibility(): boolean {
    try {
      const stored = window.localStorage.getItem(storageKey);
      if (stored === 'on') return true;
      if (stored === 'off') return false;
      return isMobileTouchDefault(this.scene);
    } catch {
      return isMobileTouchDefault(this.scene);
    }
  }

  private saveVisibility(visible: boolean): void {
    try {
      window.localStorage.setItem(storageKey, visible ? 'on' : 'off');
    } catch {
      // Ignore storage failures; touch controls still work for this session.
    }
  }
}
