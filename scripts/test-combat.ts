import fs from 'node:fs/promises';
import path from 'node:path';
import { combatConfig } from '../src/data/combatConfig';
import { dropConfig, rollEnemyDrop, type EnemyDropKind } from '../src/data/dropConfig';
import { EVENTS } from '../src/game/constants';

const root = process.cwd();
const failures: string[] = [];

function assert(condition: boolean, message: string): void {
  if (!condition) failures.push(message);
}

for (const [index, stage] of combatConfig.combo.stages.entries()) {
  assert(stage.stage === index + 1, `Combo stage ${index + 1} is out of order.`);
  assert(stage.amount > 0, `Combo stage ${stage.stage} must deal positive damage.`);
  assert(stage.activeStartMs >= 0 && stage.activeStartMs < stage.activeEndMs, `Combo stage ${stage.stage} active window is invalid.`);
  assert(stage.activeEndMs <= stage.durationMs, `Combo stage ${stage.stage} active window exceeds duration.`);
  assert(stage.chainStartMs >= stage.activeStartMs, `Combo stage ${stage.stage} chain window starts before active window.`);
  assert(stage.chainEndMs <= stage.durationMs, `Combo stage ${stage.stage} chain window exceeds duration.`);
  assert(stage.cancelAfterMs >= stage.activeStartMs, `Combo stage ${stage.stage} cancel window starts too early.`);
  assert(stage.width > 0 && stage.height > 0, `Combo stage ${stage.stage} hitbox must be positive.`);
  assert(stage.hitstop.durationMs >= 0 && stage.hitstop.timeScale > 0 && stage.hitstop.timeScale <= 1, `Combo stage ${stage.stage} hitstop is invalid.`);
  assert(stage.defeatHitstop.durationMs >= stage.hitstop.durationMs, `Combo stage ${stage.stage} defeat hitstop must be at least normal hitstop.`);
}

assert(combatConfig.combo.stages[2].isFinisher, 'Third combo stage must be marked as finisher.');
assert(combatConfig.combo.stages[2].amount > combatConfig.combo.stages[0].amount, 'Finisher must deal more damage than opener.');
assert(combatConfig.combo.repeatIntervalMs === 300, 'Sword attacks must enforce exactly 300 ms between attack starts.');
assert(combatConfig.combo.inputBufferMs >= combatConfig.combo.repeatIntervalMs, 'Sword combo queue buffer must remain long enough to preserve valid chain inputs.');
assert(combatConfig.combo.resetMs > combatConfig.combo.repeatIntervalMs, 'Combo reset must outlast the sword repeat interval so chained hits remain possible.');
assert(combatConfig.combo.recoveryMs >= combatConfig.combo.repeatIntervalMs, 'Sword attacks must not end with a shorter recovery than the repeat interval.');
assert(combatConfig.combo.cancelRecoveryMs >= combatConfig.combo.repeatIntervalMs, 'Sword cancel recovery must still respect the repeat interval.');
assert(combatConfig.combo.finisherRecoveryMs >= combatConfig.combo.repeatIntervalMs, 'Sword finisher recovery must still respect the repeat interval.');
assert(combatConfig.combo.jumpCancelBufferMs >= 120 && combatConfig.combo.jumpCancelBufferMs <= 220, 'Sword jump-cancel buffer must preserve quick jump input without feeling automatic.');
assert(combatConfig.projectile.enemy.knockback.enabled === false, 'Enemy projectiles must not apply knockback.');
assert(combatConfig.projectile.enemy.hitstop.durationMs === 0 && combatConfig.projectile.enemy.hitstop.timeScale === 1, 'Enemy projectiles must not use global hitstop.');
assert(combatConfig.projectile.enemy.reaction.mode === 'stagger', 'Enemy projectiles must use local stagger feedback.');
assert(combatConfig.projectile.enemy.reaction.allowGlobalHitstop === false, 'Enemy projectile reaction must explicitly block global hitstop.');
assert(combatConfig.projectile.enemy.reaction.retainVelocityX === 0 && combatConfig.projectile.enemy.reaction.retainVelocityY === 0, 'Enemy projectile damage must stop retained movement instead of moving the player.');
assert(combatConfig.projectile.enemy.reaction.maxRetainedVelocityX === 0 && combatConfig.projectile.enemy.reaction.maxRetainedVelocityY === 0, 'Enemy projectile damage must not preserve dash-speed or fall-speed movement.');
assert(combatConfig.projectile.deflect.amount > 0, 'Deflected enemy projectiles must deal damage.');
assert(combatConfig.projectile.deflect.speed > combatConfig.projectile.player.speed, 'Deflected projectiles should return faster than normal player energy shots.');
assert(combatConfig.projectile.deflect.hitstop.durationMs > 0, 'Projectile deflects need readable hitstop feedback.');
assert(combatConfig.playerDamage.contact.invulnerabilityMs > 0, 'Enemy contact damage must grant invulnerability.');
assert(combatConfig.playerDamage.contact.reaction.mode === 'knockback', 'Enemy contact damage should keep knockback reaction.');
assert(!('hazard' in combatConfig.playerDamage), 'Static hazard damage config must stay removed.');
assert(combatConfig.hitRules.hitstopAlwaysResetsToOne, 'Combat config must preserve hitstop reset rule.');
assert(combatConfig.hitRules.enemyProjectilesUseGlobalHitstop === false, 'Enemy projectile hitstop rule must stay disabled.');
assert(combatConfig.hitRules.enemyProjectileDamageIsIdempotent, 'Enemy projectile damage must be idempotent.');
assert(combatConfig.hitRules.enemyProjectileDamagePreservesPlayerPosition, 'Enemy projectile damage must preserve player position.');
assert(combatConfig.hitRules.enemyProjectilesCanBeDeflected, 'Enemy projectile deflection rule must stay enabled.');

