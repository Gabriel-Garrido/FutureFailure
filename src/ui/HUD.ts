import { gameText } from '../data/gameText';
import { hudUiConfig } from '../data/uiConfig';
import { tutorialActions, tutorialPresentationConfig, type TutorialPromptPayload } from '../data/tutorialConfig';
import { COLORS, DEPTHS, EVENTS, GAME_WIDTH } from '../game/constants';
import { fitSpriteToOpaqueRect } from '../systems/spriteFit';

type MapMarker = { x: number; label: string; type: 'start' | 'key' | 'arena' | 'exit' };

type FramedPanel = {
  bg: Phaser.GameObjects.Rectangle;
  stroke: Phaser.GameObjects.Rectangle;
  accents: Phaser.GameObjects.Rectangle[];
  corners: Phaser.GameObjects.Sprite[];
};

type VisibleObject = Phaser.GameObjects.GameObject & Phaser.GameObjects.Components.Visible;

type SlotVisual = {
  shell: Phaser.GameObjects.Rectangle;
  fill: Phaser.GameObjects.Rectangle;
  shine: Phaser.GameObjects.Rectangle;
};

export class HUD {
  private readonly healthSlots: SlotVisual[] = [];
  private readonly energySlots: SlotVisual[] = [];
  private readonly healthCountText: Phaser.GameObjects.Text;
  private readonly energyCountText: Phaser.GameObjects.Text;
  private readonly keycardText: Phaser.GameObjects.Text;
  private readonly objectiveText: Phaser.GameObjects.Text;
  private readonly contextText: Phaser.GameObjects.Text;
  private readonly tutorialPanel: VisibleObject[];
  private readonly tutorialKeyBg: Phaser.GameObjects.Rectangle;
  private readonly tutorialKeyText: Phaser.GameObjects.Text;
  private readonly tutorialPromptText: Phaser.GameObjects.Text;
  private readonly debugText: Phaser.GameObjects.Text;
  private readonly zoneText: Phaser.GameObjects.Text;
  private readonly playerMapMarker: Phaser.GameObjects.Rectangle;
  private readonly vitalsPanel: FramedPanel;
  private readonly hasUiTexture: boolean;
  private maxHealthSlots = 0;
  private maxEnergySlots = 0;
  private mapMarkerObjects: Phaser.GameObjects.GameObject[] = [];
  private readonly mapX = GAME_WIDTH - 238;
  private readonly mapY = 38;
  private readonly mapWidth = 202;
  private levelWidth = 5600;
  private tutorialClearEvent?: Phaser.Time.TimerEvent;

