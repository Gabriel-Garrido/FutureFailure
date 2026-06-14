import fs from 'node:fs/promises';
import path from 'node:path';
import { enemyMovementConfig } from '../src/data/enemyMovementConfig';
import { levelOne } from '../src/data/levelOne';
import { movementFeelConfig } from '../src/data/movementFeelConfig';
import { playerSpriteConfig } from '../src/data/playerSpriteConfig';
import { EVENTS } from '../src/game/constants';

const root = process.cwd();
const failures: string[] = [];

function assert(condition: boolean, message: string): void {
  if (!condition) failures.push(message);
}

const movement = movementFeelConfig;

assert(movement.coyoteTimeMs > 50 && movement.coyoteTimeMs <= 180, 'Coyote time must be positive and readable, not excessive.');
assert(movement.jumpBufferMs > 50 && movement.jumpBufferMs <= 180, 'Jump buffer must be positive and readable, not excessive.');
assert(movement.cornerCorrectionPixels > 0 && movement.cornerCorrectionPixels <= 12, 'Corner correction must be subtle and positive.');
assert(movement.cornerCorrectionChecks > 0, 'Corner correction must define at least one check step.');
assert(movement.groundSnapMs > 0 && movement.groundSnapMs <= 100, 'Ground snap window must be short and positive.');
assert(movement.groundSnapVelocity > 0 && movement.groundSnapVelocity < movement.gravityDown, 'Ground snap velocity must pull down without replacing gravity.');
assert(movement.dashAirUses === 1, 'Hero should have exactly one air dash in this movement pass.');
assert(movement.dashCooldownMs >= movement.dashDurationMs, 'Dash cooldown must cover dash duration.');
assert(movement.dashBufferMs > 0 && movement.dashBufferMs <= 140, 'Dash buffer must be short and positive.');
assert(playerSpriteConfig.scale === 0.346, 'Hero visual and physics scale must stay at the requested +8% size.');
assert(playerSpriteConfig.body.width === 104 && playerSpriteConfig.body.height === 242, 'Hero body must grow with the +8% visual scale.');
assert(playerSpriteConfig.body.offsetX === 88 && playerSpriteConfig.body.offsetY === 26, 'Hero body offset must keep feet aligned after scaling.');
assert(playerSpriteConfig.projectileHurtZone.width === 80 && playerSpriteConfig.projectileHurtZone.height === 160, 'Hero projectile hurt zone must stay tightened so enemy energy shots only hit when they visibly connect.');
assert(movement.jumpVelocity <= -869, 'Hero jump should stay 10% higher than the previous -790 tuning.');
assert((movement.dashSpeed * movement.dashDurationMs) / 1000 >= 121, 'Hero dash range should grow with the larger sprite.');
assert(movement.dashEndSpeed >= 405, 'Hero dash exit speed should preserve momentum after the longer dash.');
assert(movement.wallJumpVelocityX > movement.maxRunSpeed, 'Wall jump must push the hero away from the wall.');
assert(movement.wallJumpVelocityY <= -760, 'Wall jump must be retuned upward for the larger sprite.');
assert(movement.variableJumpCutMultiplier > 0.25 && movement.variableJumpCutMultiplier < 0.7, 'Variable jump cut must preserve short-hop control.');
assert(movement.maxFallSpeed > movement.maxRunSpeed, 'Fall speed should exceed run speed for readable gravity.');

const groundTypes = ['trooper', 'mech', 'scout'] as const;
for (const type of groundTypes) {
  const config = enemyMovementConfig[type];
  assert(config.patrolSpeed > 0, `${type} must define patrol speed.`);
  assert(config.chaseSpeed >= config.patrolSpeed, `${type} chase speed must be at least patrol speed.`);
  assert(config.acceleration > 0 && config.deceleration > 0, `${type} must define acceleration and deceleration.`);
  assert(config.leashDistance > 200, `${type} leash must be large enough for combat but bounded.`);
  assert(config.edgeProbeX > 0 && config.edgeProbeY > 0, `${type} must define edge probes.`);
  assert(config.attackStopDistance > config.closeRetreatDistance, `${type} attack distance must exceed retreat distance.`);
}

const sentinel = enemyMovementConfig.sentinel;
assert(sentinel.patrolSpeed > 0 && sentinel.chaseSpeed >= sentinel.patrolSpeed, 'Sentinel must define bounded anchor movement speeds.');
assert(sentinel.acceleration > 0 && sentinel.deceleration > 0, 'Sentinel must define acceleration and deceleration.');
assert(sentinel.leashDistance > 200, 'Sentinel leash must keep it readable and bounded.');
assert(sentinel.attackStopDistance > 300, 'Sentinel attack distance must support telegraphed ranged attacks.');

const drone = enemyMovementConfig.drone;
assert(drone.maxSpeed > 0 && drone.maxSpeed < movement.maxRunSpeed, 'Drone max speed must be bounded below hero run speed.');
assert(drone.leashDistance > 300, 'Drone must have a valid leash.');
assert(drone.idealDistanceX > 120, 'Drone must keep a readable horizontal combat distance.');
assert(drone.verticalBob > 0 && drone.verticalBob <= 48, 'Drone bob must be visible but not erratic.');