const eventValues = Object.values(EVENTS);
assert(new Set(eventValues).size === eventValues.length, 'EVENTS values must be unique.');
for (const eventName of ['enemyDamaged', 'enemyDefeated', 'playerDamaged', 'combatHitstop'] as const) {
  assert(Boolean(EVENTS[eventName]), `Missing semantic combat event: ${eventName}`);
}

const combatFiles = [
  'src/systems/CombatSystem.ts',
  'src/scenes/LevelOneScene.ts',
  'src/entities/EnemyBase.ts',
  'src/entities/Player.ts',
  'src/entities/Projectile.ts',
  'src/systems/MovementController.ts',
];

for (const relativePath of combatFiles) {
  const source = await fs.readFile(path.join(root, relativePath), 'utf8');
  assert(!source.includes("'enemy-hit'") && !source.includes('"enemy-hit"'), `${relativePath} still uses legacy enemy-hit event.`);
  assert(!source.includes("'enemy-killed'") && !source.includes('"enemy-killed"'), `${relativePath} still uses legacy enemy-killed event.`);
}

const combatSystemSource = await fs.readFile(path.join(root, 'src/systems/CombatSystem.ts'), 'utf8');
assert(combatSystemSource.includes('applyPlayerDamage'), 'CombatSystem must centralize player damage application.');
assert(combatSystemSource.includes('cancelHitstop'), 'CombatSystem must be able to reset hitstop before player projectile damage reactions.');
assert(combatSystemSource.includes('consumeImpact'), 'Enemy projectile overlaps must consume impact idempotently.');
assert(combatSystemSource.includes('player.projectileHurtZone'), 'Enemy projectile damage must use the stable player projectile hurt zone.');
assert(combatSystemSource.includes('isProjectilePointInsideDamageArea'), 'Enemy projectile damage must confirm a tighter torso hit area before applying damage.');
assert(combatSystemSource.includes('instanceof Projectile'), 'Enemy projectile overlap must resolve the projectile by type, not by group-vs-single argument order.');
assert(combatSystemSource.includes('deflectEnemyProjectile'), 'CombatSystem must let melee attacks deflect enemy projectiles.');
assert(combatSystemSource.includes('projectile.fromPlayer'), 'CombatSystem must distinguish deflected projectiles from hostile projectiles.');
assert(combatSystemSource.includes("source: 'deflectedProjectile'"), 'Deflected projectile damage must use a semantic damage source.');
assert(combatSystemSource.includes("projectile.getData('sourceEnemy')"), 'Deflected enemy projectiles should try to return toward their source enemy.');

