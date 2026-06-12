import { COLORS, DEPTHS } from '../game/constants';
import { assetKey, frameBoundsFor, frameFor, type FrameBounds } from '../data/assetMap';
import { type HazardData, type RectData } from '../data/levelTypes';

export class Hazard extends Phaser.GameObjects.Rectangle {
  readonly damage: number;
  readonly zone: Phaser.GameObjects.Zone;
  private readonly visuals: Phaser.GameObjects.Sprite[] = [];
  private hazardActive = true;
  private timerMs = 0;

  constructor(scene: Phaser.Scene, data: HazardData) {
    const color = data.type === 'acid' ? COLORS.green : data.type === 'laser' ? COLORS.red : data.type === 'steam' ? 0xb7f7ff : COLORS.red;
    super(scene, data.x + data.width / 2, data.y + data.height / 2, data.width, data.height, color, 0);
    this.damage = data.damage;
    scene.add.existing(this);
    this.setDepth(DEPTHS.terrain + 2);
    const key = assetKey('hazards', '');
    if (key && scene.textures.exists(key)) {
      const frame = data.frame ?? (data.type === 'acid' ? frameFor.acid : data.type === 'laser' ? frameFor.laser : data.type === 'steam' ? frameFor.steam : frameFor.spike);
      this.createVisuals(scene, data, key, frame);
    }
    this.zone = scene.add.zone(data.x + data.width / 2, data.y + data.height / 2, data.width, data.height);
    scene.physics.add.existing(this.zone);
    const body = this.zone.body as Phaser.Physics.Arcade.Body;
    body.setAllowGravity(false);
    body.enable = true;
    this.setData('cycleMs', data.cycleMs ?? 0);
    this.setData('warningMs', data.warningMs ?? 0);
  }

  updateHazard(deltaMs: number): void {
    const cycleMs = this.getData('cycleMs') as number;
    if (cycleMs <= 0) return;
    this.timerMs = (this.timerMs + deltaMs) % cycleMs;
    const warningMs = this.getData('warningMs') as number;
    this.hazardActive = this.timerMs > warningMs && this.timerMs < cycleMs * 0.72;
    this.setAlpha(0);
    for (const visual of this.visuals) {
      visual.setAlpha(this.hazardActive ? 0.9 : 0.3 + Math.sin(this.timerMs / 45) * 0.12);
    }
    (this.zone.body as Phaser.Physics.Arcade.Body).enable = this.hazardActive;
  }

  private createVisuals(scene: Phaser.Scene, data: HazardData, key: string, frame: number): void {
    const visualRect = data.visual ?? data;
    if (data.type === 'acid' || data.type === 'spikes') {
      const segmentWidth = data.type === 'acid' ? 160 : 86;
      const count = Math.max(1, Math.ceil(visualRect.width / segmentWidth));
      for (let i = 0; i < count; i += 1) {
        const segment: RectData = {
          x: visualRect.x + (visualRect.width / count) * i,
          y: visualRect.y,
          width: visualRect.width / count,
          height: visualRect.height,
        };
        const visual = scene.add.sprite(segment.x + segment.width / 2, segment.y + segment.height / 2, key, frame);
        this.fitSpriteToOpaqueRect(visual, frame, segment, 'contain', data.type === 'spikes' ? 'bottom' : 'center');
        visual.setDepth(DEPTHS.terrain + 3);
        this.visuals.push(visual);
      }
      return;
    }

    const visual = scene.add.sprite(visualRect.x + visualRect.width / 2, visualRect.y + visualRect.height / 2, key, frame);
    this.fitSpriteToOpaqueRect(visual, frame, visualRect, 'contain');
    visual.setDepth(DEPTHS.terrain + 3);
    this.visuals.push(visual);
  }

  private fitSpriteToOpaqueRect(sprite: Phaser.GameObjects.Sprite, frameIndex: number, target: RectData, mode: 'contain' | 'cover', verticalAlign: 'top' | 'center' | 'bottom' = 'center'): void {
    const bounds = (frameBoundsFor.hazards as Record<number, FrameBounds> | undefined)?.[frameIndex] ?? { x: 0, y: 0, width: sprite.frame.width, height: sprite.frame.height };
    const scaleX = target.width / bounds.width;
    const scaleY = target.height / bounds.height;
    const scale = mode === 'cover' ? Math.max(scaleX, scaleY) : Math.min(scaleX, scaleY);
    const frameCenterX = sprite.frame.width / 2;
    const frameCenterY = sprite.frame.height / 2;
    const visibleCenterOffsetX = (bounds.x + bounds.width / 2 - frameCenterX) * scale;
    const visibleCenterOffsetY = (bounds.y + bounds.height / 2 - frameCenterY) * scale;
    const spriteX = target.x + target.width / 2 - visibleCenterOffsetX;
    let spriteY = target.y + target.height / 2 - visibleCenterOffsetY;
    if (verticalAlign === 'top') spriteY = target.y - (bounds.y - frameCenterY) * scale;
    if (verticalAlign === 'bottom') spriteY = target.y + target.height - (bounds.y + bounds.height - frameCenterY) * scale;
    sprite.setScale(scale).setPosition(spriteX, spriteY);
  }
}
