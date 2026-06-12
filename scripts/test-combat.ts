import fs from 'node:fs/promises';
import path from 'node:path';
import { combatConfig } from '../src/data/combatConfig';
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
assert(combatConfig.projectile.enemy.knockback.enabled === false, 'Enemy projectiles must not apply knockback.');
assert(combatConfig.projectile.enemy.hitstop.durationMs === 0 && combatConfig.projectile.enemy.hitstop.timeScale === 1, 'Enemy projectiles must not use global hitstop.');
assert(combatConfig.projectile.enemy.reaction.mode === 'stagger', 'Enemy projectiles must use local stagger feedback.');
assert(combatConfig.projectile.enemy.reaction.allowGlobalHitstop === false, 'Enemy projectile reaction must explicitly block global hitstop.');
assert(combatConfig.projectile.enemy.reaction.maxRetainedVelocityX <= 100, 'Enemy projectile damage must not preserve dash-speed movement.');
assert(combatConfig.playerDamage.contact.invulnerabilityMs > 0, 'Enemy contact damage must grant invulnerability.');
assert(combatConfig.playerDamage.contact.reaction.mode === 'knockback', 'Enemy contact damage should keep knockback reaction.');
assert(combatConfig.playerDamage.hazard.reaction.mode === 'knockback', 'Hazards should keep knockback reaction.');
assert(combatConfig.hitRules.hitstopAlwaysResetsToOne, 'Combat config must preserve hitstop reset rule.');
assert(combatConfig.hitRules.enemyProjectilesUseGlobalHitstop === false, 'Enemy projectile hitstop rule must stay disabled.');
assert(combatConfig.hitRules.enemyProjectileDamageIsIdempotent, 'Enemy projectile damage must be idempotent.');
assert(combatConfig.hitRules.enemyProjectileDamagePreservesPlayerPosition, 'Enemy projectile damage must preserve player position.');

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

const projectileSource = await fs.readFile(path.join(root, 'src/entities/Projectile.ts'), 'utf8');
assert(projectileSource.includes('hitId'), 'Projectile must expose hitId for damage idempotency.');
assert(projectileSource.includes('consumeImpact'), 'Projectile must prevent duplicate impact resolution.');

const playerSource = await fs.readFile(path.join(root, 'src/entities/Player.ts'), 'utf8');
assert(playerSource.includes('recentDamageIds'), 'Player must remember recent damage ids.');
assert(!playerSource.includes('this.setPosition('), 'Player damage flow should not reposition the hero body.');

const movementSource = await fs.readFile(path.join(root, 'src/systems/MovementController.ts'), 'utf8');
assert(movementSource.includes('applyRetainedDamageVelocity'), 'MovementController must support retained-velocity damage reactions.');

if (failures.length > 0) {
  for (const failure of failures) console.error(`[combat:test] ${failure}`);
  process.exitCode = 1;
} else {
  console.log(`[combat:test] ${combatConfig.combo.stages.length} combo stages and combat payload rules passed validation.`);
}