const projectileSource = await fs.readFile(path.join(root, 'src/entities/Projectile.ts'), 'utf8');
assert(projectileSource.includes('hitId'), 'Projectile must expose hitId for damage idempotency.');
assert(projectileSource.includes('consumeImpact'), 'Projectile must prevent duplicate impact resolution.');
assert(projectileSource.includes('deflect('), 'Projectile must be able to change ownership when deflected.');
assert(projectileSource.includes('player-deflect-'), 'Deflected projectiles must receive a fresh player-owned hit id.');
assert(projectileSource.includes('ENEMY_RADIUS = 7'), 'Enemy projectile hit radius must stay tighter than the old oversized value.');

const playerSource = await fs.readFile(path.join(root, 'src/entities/Player.ts'), 'utf8');
const playerSpriteConfigSource = await fs.readFile(path.join(root, 'src/data/playerSpriteConfig.ts'), 'utf8');
assert(playerSource.includes('recentDamageIds'), 'Player must remember recent damage ids.');
assert(playerSource.includes('projectileHurtZone'), 'Player must expose an animation-independent projectile hurt zone.');
assert(playerSource.includes('hitConfirmJumpCancelMs'), 'Player attacks must expose hit-confirm jump cancel timing.');
assert(playerSource.includes('forceJumpPressedThisFrame'), 'Player must preserve jump input when canceling a hit-confirmed attack.');
assert(playerSource.includes('attackJumpBufferMs'), 'Player must buffer jump inputs pressed during sword startup/recovery.');
assert(playerSource.includes('jumpCancelBufferMs'), 'Player must use the configured jump-cancel buffer timing.');
assert(playerSource.includes('this.attackJumpBufferMs > 0'), 'Buffered jumps must be able to trigger attack jump cancel once valid.');
assert(playerSource.includes('attackCooldownMs'), 'Player attacks must enforce a cooldown cadence between sword swings.');
assert(playerSource.includes('repeatIntervalMs'), 'Player sword cadence must be driven by a central repeat-interval config.');
assert(playerSource.includes('Math.max(this.attackCooldownMs, targetCooldownMs)'), 'Player must preserve the longest sword lock so spam cannot skip cadence.');
assert(playerSource.includes('comboQueueMs'), 'Player must separate combo queue timing from attack cooldown timing.');
assert(!playerSource.includes('this.attackStage === 0 && this.attackBufferMs > 0'), 'Player must not convert neutral cooldown attack presses into delayed attacks.');
assert(playerSource.includes('isProjectilePointInsideDamageArea'), 'Player must expose a narrow torso hit validation for enemy projectiles.');
assert(playerSource.includes('torsoAimY'), 'Player must expose a shared torso aiming anchor.');
assert(playerSource.includes('finisherRecoveryMs'), 'Player finisher attacks must enforce a heavier recovery cadence.');
assert(!playerSource.includes('this.setPosition('), 'Player damage flow should not reposition the hero body.');
assert(playerSpriteConfigSource.includes('width: 80'), 'Player projectile hurt zone width must stay tightened to avoid unfair enemy projectile hits.');
assert(playerSpriteConfigSource.includes('height: 160'), 'Player projectile hurt zone height must stay tightened to avoid unfair enemy projectile hits.');
assert(playerSpriteConfigSource.includes('projectileDamageArea'), 'Player sprite config must define a second-stage projectile damage area.');
assert(playerSpriteConfigSource.includes('torsoAimOffsetY'), 'Player sprite config must define a shared torso aim offset.');