  constructor(private readonly scene: Phaser.Scene) {
    this.hasUiTexture = scene.textures.exists(hudUiConfig.textureKey);
    const style: Phaser.Types.GameObjects.Text.TextStyle = {
      fontFamily: 'Arial',
      fontSize: '14px',
      color: '#d7fbff',
      stroke: '#031014',
      strokeThickness: 3,
    };

    this.vitalsPanel = this.createFramedPanel(hudUiConfig.vitals.x - 8, hudUiConfig.vitals.y - 8, hudUiConfig.vitals.minPanelWidth, hudUiConfig.vitals.panelHeight, 0.48);
    this.createLabel(hudUiConfig.vitals.x, hudUiConfig.vitals.y + 8, gameText.hud.health);
    this.createLabel(hudUiConfig.vitals.x, hudUiConfig.vitals.y + 35, gameText.hud.energy);
    this.healthCountText = scene.add.text(hudUiConfig.vitals.x + hudUiConfig.vitals.minPanelWidth - 28, hudUiConfig.vitals.y + 8, '', { ...style, fontSize: '11px', color: '#e9fdff', align: 'right' }).setOrigin(1, 0);
    this.energyCountText = scene.add.text(hudUiConfig.vitals.x + hudUiConfig.vitals.minPanelWidth - 28, hudUiConfig.vitals.y + 35, '', { ...style, fontSize: '11px', color: '#e9fdff', align: 'right' }).setOrigin(1, 0);
    this.keycardText = scene.add.text(hudUiConfig.vitals.x, hudUiConfig.vitals.y + 58, gameText.hud.keycardOff, { ...style, fontSize: '10px', color: '#9beef4' });

    this.createFramedPanel(hudUiConfig.panels.objective.x, hudUiConfig.panels.objective.y, hudUiConfig.panels.objective.width, hudUiConfig.panels.objective.height, 0.52);
    this.objectiveText = scene.add.text(GAME_WIDTH / 2, 24, gameText.objectives.first, { ...style, fontSize: '15px', align: 'center', wordWrap: { width: 292 } }).setOrigin(0.5, 0);
    this.contextText = scene.add.text(GAME_WIDTH / 2, 416, '', { ...style, fontSize: '16px', color: '#ffffff' }).setOrigin(0.5, 0.5);

    const tutorialFrame = this.createFramedPanel(hudUiConfig.panels.tutorial.x, hudUiConfig.panels.tutorial.y, hudUiConfig.panels.tutorial.width, hudUiConfig.panels.tutorial.height, 0.72);
    this.tutorialKeyBg = scene.add.rectangle(GAME_WIDTH / 2 - 148, 468, 66, 34, COLORS.cyanDark, 0.62).setStrokeStyle(1, COLORS.cyan, 0.75);
    this.tutorialKeyText = scene.add.text(GAME_WIDTH / 2 - 148, 468, '', { fontFamily: 'Arial Black, Arial', fontSize: '16px', color: '#ffffff', stroke: '#031014', strokeThickness: 3 }).setOrigin(0.5);
    this.tutorialPromptText = scene.add.text(GAME_WIDTH / 2 - 104, 468, '', { ...style, fontSize: '17px', color: '#d7fbff', wordWrap: { width: 300 } }).setOrigin(0, 0.5);
    this.tutorialPanel = [tutorialFrame.bg, tutorialFrame.stroke, ...tutorialFrame.accents, ...tutorialFrame.corners, this.tutorialKeyBg, this.tutorialKeyText, this.tutorialPromptText];

    this.debugText = scene.add.text(GAME_WIDTH - 18, 16, '', { ...style, color: '#ffc857' }).setOrigin(1, 0);
    this.zoneText = scene.add.text(this.mapX + this.mapWidth / 2, this.mapY + 46, gameText.zones.bay, { ...style, fontSize: '11px', color: '#ffffff', align: 'center' }).setOrigin(0.5, 0);
    this.playerMapMarker = this.createMap();
    const controlsText = scene.add.text(18, 506, gameText.hud.controls, { ...style, fontSize: '12px', color: '#9beef4' });

    for (const item of [this.healthCountText, this.energyCountText, this.keycardText, this.objectiveText, this.contextText, this.tutorialKeyBg, this.tutorialKeyText, this.tutorialPromptText, this.debugText, this.zoneText, this.playerMapMarker, controlsText]) {
      item.setScrollFactor(0).setDepth(DEPTHS.ui + 900);
    }
    this.contextText.setTint(COLORS.cyan);
    this.setTutorialVisible(false);
    this.updateHealth(5, 5);
    this.updateEnergy(3, 5);

    scene.game.events.on(EVENTS.healthChanged, (value: number, max: number) => this.updateHealth(value, max));
    scene.game.events.on(EVENTS.energyChanged, (value: number, max: number) => this.updateEnergy(value, max));
    scene.game.events.on(EVENTS.keycardChanged, (hasKey: boolean) => this.keycardText.setText(hasKey ? gameText.hud.keycardOn : gameText.hud.keycardOff));
    scene.game.events.on(EVENTS.objectiveChanged, (text: string) => this.objectiveText.setText(text));
    scene.game.events.on(EVENTS.contextChanged, (text: string) => this.contextText.setText(text));
    scene.game.events.on(EVENTS.tutorialChanged, (payload: TutorialPromptPayload) => this.showTutorial(payload));
    scene.game.events.on(EVENTS.mapConfigured, (width: number, markers: MapMarker[]) => this.configureMap(width, markers));
    scene.game.events.on(EVENTS.playerPositionChanged, (x: number) => this.updateMap(x));
    scene.game.events.on(EVENTS.debugChanged, (enabled: boolean) => this.debugText.setText(enabled ? gameText.hud.debug : ''));
    scene.events.once(Phaser.Scenes.Events.SHUTDOWN, () => {
      scene.game.events.removeAllListeners(EVENTS.healthChanged);
      scene.game.events.removeAllListeners(EVENTS.energyChanged);
      scene.game.events.removeAllListeners(EVENTS.keycardChanged);
      scene.game.events.removeAllListeners(EVENTS.objectiveChanged);
      scene.game.events.removeAllListeners(EVENTS.contextChanged);
      scene.game.events.removeAllListeners(EVENTS.tutorialChanged);
      scene.game.events.removeAllListeners(EVENTS.mapConfigured);
      scene.game.events.removeAllListeners(EVENTS.playerPositionChanged);
      scene.game.events.removeAllListeners(EVENTS.debugChanged);
    });
  }

