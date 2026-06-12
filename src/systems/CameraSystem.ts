export class CameraSystem {
  private lookahead = 0;

  constructor(
    private readonly scene: Phaser.Scene,
    private readonly target: Phaser.GameObjects.GameObject & { x: number; y: number },
    bounds: { width: number; height: number },
  ) {
    const camera = scene.cameras.main;
    camera.setBounds(0, 0, bounds.width, bounds.height);
    camera.startFollow(target, false, 0.12, 0.15);
    camera.setDeadzone(96, 58);
    camera.setRoundPixels(true);
  }

  update(facing: 1 | -1, speedX: number): void {
    const desired = Math.abs(speedX) > 90 ? 104 * facing : 28 * facing;
    this.lookahead = Phaser.Math.Linear(this.lookahead, desired, 0.075);
    this.scene.cameras.main.followOffset.set(-this.lookahead, 20);
  }

  shake(kind: 'light' | 'hit' | 'heavy'): void {
    const camera = this.scene.cameras.main;
    if (kind === 'heavy') camera.shake(135, 0.009);
    else if (kind === 'hit') camera.shake(95, 0.006);
    else camera.shake(55, 0.0025);
  }
}
