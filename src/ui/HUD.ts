import { gameText } from '../data/gameText';
import { tutorialActions, tutorialPresentationConfig, type TutorialPromptPayload } from '../data/tutorialConfig';
import { COLORS, EVENTS, GAME_WIDTH } from '../game/constants';

export class HUD {
  private healthText: Phaser.GameObjects.Text;
  private energyText: Phaser.GameObjects.Text;
  private keycardText: Phaser.GameObjects.Text;
  private objectiveText: Phaser.GameObjects.Text;
  private contextText: Phaser.GameObjects.Text;
  private tutorialBg: Phaser.GameObjects.Rectangle;
  private tutorialKeyBg: Phaser.GameObjects.Rectangle;
  private tutorialKeyText: Phaser.GameObjects.Text;
  private tutorialPromptText: Phaser.GameObjects.Text;
  private debugText: Phaser.GameObjects.Text;
  private zoneText: Phaser.GameObjects.Text;
  private playerMapMarker: Phaser.GameObjects.Rectangle;
  private mapMarkerObjects: Phaser.GameObjects.GameObject[] = [];
  private readonly mapX = GAME_WIDTH - 252;
  private readonly mapY = 46;
  private readonly mapWidth = 220;
  private levelWidth = 5600;
  private tutorialClearEvent?: Phaser.Time.TimerEvent;

  constructor(private readonly scene: Phaser.Scene) {
    const style: Phaser.Types.GameObjects.Text.TextStyle = { fontFamily: 'Arial', fontSize: '14px', color: '#d7fbff', stroke: '#031014', strokeThickness: 3 };
    scene.add.rectangle(118, 55, 220, 86, COLORS.darkSteel, 0.62).setStrokeStyle(1, COLORS.cyanDark, 0.55).setScrollFactor(0).setDepth(999);
    scene.add.rectangle(GAME_WIDTH / 2, 36, 320, 38, COLORS.darkSteel, 0.56).setStrokeStyle(1, COLORS.cyanDark, 0.45).setScrollFactor(0).setDepth(999);
    this.healthText = scene.add.text(18, 18, `${gameText.hud.health} 5/5`, style);
    this.energyText = scene.add.text(18, 42, `${gameText.hud.energy} 3/5`, style);
    this.keycardText = scene.add.text(18, 66, gameText.hud.keycardOff, style);
    this.objectiveText = scene.add.text(GAME_WIDTH / 2, 23, gameText.objectives.first, { ...style, fontSize: '15px', align: 'center', wordWrap: { width: 292 } }).setOrigin(0.5, 0);
    this.contextText = scene.add.text(GAME_WIDTH / 2, 416, '', { ...style, fontSize: '16px', color: '#ffffff' }).setOrigin(0.5, 0.5);
    this.tutorialBg = scene.add.rectangle(GAME_WIDTH / 2, 468, 380, 54, COLORS.darkSteel, 0.72).setStrokeStyle(1, COLORS.cyan, 0.44);
    this.tutorialKeyBg = scene.add.rectangle(GAME_WIDTH / 2 - 148, 468, 66, 34, COLORS.cyanDark, 0.62).setStrokeStyle(1, COLORS.cyan, 0.75);
    this.tutorialKeyText = scene.add.text(GAME_WIDTH / 2 - 148, 468, '', { fontFamily: 'Arial Black, Arial', fontSize: '16px', color: '#ffffff', stroke: '#031014', strokeThickness: 3 }).setOrigin(0.5);
    this.tutorialPromptText = scene.add.text(GAME_WIDTH / 2 - 104, 468, '', { ...style, fontSize: '17px', color: '#d7fbff', wordWrap: { width: 300 } }).setOrigin(0, 0.5);
    this.debugText = scene.add.text(GAME_WIDTH - 18, 16, '', { ...style, color: '#ffc857' }).setOrigin(1, 0);
    this.zoneText = scene.add.text(this.mapX + this.mapWidth / 2, this.mapY + 52, gameText.zones.bay, { ...style, fontSize: '12px', color: '#ffffff', align: 'center' }).setOrigin(0.5, 0);
    this.playerMapMarker = this.createMap();
    const controlsText = scene.add.text(18, 506, gameText.hud.controls, { ...style, fontSize: '12px', color: '#9beef4' });
    for (const item of [this.healthText, this.energyText, this.keycardText, this.objectiveText, this.contextText, this.tutorialBg, this.tutorialKeyBg, this.tutorialKeyText, this.tutorialPromptText, this.debugText, this.zoneText, this.playerMapMarker, controlsText]) {
      item.setScrollFactor(0).setDepth(1000);
    }
    this.setTutorialVisible(false);
    scene.game.events.on(EVENTS.healthChanged, (value: number, max: number) => this.healthText.setText(`${gameText.hud.health} ${value}/${max}`));
    scene.game.events.on(EVENTS.energyChanged, (value: number, max: number) => this.energyText.setText(`${gameText.hud.energy} ${value}/${max}`));
    scene.game.events.on(EVENTS.keycardChanged, (hasKey: boolean) => this.keycardText.setText(hasKey ? gameText.hud.keycardOn : gameText.hud.keycardOff));
    scene.game.events.on(EVENTS.objectiveChanged, (text: string) => this.objectiveText.setText(text));
    scene.game.events.on(EVENTS.contextChanged, (text: string) => this.contextText.setText(text));
    scene.game.events.on(EVENTS.tutorialChanged, (payload: TutorialPromptPayload) => this.showTutorial(payload));
    scene.game.events.on(EVENTS.mapConfigured, (width: number, markers: { x: number; label: string; type: 'checkpoint' | 'door' | 'key' | 'arena' | 'exit' }[]) => this.configureMap(width, markers));
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
    this.contextText.setTint(COLORS.cyan);
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
    this.tutorialBg.setVisible(visible);
    this.tutorialKeyBg.setVisible(visible);
    this.tutorialKeyText.setVisible(visible);
    this.tutorialPromptText.setVisible(visible);
  }

