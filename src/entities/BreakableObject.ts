import { COLORS, DEPTHS } from '../game/constants';
import { type DamagePayload } from '../data/combatConfig';
import { assetKey, frameBoundsFor, type FrameBounds } from '../data/assetMap';
import { type BreakableData } from '../data/levelTypes';
import { cropToOpaqueBounds } from '../systems/spriteFit';

export class BreakableObject extends Phaser.Physics.Arcade.Sprite {
  readonly id: string;
  health: number;
  private restX = 0;
  private restY = 0;
  private restScaleX = 1;
  private restScaleY = 1;
  private readonly maxHealth: number;
  private readonly frames: { intact: number; damaged: number; destroyed: number; debris: number };
  private readonly visualSinkPx: number;

  constructor(scene: Phaser.Scene, private readonly breakableData: BreakableData) {
    const texture = assetKey('destructibles', 'fallback-crate');
    const hasSheet = scene.textures.exists(texture);
    super(scene, breakableData.x, breakableData.y, hasSheet ? texture : 'fallback-crate', hasSheet ? breakableData.frame : undefined);
    this.id = breakableData.id;
    this.health = breakableData.health;
    this.maxHealth = breakableData.health;
    this.frames = this.resolveFrames(breakableData);
    this.visualSinkPx = this.resolveVisualSinkPx(breakableData.type);
    scene.add.existing(this);
    scene.physics.add.existing(this);
    this.setDepth(DEPTHS.terrain + 1);
    this.fitToCollider();
    this.restX = this.x;
    this.restY = this.y;
    this.restScaleX = this.scaleX;
    this.restScaleY = this.scaleY;
    const body = this.body as Phaser.Physics.Arcade.Body;
    body.setAllowGravity(false);
    body.setImmovable(true);
    body.moves = false;
  }

  hit(payload?: DamagePayload): boolean {
    this.health -= payload?.amount ?? 1;
    this.scene.tweens.killTweensOf(this);
    this.showHitFeedback(payload);
    if (this.health > 0) {
      this.updateDamageFrame();
      return false;
    }

    this.breakApart(payload);
    return true;
  }

  private showHitFeedback(payload?: DamagePayload): void {
    this.setTint(COLORS.cyan);
    this.spawnHitSparks(payload);
    this.scene.tweens.killTweensOf(this);
    this.setPosition(this.restX, this.restY);
    this.setScale(this.restScaleX, this.restScaleY);
    this.scene.tweens.add({
      targets: this,
      alpha: 0.72,
      duration: 36,
      yoyo: true,
      ease: 'Cubic.easeOut',
      onComplete: () => {
        this.setAlpha(1);
        this.setPosition(this.restX, this.restY);
        this.setScale(this.restScaleX, this.restScaleY);
        this.resetSolidBody();
      },
    });
    this.scene.time.delayedCall(80, () => this.clearTint());
  }

  private updateDamageFrame(): void {
    const ratio = this.health / this.maxHealth;
    if (ratio <= 0.34) this.setBreakableFrame(this.frames.destroyed, false);
    else if (ratio <= 0.68) this.setBreakableFrame(this.frames.damaged, false);
  }

  private breakApart(payload?: DamagePayload): void {
    const body = this.body as Phaser.Physics.Arcade.Body;
    body.enable = false;
    this.setActive(false);
    this.scene.events.emit('breakable-broken', this.x, this.y, payload, this.breakableData);
    this.spawnBreakParticles();
    this.playBreakAnimation([this.frames.damaged, this.frames.destroyed, this.frames.debris]);
  }

  private playBreakAnimation(frames: number[]): void {
    frames.forEach((frame, index) => {
      this.scene.time.delayedCall(index * 70, () => {
        if (!this.scene || !this.texture) return;
        this.setBreakableFrame(frame, true);
        this.setAlpha(index === frames.length - 1 ? 0.82 : 1);
      });
    });
    this.scene.tweens.add({
      targets: this,
      scaleX: this.restScaleX * 1.16,
      scaleY: this.restScaleY * 0.82,
      alpha: 0.86,
      duration: 110,
      ease: 'Cubic.easeOut',
      onComplete: () => {
        this.setScale(this.restScaleX, this.restScaleY);
      },
    });
  }