for (const enemy of levelOne.enemies) {
  assert(Boolean(enemyMovementConfig[enemy.type]), `${enemy.id} has no enemy movement config.`);
  assert(typeof enemy.patrolMin === 'number' && typeof enemy.patrolMax === 'number', `${enemy.id} must define patrol bounds.`);
  assert((enemy.patrolMin ?? 0) < enemy.x && enemy.x < (enemy.patrolMax ?? 0), `${enemy.id} must spawn inside patrol bounds.`);
  assert((enemy.patrolMax ?? 0) - (enemy.patrolMin ?? 0) >= 220, `${enemy.id} patrol bounds are too narrow for state movement.`);
}

for (const eventName of ['playerLanded', 'playerWallSlide', 'playerWallJump', 'playerDashEnded', 'enemyStateChanged'] as const) {
  assert(Boolean(EVENTS[eventName]), `Missing semantic movement event: ${eventName}`);
}

const movementSource = await fs.readFile(path.join(root, 'src/systems/MovementController.ts'), 'utf8');
assert(movementSource.includes('MovementFeelConfig'), 'MovementController must depend on movementFeelConfig contract.');
assert(movementSource.includes('playerWallJump'), 'MovementController must emit wall-jump feedback.');
assert(movementSource.includes('playerDashEnded'), 'MovementController must emit dash-ended feedback.');
assert(movementSource.includes('cornerCorrecting'), 'MovementController must expose corner correction state.');
assert(!movementSource.includes('airDashAvailable'), 'MovementController should use counted air dash state, not a boolean airDashAvailable flag.');

const playerSource = await fs.readFile(path.join(root, 'src/entities/Player.ts'), 'utf8');
assert(playerSource.includes('playerSpriteConfig.scale'), 'Player must apply visual scale from playerSpriteConfig.');
assert(playerSource.includes('playerSpriteConfig.body'), 'Player must apply body sizing from playerSpriteConfig.');
assert(playerSource.includes('playerSpriteConfig.projectileHurtZone'), 'Player must apply projectile hurt zone sizing from playerSpriteConfig.');

const inputSystemSource = await fs.readFile(path.join(root, 'src/systems/InputSystem.ts'), 'utf8');
assert(inputSystemSource.includes('pointerupoutside'), 'Touch input must release buttons even when a touch ends outside its zone.');
assert(inputSystemSource.includes('Phaser.Core.Events.BLUR'), 'Touch input must clear stuck buttons on app blur.');

const touchControlsSource = await fs.readFile(path.join(root, 'src/ui/TouchControls.ts'), 'utf8');
assert(touchControlsSource.includes('isMobileTouchDefault'), 'Touch controls must resolve default visibility from platform type.');
assert(touchControlsSource.includes('!scene.sys.game.device.os.desktop'), 'Touch controls must stay hidden by default on desktop touch devices.');

const gameConfigSource = await fs.readFile(path.join(root, 'src/game/GameConfig.ts'), 'utf8');
assert(gameConfigSource.includes('activePointers: 4'), 'Game config must allow at least four simultaneous pointers for multitouch controls.');

const enemyBaseSource = await fs.readFile(path.join(root, 'src/entities/EnemyBase.ts'), 'utf8');
assert(enemyBaseSource.includes('enemyStateChanged'), 'EnemyBase must emit movement state changes.');
assert(!enemyBaseSource.includes('this.x = Phaser.Math.Clamp'), 'Enemy damage must not teleport enemies through x clamping.');

const enemySpriteConfigSource = await fs.readFile(path.join(root, 'src/data/enemySpriteConfig.ts'), 'utf8');
assert(enemySpriteConfigSource.includes('const humanoidScale = playerSpriteConfig.scale'), 'Humanoid enemies must share the protagonist visual scale.');
assert(enemySpriteConfigSource.includes("body: { width: 98, height: 224, offsetX: 56, offsetY: 34 }"), 'Trooper collider must be retuned for protagonist-sized visuals.');
assert(enemySpriteConfigSource.includes("body: { width: 118, height: 220, offsetX: 44, offsetY: 28 }"), 'Mech collider must be retuned for protagonist-sized visuals.');

for (const relativePath of ['src/entities/TrooperEnemy.ts', 'src/entities/DroneEnemy.ts', 'src/entities/MechEnemy.ts', 'src/entities/ScoutEnemy.ts', 'src/entities/SentinelEnemy.ts']) {
  const source = await fs.readFile(path.join(root, relativePath), 'utf8');
  assert(source.includes('enemyMovementConfig'), `${relativePath} must use enemyMovementConfig.`);
}

if (failures.length > 0) {
  for (const failure of failures) console.error(`[movement:test] ${failure}`);
  process.exitCode = 1;
} else {
  console.log(`[movement:test] hero feel, ${levelOne.enemies.length} enemy patrols and movement events passed validation.`);
}