const movementSource = await fs.readFile(path.join(root, 'src/systems/MovementController.ts'), 'utf8');
assert(movementSource.includes('applyRetainedDamageVelocity'), 'MovementController must support retained-velocity damage reactions.');

const enemyBaseSource = await fs.readFile(path.join(root, 'src/entities/EnemyBase.ts'), 'utf8');
assert(enemyBaseSource.includes('player.torsoAimY()'), 'Enemies must aim at the player torso via the shared anchor.');
assert(enemyBaseSource.includes("projectile.setData('sourceEnemy', this)"), 'Enemy-fired projectiles must remember their source enemy for accurate deflection returns.');

// Drop economy: defeating enemies must reward the player, with energy the most
// likely pickup so the energy-driven ranged attack stays sustainable.
function seq(values: number[]): () => number {
  let index = 0;
  return () => values[Math.min(index++, values.length - 1)];
}

const enemyDropKinds: EnemyDropKind[] = ['trooper', 'drone', 'mech', 'scout', 'sentinel'];
assert(dropConfig.revealDurationMs === 500, 'Drop reveal jump must last 0.5 seconds.');
for (const kind of enemyDropKinds) {
  const profile = dropConfig.enemies[kind];
  assert(profile.dropChance > 0 && profile.dropChance <= 1, `${kind} drop chance must be within (0, 1].`);
  assert(profile.table.length > 0, `${kind} drop table must not be empty.`);
  assert(profile.table.every((entry) => entry.weight > 0), `${kind} drop weights must be positive.`);
  assert(profile.table.every((entry) => !['upgradeChip', 'dataShard'].includes(String(entry.type))), `${kind} must not drop alternate energy pickup types.`);
  const energy = profile.table.find((entry) => entry.type === 'energyCell');
  assert(Boolean(energy), `${kind} drop table must include energy cells.`);
  const totalWeight = profile.table.reduce((sum, entry) => sum + entry.weight, 0);
  const healthWeight = profile.table
    .filter((entry) => entry.type === 'healthSmall' || entry.type === 'healthLarge')
    .reduce((sum, entry) => sum + entry.weight, 0);
  assert(healthWeight / totalWeight >= 0.4, `${kind} should have meaningful combined health recovery chance.`);
  const maxOtherWeight = Math.max(...profile.table.filter((entry) => entry.type !== 'energyCell').map((entry) => entry.weight));
  assert((energy?.weight ?? 0) > maxOtherWeight, `${kind} must make energy the single most likely drop.`);
}

// `dropChance` gate: a roll above the chance yields nothing; a roll below yields a valid pickup.
assert(rollEnemyDrop('trooper', seq([0.99])) === undefined, 'A failed drop-chance roll must yield no drop.');
assert(rollEnemyDrop('trooper', seq([0, 0])) === 'energyCell', 'A minimal roll should land on the most-weighted (energy) drop.');
assert(rollEnemyDrop('mech', seq([0, 0])) !== undefined, 'The always-dropping mech must return a pickup.');
const validDropTypes = new Set<string>(dropConfig.enemies.trooper.table.map((entry) => entry.type));
for (let i = 0; i < 24; i += 1) {
  const drop = rollEnemyDrop('trooper');
  assert(drop === undefined || validDropTypes.has(drop), 'Every trooper drop must be a configured pickup type.');
}

if (failures.length > 0) {
  for (const failure of failures) console.error(`[combat:test] ${failure}`);
  process.exitCode = 1;
} else {
  console.log(`[combat:test] ${combatConfig.combo.stages.length} combo stages and combat payload rules passed validation.`);
}
