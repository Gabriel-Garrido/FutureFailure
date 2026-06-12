import { COLORS, DEPTHS } from '../game/constants';
import { type Player } from './Player';

export type PickupType = 'healthSmall' | 'healthLarge' | 'energyCell' | 'keycard' | 'upgradeChip' | 'dataShard';

export class Pickup extends Phaser.Physics.Arcade.Sprite {
  private readonly baseY: number;
  private ageMs = 0;
  readonly pickupType: PickupType;

  constructor(scene: Phaser.Scene, x: number, y: number, type: PickupType, texture: string, frame: number) {
    super(scene, x, y, texture, frame);
    this.pickupType = type;
    this.baseY = y;
    scene.add.existing(this);
    scene.physics.add.existing(this);
    this.setDepth(DEPTHS.pickups);
    this.setScale(0.24);
    this.setTint(type === 'keycard' ? COLORS.amber : type.includes('health') ? COLORS.green : COLORS.cyan);
    const body = this.body as Phaser.Physics.Arcade.Body;
    body.setAllowGravity(false);
    body.setCircle(42, 62, 62);
  }

  updatePickup(deltaMs: number): void {
    this.ageMs += deltaMs;
    this.y = this.baseY + Math.sin(this.ageMs / 260) * 7;
    this.setAlpha(0.78 + Math.sin(this.ageMs / 130) * 0.18);
  }

  collect(player: Player): void {
    if (!this.active) return;
    if (this.pickupType === 'healthSmall') player.heal(1);
    if (this.pickupType === 'healthLarge') player.heal(3);
    if (this.pickupType === 'energyCell' || this.pickupType === 'upgradeChip' || this.pickupType === 'dataShard') player.addEnergy(1);
    if (this.pickupType === 'keycard') player.giveKeycard();
    this.disableBody(true, true);
  }
}
