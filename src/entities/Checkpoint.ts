import { COLORS, DEPTHS } from '../game/constants';
import { assetKey, frameBoundsFor, frameFor, type FrameBounds } from '../data/assetMap';

export class Checkpoint extends Phaser.GameObjects.Rectangle {
  readonly id: string;
  readonly zone: Phaser.GameObjects.Zone;
  activeCheckpoint = false;
  private readonly visual?: Phaser.GameObjects.Sprite;
  private readonly aura: Phaser.GameObjects.Ellipse;
  private readonly beamIdle: Phaser.GameObjects.Rectangle;

  constructor(scene: Phaser.Scene, id: string, x: number, y: number) {
    super(scene, x, y - 54, 34, 112, COLORS.purple, 0.18);
    this.id = id;
    scene.add.existing(this);
    this.setDepth(DEPTHS.decorations);
    this.setStrokeStyle(2, COLORS.cyan, 0.45);
    this.aura = scene.add.ellipse(x, y - 8, 92, 20, COLORS.cyan, 0.16).setDepth(DEPTHS.decorations + 1);
    this.beamIdle = scene.add.rectangle(x, y - 74, 14, 128, COLORS.cyan, 0.09).setDepth(DEPTHS.decorations);
    const key = assetKey('interactables', '');
    if (key && scene.textures.exists(key)) {
      this.visual = scene.add.sprite(x, y - 62, key, frameFor.checkpoint);
      this.fitSpriteToOpaqueRect(this.visual, frameFor.checkpoint, { x: x - 43, y: y - 124, width: 86, height: 118 });
      this.visual.setDepth(DEPTHS.decorations + 2);
    }
    scene.tweens.add({
      targets: [this.aura, this.beamIdle],
      alpha: { from: 0.08, to: 0.28 },
      duration: 900,
      yoyo: true,
      repeat: -1,
      ease: 'Sine.easeInOut',
    });
    if (this.visual) {
      scene.tweens.add({
        targets: this.visual,
        y: y - 68,
        duration: 1200,
        yoyo: true,
        repeat: -1,
        ease: 'Sine.easeInOut',
      });
    }
    this.zone = scene.add.zone(x, y - 40, 120, 130);
    scene.physics.add.existing(this.zone);
    (this.zone.body as Phaser.Physics.Arcade.Body).setAllowGravity(false);
  }

  activate(): void {
    if (this.activeCheckpoint) return;
    this.activeCheckpoint = true;
    this.setFillStyle(COLORS.cyan, 0.44);
    this.visual?.setTint(COLORS.green);
    this.aura.setFillStyle(COLORS.green, 0.32);
    this.beamIdle.setFillStyle(COLORS.green, 0.16);
    const beam = this.scene.add.rectangle(this.x, this.y - 80, 18, 220, COLORS.cyan, 0.18).setDepth(DEPTHS.effects);
    this.scene.tweens.add({ targets: beam, alpha: 0, scaleY: 1.4, duration: 620, onComplete: () => beam.destroy() });
  }

  private fitSpriteToOpaqueRect(sprite: Phaser.GameObjects.Sprite, frameIndex: number, target: { x: number; y: number; width: number; height: number }): void {
    const bounds = (frameBoundsFor.interactables as Record<number, FrameBounds> | undefined)?.[frameIndex] ?? { x: 0, y: 0, width: sprite.frame.width, height: sprite.frame.height };
    const scale = Math.min(target.width / bounds.width, target.height / bounds.height);
    const frameCenterX = sprite.frame.width / 2;
    const frameCenterY = sprite.frame.height / 2;
    const visibleCenterOffsetX = (bounds.x + bounds.width / 2 - frameCenterX) * scale;
    const visibleCenterOffsetY = (bounds.y + bounds.height / 2 - frameCenterY) * scale;
    sprite.setScale(scale).setPosition(
      target.x + target.width / 2 - visibleCenterOffsetX,
      target.y + target.height - (bounds.y + bounds.height - frameCenterY) * scale,
    );
  }
}
