import Phaser from 'phaser';
import { HUD } from '../ui/HUD';

export class UIScene extends Phaser.Scene {
  private hud?: HUD;

  constructor() {
    super('UIScene');
  }

  create(): void {
    this.hud = new HUD(this);
    void this.hud;
  }
}