  private updateHealth(value: number, max: number): void {
    this.maxHealthSlots = Math.max(0, Math.ceil(max));
    this.ensureSlots(this.healthSlots, max, hudUiConfig.vitals.y + 23, COLORS.cyan);
    this.resizeVitalsPanel();
    this.updateSlots(this.healthSlots, value, COLORS.cyan);
    this.healthCountText.setText(`${Math.max(0, Math.ceil(value))}/${Math.max(0, Math.ceil(max))}`);
  }

  private updateEnergy(value: number, max: number): void {
    this.maxEnergySlots = Math.max(0, Math.ceil(max));
    this.ensureSlots(this.energySlots, max, hudUiConfig.vitals.y + 50, COLORS.amber);
    this.resizeVitalsPanel();
    this.updateSlots(this.energySlots, value, COLORS.amber);
    this.energyCountText.setText(`${Math.max(0, Math.ceil(value))}/${Math.max(0, Math.ceil(max))}`);
  }

  private ensureSlots(slots: SlotVisual[], max: number, y: number, fillColor: number): void {
    const target = Math.max(0, Math.ceil(max));
    while (slots.length < target) {
      const index = slots.length;
      const x = hudUiConfig.vitals.x
        + hudUiConfig.vitals.labelWidth
        + hudUiConfig.vitals.slotWidth / 2
        + index * (hudUiConfig.vitals.slotWidth + hudUiConfig.vitals.slotGap);
      slots.push(this.createSlot(x, y, fillColor));
    }
    for (let i = 0; i < slots.length; i += 1) {
      const visible = i < target;
      slots[i].shell.setVisible(visible);
      slots[i].fill.setVisible(visible);
      slots[i].shine.setVisible(visible);
    }
  }

  private updateSlots(slots: SlotVisual[], value: number, fillColor: number): void {
    const current = Phaser.Math.Clamp(value, 0, slots.length);
    for (let i = 0; i < slots.length; i += 1) {
      const ratio = Phaser.Math.Clamp(current - i, 0, 1);
      const fillWidth = Math.max(0, hudUiConfig.vitals.slotWidth * ratio);
      const slot = slots[i];
      slot.shell.setStrokeStyle(1, ratio > 0 ? fillColor : COLORS.cyanDark, ratio > 0 ? 0.5 : 0.36);
      slot.fill.setFillStyle(fillColor, ratio > 0 ? 0.92 : 0.1);
      slot.fill.setVisible(ratio > 0);
      slot.fill.setDisplaySize(fillWidth, hudUiConfig.vitals.slotHeight);
      slot.fill.setPosition(slot.shell.x - hudUiConfig.vitals.slotWidth / 2 + fillWidth / 2, slot.shell.y);
      slot.shine.setVisible(ratio > 0);
      slot.shine.setDisplaySize(Math.max(2, fillWidth * 0.72), 2);
      slot.shine.setPosition(slot.shell.x - hudUiConfig.vitals.slotWidth / 2 + Math.max(2, fillWidth * 0.72) / 2 + 2, slot.shell.y - 3);
    }
  }

  private resizeVitalsPanel(): void {
    const maxSlots = Math.max(this.maxHealthSlots, this.maxEnergySlots);
    const width = Math.max(
      hudUiConfig.vitals.minPanelWidth,
      hudUiConfig.vitals.labelWidth + 54 + maxSlots * (hudUiConfig.vitals.slotWidth + hudUiConfig.vitals.slotGap),
    );
    this.setPanelBounds(this.vitalsPanel, hudUiConfig.vitals.x - 8, hudUiConfig.vitals.y - 8, width, hudUiConfig.vitals.panelHeight);
    this.healthCountText.setX(hudUiConfig.vitals.x + width - 22);
    this.energyCountText.setX(hudUiConfig.vitals.x + width - 22);
  }

