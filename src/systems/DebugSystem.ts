import { EVENTS } from '../game/constants';

export class DebugSystem {
  enabled = false;

  constructor(private readonly scene: Phaser.Scene) {}

  toggle(): void {
    this.enabled = !this.enabled;
    this.scene.physics.world.drawDebug = this.enabled;
    this.scene.physics.world.debugGraphic?.setVisible(this.enabled);
    for (const child of this.scene.children.list) {
      const debugObject = child as Phaser.GameObjects.GameObject & {
        getData?: (key: string) => unknown;
        setVisible?: (visible: boolean) => void;
      };
      if (debugObject.getData?.('debug-visual') && debugObject.setVisible) {
        debugObject.setVisible(this.enabled);
      }
    }
    this.scene.game.events.emit(EVENTS.debugChanged, this.enabled);
  }
}