  private createMap(): Phaser.GameObjects.Rectangle {
    const y = this.mapY;
    this.scene.add.rectangle(this.mapX + this.mapWidth / 2, y + 16, this.mapWidth + 28, 66, COLORS.darkSteel, 0.64).setStrokeStyle(1, COLORS.cyanDark, 0.55).setScrollFactor(0).setDepth(999);
    this.scene.add.text(this.mapX, y - 7, gameText.hud.mapTitle, { fontFamily: 'Arial', fontSize: '11px', color: '#9beef4', stroke: '#031014', strokeThickness: 3 }).setScrollFactor(0).setDepth(1000);
    this.scene.add.rectangle(this.mapX + this.mapWidth / 2, y + 23, this.mapWidth, 8, COLORS.steel, 0.9).setScrollFactor(0).setDepth(1000);
    return this.scene.add.rectangle(this.mapToScreen(0), y + 23, 8, 18, COLORS.cyan, 1);
  }

  private configureMap(width: number, markers: { x: number; label: string; type: 'checkpoint' | 'door' | 'key' | 'arena' | 'exit' }[]): void {
    this.levelWidth = width;
    for (const marker of this.mapMarkerObjects) marker.destroy();
    this.mapMarkerObjects = [];
    for (const marker of markers) {
      const color = marker.type === 'checkpoint' ? COLORS.green : marker.type === 'key' || marker.type === 'door' ? COLORS.amber : marker.type === 'arena' ? COLORS.red : COLORS.purple;
      const line = this.scene.add.rectangle(this.mapToScreen(marker.x), this.mapY + 23, 3, 18, color, 0.95).setScrollFactor(0).setDepth(1001);
      const label = this.scene.add.text(this.mapToScreen(marker.x), this.mapY + 34, marker.label, { fontFamily: 'Arial', fontSize: '9px', color: '#9beef4', stroke: '#031014', strokeThickness: 2 }).setOrigin(0.5, 0).setScrollFactor(0).setDepth(1001);
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
    const t = worldX / this.levelWidth;
    if (t < 0.24) return gameText.zones.bay;
    if (t < 0.48) return gameText.zones.maintenance;
    if (t < 0.70) return gameText.zones.hub;
    if (t < 0.78) return gameText.zones.reactor;
    if (t < 0.94) return gameText.zones.arena;
    return gameText.zones.exit;
  }
}
