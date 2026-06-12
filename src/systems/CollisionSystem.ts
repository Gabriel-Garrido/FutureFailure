export function arcadeBody(gameObject: Phaser.GameObjects.GameObject): Phaser.Physics.Arcade.Body {
  return gameObject.body as Phaser.Physics.Arcade.Body;
}
