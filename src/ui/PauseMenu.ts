import { gameText } from '../data/gameText';

export class PauseMenu {
  private readonly panel: Phaser.GameObjects.Container;
  private paused = false;

  constructor(private readonly scene: Phaser.Scene) {
    const bg = scene.add.rectangle(480, 270, 560, 330, 0x05070b, 0.9).setStrokeStyle(2, 0x36f6ff, 0.7);
    const title = scene.add.text(480, 135, gameText.pause.title, { fontFamily: 'Arial Black, Arial', fontSize: '30px', color: '#d7fbff', align: 'center' }).setOrigin(0.5);
    const resume = scene.add.text(480, 178, gameText.pause.resume, { fontFamily: 'Arial', fontSize: '17px', color: '#36f6ff', align: 'center' }).setOrigin(0.5);
    const objective = scene.add.text(480, 230, gameText.pause.objective, { fontFamily: 'Arial', fontSize: '16px', color: '#ffffff', align: 'center', wordWrap: { width: 480 } }).setOrigin(0.5);
    const controls = scene.add.text(480, 330, gameText.pause.controls, { fontFamily: 'Arial', fontSize: '15px', color: '#b8f9ff', align: 'center', lineSpacing: 7 }).setOrigin(0.5);
    this.panel = scene.add.container(0, 0, [bg, title, resume, objective, controls]).setDepth(1200).setScrollFactor(0).setVisible(false);
  }

  toggle(): void {
    this.paused = !this.paused;
    this.panel.setVisible(this.paused);
    if (this.paused) this.scene.physics.pause();
    else this.scene.physics.resume();
  }

  isPaused(): boolean {
    return this.paused;
  }
}