  private spawnHitSparks(payload?: DamagePayload): void {
    const direction = payload?.hitX !== undefined && this.x >= payload.hitX ? 1 : -1;
    for (let i = 0; i < 5; i += 1) {
      const spark = this.scene.add.rectangle(
        this.x + Phaser.Math.Between(-12, 12),
        this.y + Phaser.Math.Between(-18, 10),
        3,
        9,
        COLORS.cyan,
        0.86,
      ).setDepth(DEPTHS.effects);
      this.scene.tweens.add({
        targets: spark,
        x: spark.x + direction * Phaser.Math.Between(14, 32),
        y: spark.y + Phaser.Math.Between(-22, 12),
        alpha: 0,
        angle: Phaser.Math.Between(-70, 70),
        duration: 180,
        ease: 'Cubic.easeOut',
        onComplete: () => spark.destroy(),
      });
    }
  }

  private spawnBreakParticles(): void {
    for (let i = 0; i < 10; i += 1) {
      const shard = this.scene.add.rectangle(
        this.x + Phaser.Math.Between(-18, 18),
        this.y + Phaser.Math.Between(-18, 16),
        Phaser.Math.Between(3, 7),
        Phaser.Math.Between(3, 8),
        i % 3 === 0 ? COLORS.cyan : COLORS.steel,
        0.88,
      ).setDepth(DEPTHS.effects);
      this.scene.tweens.add({
        targets: shard,
        x: shard.x + Phaser.Math.Between(-42, 42),
        y: shard.y + Phaser.Math.Between(-48, 20),
        alpha: 0,
        angle: Phaser.Math.Between(-140, 140),
        duration: 360,
        ease: 'Cubic.easeOut',
        onComplete: () => shard.destroy(),
      });
    }
  }

  private setBreakableFrame(frame: number, destroyedState: boolean): void {
    this.setFrame(frame);
    this.fitToCollider();
    this.restX = this.x;
    this.restY = this.y;
    this.restScaleX = this.scaleX;
    this.restScaleY = this.scaleY;
    if (destroyedState) {
      const body = this.body as Phaser.Physics.Arcade.Body;
      body.enable = false;
    } else {
      this.resetSolidBody();
    }
  }

  private resolveFrames(data: BreakableData): { intact: number; damaged: number; destroyed: number; debris: number } {
    if (data.type === 'barrel') {
      return {
        intact: data.frame,
        damaged: data.damagedFrame ?? 5,
        destroyed: data.destroyedFrame ?? 6,
        debris: data.debrisFrame ?? 31,
      };
    }
    if (data.type === 'canister') {
      return {
        intact: data.frame,
        damaged: data.damagedFrame ?? 9,
        destroyed: data.destroyedFrame ?? 10,
        debris: data.debrisFrame ?? 35,
      };
    }
    return {
      intact: data.frame,
      damaged: data.damagedFrame ?? 1,
      destroyed: data.destroyedFrame ?? 2,
      debris: data.debrisFrame ?? 30,
    };
  }

  private fitToCollider(): void {
    const frameIndex = typeof this.frame.name === 'number' ? this.frame.name : Number(this.frame.name);
    const measured = (frameBoundsFor.destructibles as Record<number, FrameBounds> | undefined)?.[frameIndex];
    const bounds = measured ?? { x: 0, y: 0, width: this.frame.width, height: this.frame.height };
    const scale = Math.min(this.breakableData.width / bounds.width, this.breakableData.height / bounds.height);
    const frameCenterX = this.frame.width / 2;
    const frameCenterY = this.frame.height / 2;
    const visibleCenterOffsetX = (bounds.x + bounds.width / 2 - frameCenterX) * scale;
    const sinkUnits = this.visualSinkPx / scale;
    this.setScale(scale).setPosition(
      this.breakableData.x + this.breakableData.width / 2 - visibleCenterOffsetX,
      this.breakableData.y + this.breakableData.height - (bounds.y + bounds.height - frameCenterY) * scale + this.visualSinkPx,
    );
    // Clip packed-sheet edges, like every other fitted sprite.
    if (measured) cropToOpaqueBounds(this, measured);
    const body = this.body as Phaser.Physics.Arcade.Body;
    const bodyWidth = this.breakableData.width / scale;
    const bodyHeight = this.breakableData.height / scale;
    body.setSize(bodyWidth, bodyHeight);
    body.setOffset(
      bounds.x + bounds.width / 2 - bodyWidth / 2,
      bounds.y + bounds.height - bodyHeight - sinkUnits,
    );
    this.resetSolidBody();
  }

  private resolveVisualSinkPx(type: BreakableData['type']): number {
    if (type === 'canister') return 3;
    return 4;
  }

  private resetSolidBody(): void {
    const body = this.body as Phaser.Physics.Arcade.Body;
    if (this.health <= 0) return;
    body.enable = true;
    body.setAllowGravity(false);
    body.setImmovable(true);
    body.moves = false;
    body.updateFromGameObject();
  }
}