  private showTutorial(payload: TutorialPromptPayload): void {
    const action = tutorialActions[payload.actionId];
    this.tutorialClearEvent?.remove(false);
    this.tutorialKeyText.setText(action.keyboard);
    this.tutorialPromptText.setText(payload.text);
    this.setTutorialVisible(true);
    this.tutorialClearEvent = this.scene.time.delayedCall(payload.durationMs ?? tutorialPresentationConfig.promptDurationMs, () => {
      this.setTutorialVisible(false);
    });
  }

  private setTutorialVisible(visible: boolean): void {
    for (const item of this.tutorialPanel) item.setVisible(visible);
  }

  private createMap(): Phaser.GameObjects.Rectangle {
    const y = this.mapY;
    this.createFramedPanel(hudUiConfig.panels.map.x, hudUiConfig.panels.map.y, hudUiConfig.panels.map.width, hudUiConfig.panels.map.height, 0.58);
    this.scene.add.text(this.mapX, y - 7, gameText.hud.mapTitle, { fontFamily: 'Arial', fontSize: '11px', color: '#9beef4', stroke: '#031014', strokeThickness: 3 }).setScrollFactor(0).setDepth(DEPTHS.ui + 900);
    this.scene.add.rectangle(this.mapX + this.mapWidth / 2, y + 23, this.mapWidth, 8, COLORS.steel, 0.9).setScrollFactor(0).setDepth(DEPTHS.ui + 900);
    return this.scene.add.rectangle(this.mapToScreen(0), y + 23, 8, 18, COLORS.cyan, 1);
  }

  private configureMap(width: number, markers: MapMarker[]): void {
    this.levelWidth = width;
    for (const marker of this.mapMarkerObjects) marker.destroy();
    this.mapMarkerObjects = [];
    for (const marker of markers) {
      const color = marker.type === 'start' ? COLORS.green : marker.type === 'key' ? COLORS.amber : marker.type === 'arena' ? COLORS.red : COLORS.purple;
      const line = this.scene.add.rectangle(this.mapToScreen(marker.x), this.mapY + 23, 3, 18, color, 0.95).setScrollFactor(0).setDepth(DEPTHS.ui + 901);
      const label = this.scene.add.text(this.mapToScreen(marker.x), this.mapY + 34, marker.label, { fontFamily: 'Arial', fontSize: '9px', color: '#9beef4', stroke: '#031014', strokeThickness: 2 }).setOrigin(0.5, 0).setScrollFactor(0).setDepth(DEPTHS.ui + 901);
      this.mapMarkerObjects.push(line, label);
    }
  }

  private updateMap(playerX: number): void {
    this.playerMapMarker.x = this.mapToScreen(playerX);
    this.zoneText.setText(this.zoneFor(playerX));
  }

  private mapToScreen(worldX: number): number {
    return this.mapX + Phaser.Math.Clamp(worldX / this.levelWidth, 0, 1) * this.mapWidth;
  }

  private zoneFor(worldX: number): string {
    // Absolute world-X thresholds matching the level's section layout.
    if (worldX < 2850) return gameText.zones.bay;
    if (worldX < 5000) return gameText.zones.maintenance;
    if (worldX < 6100) return gameText.zones.hub;
    if (worldX < 7200) return gameText.zones.reactor;
    if (worldX < 8400) return gameText.zones.arena;
    if (worldX < 10550) return gameText.zones.boss;
    return gameText.zones.exit;
  }

  private createSlot(x: number, y: number, fillColor: number): SlotVisual {
    const shell = this.scene.add.rectangle(x, y, hudUiConfig.vitals.slotWidth, hudUiConfig.vitals.slotHeight, COLORS.darkSteel, 0.72)
      .setStrokeStyle(1, COLORS.cyanDark, 0.38)
      .setScrollFactor(0)
      .setDepth(DEPTHS.ui + 901);
    const fill = this.scene.add.rectangle(x, y, hudUiConfig.vitals.slotWidth, hudUiConfig.vitals.slotHeight, fillColor, 0.92)
      .setScrollFactor(0)
      .setDepth(DEPTHS.ui + 902);
    const shine = this.scene.add.rectangle(x - 1, y - 3, hudUiConfig.vitals.slotWidth * 0.72, 2, 0xffffff, 0.42)
      .setScrollFactor(0)
      .setDepth(DEPTHS.ui + 903);
    return { shell, fill, shine };
  }

