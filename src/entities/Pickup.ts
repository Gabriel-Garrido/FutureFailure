import { COLORS, DEPTHS } from '../game/constants';
import { type Player } from './Player';

export type PickupType = 'healthSmall' | 'healthLarge' | 'energyCell' | 'keycard';

export class Pickup extends Phaser.Physics.Arcade.Sprite {
  private baseY: number;
  private ageMs = 0;
  private collectible = true;
  readonly pickupType: PickupType;

  constructor(scene: Phaser.Scene, x: number, y: number, type: PickupType, texture: string, frame: number, options: { collectible?: boolean } = {}) {
    super(scene, x, y, texture, frame);
    this.pickupType = type;
    this.baseY = y;
    this.collectible = options.collectible ?? true;
    scene.add.existing(this);
    scene.physics.add.existing(this);
    this.setDepth(DEPTHS.pickups);
    this.setScale(this.collectible ? 0.24 : 0.16);
    this.setAlpha(this.collectible ? 1 : 0.35);
    this.setTint(type === 'keycard' ? COLORS.amber : type.includes('health') ? COLORS.green : COLORS.cyan);
    const body = this.body as Phaser.Physics.Arcade.Body;
    body.setAllowGravity(false);
    body.setCircle(42, 62, 62);
    body.enable = this.collectible;
  }

  updatePickup(deltaMs: number): void {
    this.ageMs += deltaMs;
    if (!this.collectible) return;
    this.y = this.baseY + Math.sin(this.ageMs / 260) * 7;
    this.setAlpha(0.78 + Math.sin(this.ageMs / 130) * 0.18);
  }

  /**
   * Plays the shared "jump out" reveal used when an item pops out of a broken
   * box or a defeated enemy. The item hops upward with a small overshoot before
   * settling into a collectible, floating pickup. Defaults to 0.5s.
   */
  revealFromBreakable(targetY: number, durationMs = 500, ease = 'Back.easeOut'): void {
    this.collectible = false;
    const body = this.body as Phaser.Physics.Arcade.Body;
    body.enable = false;
    this.setScale(0.12);
    this.scene.tweens.killTweensOf(this);
    this.scene.tweens.add({
      targets: this,
      y: targetY,
      alpha: 0.95,
      scaleX: 0.24,
      scaleY: 0.24,
      duration: durationMs,
      ease,
      onComplete: () => {
        this.baseY = targetY;
        this.collectible = true;
        body.enable = true;
        body.reset(this.x, this.y);
      },
    });
  }

  collect(player: Player): void {
    if (!this.active || !this.collectible) return;
    if (this.pickupType === 'healthSmall') player.heal(1);
    if (this.pickupType === 'healthLarge') player.heal(3);
    if (this.pickupType === 'energyCell') player.addEnergy(1);
    if (this.pickupType === 'keycard') player.giveKeycard();
    this.disableBody(true, true);
  }
}
