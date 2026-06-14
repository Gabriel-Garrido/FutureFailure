export type InputSnapshot = {
  moveX: number;
  jumpDown: boolean;
  jumpPressed: boolean;
  attackPressed: boolean;
  dashPressed: boolean;
  shootPressed: boolean;
  interactPressed: boolean;
  pausePressed: boolean;
  debugPressed: boolean;
};

type TouchButton = {
  pointerId: number | null;
  active: boolean;
};

export type TouchButtonName = 'left' | 'right' | 'jump' | 'dash' | 'attack' | 'shoot' | 'interact';

export class InputSystem {
  private readonly keys: Record<string, Phaser.Input.Keyboard.Key>;
  private readonly touch: Record<TouchButtonName, TouchButton> = {
    left: { pointerId: null, active: false } as TouchButton,
    right: { pointerId: null, active: false } as TouchButton,
    jump: { pointerId: null, active: false } as TouchButton,
    dash: { pointerId: null, active: false } as TouchButton,
    attack: { pointerId: null, active: false } as TouchButton,
    shoot: { pointerId: null, active: false } as TouchButton,
    interact: { pointerId: null, active: false } as TouchButton,
  };

  private previousJump = false;
  private previousAttack = false;
  private previousDash = false;
  private previousShoot = false;
  private previousInteract = false;
  private previousPause = false;
  private previousDebug = false;

  constructor(private readonly scene: Phaser.Scene) {
    const keyboard = scene.input.keyboard;
    if (!keyboard) throw new Error('Keyboard input is unavailable.');
    this.keys = keyboard.addKeys({
      left: Phaser.Input.Keyboard.KeyCodes.LEFT,
      right: Phaser.Input.Keyboard.KeyCodes.RIGHT,
      jump: Phaser.Input.Keyboard.KeyCodes.X,
      attack: Phaser.Input.Keyboard.KeyCodes.C,
      dash: Phaser.Input.Keyboard.KeyCodes.Z,
      shoot: Phaser.Input.Keyboard.KeyCodes.V,
      interact: Phaser.Input.Keyboard.KeyCodes.UP,
      pause: Phaser.Input.Keyboard.KeyCodes.ESC,
      debug: Phaser.Input.Keyboard.KeyCodes.F3,
    }) as Record<string, Phaser.Input.Keyboard.Key>;
    keyboard.addCapture([
      Phaser.Input.Keyboard.KeyCodes.LEFT,
      Phaser.Input.Keyboard.KeyCodes.RIGHT,
      Phaser.Input.Keyboard.KeyCodes.UP,
      Phaser.Input.Keyboard.KeyCodes.X,
      Phaser.Input.Keyboard.KeyCodes.C,
      Phaser.Input.Keyboard.KeyCodes.Z,
      Phaser.Input.Keyboard.KeyCodes.V,
    ]);
    scene.events.once(Phaser.Scenes.Events.SHUTDOWN, () => this.releaseAllTouchButtons());
    scene.game.events.on(Phaser.Core.Events.BLUR, this.releaseAllTouchButtons, this);
    scene.game.events.once(Phaser.Core.Events.DESTROY, () => {
      scene.game.events.off(Phaser.Core.Events.BLUR, this.releaseAllTouchButtons, this);
    });
  }

  bindTouchButton(name: TouchButtonName, zone: Phaser.GameObjects.Zone): void {
    zone.setInteractive();
    zone.on('pointerdown', (pointer: Phaser.Input.Pointer) => {
      this.touch[name].pointerId = pointer.id;
      this.touch[name].active = true;
    });
    zone.on('pointerup', (pointer: Phaser.Input.Pointer) => this.releaseTouch(name, pointer));
    zone.on('pointerout', (pointer: Phaser.Input.Pointer) => this.releaseTouch(name, pointer));
    zone.on('pointerupoutside', (pointer: Phaser.Input.Pointer) => this.releaseTouch(name, pointer));
  }

  releaseAllTouchButtons(): void {
    for (const button of Object.values(this.touch)) {
      button.pointerId = null;
      button.active = false;
    }
  }

  snapshot(): InputSnapshot {
    const gamepad = this.scene.input.gamepad?.getPad(0);
    const padMove = gamepad ? Phaser.Math.Clamp(gamepad.leftStick.x, -1, 1) : 0;
    const keyboardMove = (this.down('right') ? 1 : 0) - (this.down('left') ? 1 : 0);
    const touchMove = (this.touch.right.active ? 1 : 0) - (this.touch.left.active ? 1 : 0);
    const moveX = Math.abs(padMove) > 0.22 ? padMove : keyboardMove || touchMove;

    const jumpDown = this.down('jump') || this.touch.jump.active || Boolean(gamepad?.A);
    const attackDown = this.down('attack') || this.touch.attack.active || Boolean(gamepad?.X);
    const dashDown = this.down('dash') || this.touch.dash.active || Boolean(gamepad?.B) || Boolean(gamepad?.R1);
    const shootDown = this.down('shoot') || this.touch.shoot.active || Boolean(gamepad?.R2);
    const interactDown = this.down('interact') || this.touch.interact.active || Boolean(gamepad?.Y);
    const pauseDown = this.down('pause') || Boolean(gamepad?.buttons[9]?.pressed);
    const debugDown = this.down('debug');

    const snapshot: InputSnapshot = {
      moveX,
      jumpDown,
      jumpPressed: jumpDown && !this.previousJump,
      attackPressed: attackDown && !this.previousAttack,
      dashPressed: dashDown && !this.previousDash,
      shootPressed: shootDown && !this.previousShoot,
      interactPressed: interactDown && !this.previousInteract,
      pausePressed: pauseDown && !this.previousPause,
      debugPressed: debugDown && !this.previousDebug,
    };

    this.previousJump = jumpDown;
    this.previousAttack = attackDown;
    this.previousDash = dashDown;
    this.previousShoot = shootDown;
    this.previousInteract = interactDown;
    this.previousPause = pauseDown;
    this.previousDebug = debugDown;
    return snapshot;
  }

  private down(key: string): boolean {
    return this.keys[key].isDown;
  }

  private releaseTouch(name: TouchButtonName, pointer: Phaser.Input.Pointer): void {
    if (this.touch[name].pointerId === pointer.id) {
      this.touch[name].pointerId = null;
      this.touch[name].active = false;
    }
  }
}