  private createLabel(x: number, y: number, text: string): Phaser.GameObjects.Text {
    return this.scene.add.text(x, y, text, {
      fontFamily: 'Arial Black, Arial',
      fontSize: '9px',
      color: '#9beef4',
      stroke: '#031014',
      strokeThickness: 3,
    }).setScrollFactor(0).setDepth(DEPTHS.ui + 900).setAlpha(0.92);
  }

  private createFramedPanel(x: number, y: number, width: number, height: number, alpha: number): FramedPanel {
    const bg = this.scene.add.rectangle(x + width / 2, y + height / 2, width, height, COLORS.darkSteel, alpha)
      .setStrokeStyle(1, COLORS.cyanDark, 0.32)
      .setScrollFactor(0)
      .setDepth(DEPTHS.ui + 899);
    const stroke = this.scene.add.rectangle(x + width / 2, y + height / 2, width - 6, height - 6, COLORS.cyanDark, 0)
      .setStrokeStyle(1, COLORS.cyan, 0.1)
      .setScrollFactor(0)
      .setDepth(DEPTHS.ui + 900);
    const accent = this.scene.add.rectangle(x + 12, y + 8, Math.max(48, width * 0.28), 2, COLORS.cyan, 0.34)
      .setOrigin(0, 0.5)
      .setScrollFactor(0)
      .setDepth(DEPTHS.ui + 901);
    const corners = this.hasUiTexture ? [
      this.createUiSprite(x + 9, y + 9, hudUiConfig.frames.panelCornerTopLeft, hudUiConfig.panels.cornerSize, hudUiConfig.panels.cornerSize, 0.38),
      this.createUiSprite(x + width - 9, y + 9, hudUiConfig.frames.panelCornerTopRight, hudUiConfig.panels.cornerSize, hudUiConfig.panels.cornerSize, 0.38),
      this.createUiSprite(x + 9, y + height - 9, hudUiConfig.frames.panelCornerBottomLeft, hudUiConfig.panels.cornerSize, hudUiConfig.panels.cornerSize, 0.3),
      this.createUiSprite(x + width - 9, y + height - 9, hudUiConfig.frames.panelCornerBottomRight, hudUiConfig.panels.cornerSize, hudUiConfig.panels.cornerSize, 0.3),
    ] : [];
    return { bg, stroke, accents: [accent], corners };
  }

  private setPanelBounds(panel: FramedPanel, x: number, y: number, width: number, height: number): void {
    panel.bg.setPosition(x + width / 2, y + height / 2).setSize(width, height).setDisplaySize(width, height);
    panel.stroke.setPosition(x + width / 2, y + height / 2).setSize(width - 6, height - 6).setDisplaySize(width - 6, height - 6);
    panel.accents[0]?.setPosition(x + 12, y + 8).setSize(Math.max(48, width * 0.28), 2).setDisplaySize(Math.max(48, width * 0.28), 2);
    if (panel.corners.length !== 4) return;
    panel.corners[0].setPosition(x + 9, y + 9);
    panel.corners[1].setPosition(x + width - 9, y + 9);
    panel.corners[2].setPosition(x + 9, y + height - 9);
    panel.corners[3].setPosition(x + width - 9, y + height - 9);
  }

  private createUiSprite(x: number, y: number, frame: number, width: number, height: number, alpha: number): Phaser.GameObjects.Sprite {
    const sprite = this.scene.add.sprite(x, y, this.hasUiTexture ? hudUiConfig.textureKey : 'fallback-pickup', this.hasUiTexture ? frame : undefined)
      .setAlpha(alpha)
      .setScrollFactor(0)
      .setDepth(DEPTHS.ui + 901);
    if (this.hasUiTexture) {
      fitSpriteToOpaqueRect(sprite, 'ui', frame, { x: x - width / 2, y: y - height / 2, width, height }, 'contain');
    } else {
      sprite.setDisplaySize(width, height);
    }
    if (!this.hasUiTexture) sprite.setTint(COLORS.cyan);
    return sprite;
  }
}
