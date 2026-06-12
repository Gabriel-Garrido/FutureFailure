import { COLORS, DEPTHS } from '../game/constants';
import { type DamagePayload } from '../data/combatConfig';
import { assetKey, frameBoundsFor, type FrameBounds } from '../data/assetMap';
import { type BreakableData } from '../data/levelTypes';

export class BreakableObject extends Phaser.Physics.Arcade.Sprite {
  readonly id: string;
  health: number;

  constructor(scene: Phaser.Scene, private readonly breakableData: BreakableData) {
    const texture = assetKey('destructibles', 'fallback-crate');
    const hasSheet = scene.textures.exists(texture);
    super(scene, breakableData.x, breakableData.y, hasSheet ? texture : 'fallback-crate', hasSheet ? breakableData.frame : undefined);
    this.id = breakableData.id;
    this.health = breakableData.health;
    scene.add.existing(this);
    scene.physics.add.existing(this);
    this.setDepth(DEPTHS.terrain + 1);
    this.fitToCollider();
    const body = this.body as Phaser.Physics.Arcade.Body;
    body.setAllowGravity(false);
    body.setImmovable(true);
    body.moves = false;
  }

  hit(payload?: DamagePayload): boolean {
    this.health -= payload?.amount ?? 1;
    this.setTint(COLORS.cyan);
    this.scene.time.delayedCall(80, () => this.clearTint());
    if (this.health <= 0) {
      this.scene.events.emit('breakable-broken', this.x, this.y, payload);
      this.disableBody(true, true);
      return true;
    }
    return false;
  }

  private fitToCollider(): void {
    const bounds = (frameBoundsFor.destructibles as Record<number, FrameBounds> | undefined)?.[this.breakableData.frame]
      ?? { x: 0, y: 0, width: this.frame.width, height: this.frame.height };
    const scale = Math.min(this.breakableData.width / bounds.width, this.breakableData.height / bounds.height);
    const frameCenterX = this.frame.width / 2;
    const frameCenterY = this.frame.height / 2;
    const visibleCenterOffsetX = (bounds.x + bounds.width / 2 - frameCenterX) * scale;
    const visibleCenterOffsetY = (bounds.y + bounds.height / 2 - frameCenterY) * scale;
    this.setScale(scale).setPosition(
      this.breakableData.x + this.breakableData.width / 2 - visibleCenterOffsetX,
      this.breakableData.y + this.breakableData.height / 2 - visibleCenterOffsetY,
    );
    const body = this.body as Phaser.Physics.Arcade.Body;
    const bodyWidth = this.breakableData.width / scale;
    const bodyHeight = this.breakableData.height / scale;
    body.setSize(bodyWidth, bodyHeight);
    body.setOffset(bounds.x + bounds.width / 2 - bodyWidth / 2, bounds.y + bounds.height / 2 - bodyHeight / 2);
  }
}
