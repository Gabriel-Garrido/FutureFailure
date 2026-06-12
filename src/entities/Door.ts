import { COLORS, DEPTHS, EVENTS } from '../game/constants';
import { assetKey, frameBoundsFor, frameFor, type FrameBounds } from '../data/assetMap';
import { gameText } from '../data/gameText';
import { type DoorData } from '../data/levelTypes';
import { type Player } from './Player';

export class Door extends Phaser.GameObjects.Rectangle {
  readonly zone: Phaser.GameObjects.Zone;
  readonly id: string;
  private readonly visual?: Phaser.GameObjects.Sprite;
  private opened = false;

  constructor(scene: Phaser.Scene, private readonly doorData: DoorData) {
    super(scene, doorData.x + doorData.width / 2, doorData.y + doorData.height / 2, doorData.width, doorData.height, COLORS.cyanDark, 0.06);
    this.id = doorData.id;
    scene.add.existing(this);
    scene.physics.add.existing(this, true);
    this.setDepth(DEPTHS.terrain + 3);
    this.setFillStyle(COLORS.cyanDark, 0.015);
    this.setStrokeStyle(1, COLORS.cyan, 0.08);
    const key = assetKey('doors', '');
    if (key && scene.textures.exists(key)) {
      const frame = this.id === 'arena-door' ? frameFor.doorTall : frameFor.door;
      this.visual = scene.add.sprite(this.x, this.y, key, frame);
      this.fitSpriteToOpaqueRect(this.visual, frame, {
        x: doorData.x - 28,
        y: doorData.y - 16,
        width: doorData.width + 56,
        height: doorData.height + 32,
      });
      this.visual.setAlpha(0.98).setDepth(DEPTHS.terrain + 4);
    }
    this.zone = scene.add.zone(this.x, this.y, doorData.width + 70, doorData.height + 40);
    scene.physics.add.existing(this.zone);
    (this.zone.body as Phaser.Physics.Arcade.Body).setAllowGravity(false);
  }

  canOpen(player: Player, objectiveUnlocked = false): boolean {
    return !this.opened && (!this.doorData.requiresKeycard || player.hasKeycard) && (!this.doorData.requiresObjective || objectiveUnlocked);
  }

  isOpen(): boolean {
    return this.opened;
  }

  requirement(): DoorData['requiresObjective'] | 'keycard' | undefined {
    return this.doorData.requiresKeycard ? 'keycard' : this.doorData.requiresObjective;
  }

  interact(player: Player, objectiveUnlocked = false): boolean {
    if (!this.canOpen(player, objectiveUnlocked)) {
      const requirement = this.requirement();
      const message = requirement === 'keycard'
        ? gameText.prompts.keycardRequired
        : requirement === 'movement'
          ? gameText.prompts.movementRequired
          : requirement === 'combat'
            ? gameText.prompts.combatRequired
            : requirement === 'arena'
              ? gameText.prompts.arenaRequired
              : '';
      this.scene.game.events.emit(EVENTS.contextChanged, message);
      return false;
    }
    this.opened = true;
    this.scene.game.events.emit(EVENTS.contextChanged, '');
    this.scene.game.events.emit(EVENTS.objectiveChanged, this.id === 'arena-door' ? gameText.objectives.arenaDoorOpened : gameText.objectives.shortcutOpened);
    this.scene.tweens.add({
      targets: [this, this.visual].filter(Boolean),
      alpha: 0,
      scaleY: 0.05,
      duration: 380,
      ease: 'Cubic.easeIn',
      onComplete: () => {
        this.disableInteractive();
        (this.body as Phaser.Physics.Arcade.StaticBody).enable = false;
      },
    });
    return true;
  }

  private fitSpriteToOpaqueRect(sprite: Phaser.GameObjects.Sprite, frameIndex: number, target: { x: number; y: number; width: number; height: number }): void {
    const bounds = (frameBoundsFor.doors as Record<number, FrameBounds> | undefined)?.[frameIndex] ?? { x: 0, y: 0, width: sprite.frame.width, height: sprite.frame.height };
    const scale = Math.max(target.width / bounds.width, target.height / bounds.height);
    const frameCenterX = sprite.frame.width / 2;
    const frameCenterY = sprite.frame.height / 2;
    const visibleCenterOffsetX = (bounds.x + bounds.width / 2 - frameCenterX) * scale;
    const visibleCenterOffsetY = (bounds.y + bounds.height / 2 - frameCenterY) * scale;
    sprite.setScale(scale).setPosition(
      target.x + target.width / 2 - visibleCenterOffsetX,
      target.y + target.height / 2 - visibleCenterOffsetY,
    );
  }
}
