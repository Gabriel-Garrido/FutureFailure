import fs from 'node:fs/promises';
import path from 'node:path';
import { assetManifest } from '../src/assets/assetManifest';
import { elementSprites } from '../src/data/elementSpriteConfig';
import { spriteAnimationDefinitions, spriteAnimationKey } from '../src/data/spriteAnimationConfig';

const root = process.cwd();
const failures: string[] = [];

function assert(condition: boolean, message: string): void {
  if (!condition) failures.push(message);
}

async function exists(filePath: string): Promise<boolean> {
  try {
    await fs.access(filePath);
    return true;
  } catch {
    return false;
  }
}

const definitions = spriteAnimationDefinitions();
const keys = definitions.map((definition) => definition.key);
assert(new Set(keys).size === keys.length, 'Sprite animation keys must be unique.');

for (const definition of definitions) {
  assert(definition.frames.length >= 2, `${definition.key} must include at least two frames.`);
  assert(definition.frameRate > 0, `${definition.key} must use a positive frame rate.`);
  assert(assetManifest.some((asset) => asset.key === definition.textureKey), `${definition.key} references missing texture ${definition.textureKey}.`);
}

for (const playerAnimation of ['idle', 'run', 'jump', 'fall', 'attack', 'dash']) {
  assert(keys.includes(spriteAnimationKey('player', playerAnimation)), `Missing player animation: ${playerAnimation}.`);
}

for (const enemyKey of ['trooper', 'drone', 'mech']) {
  for (const role of ['idle', 'move', 'attack', 'hurt', 'death']) {
    assert(keys.includes(spriteAnimationKey(enemyKey, role)), `Missing ${role} animation for ${enemyKey}.`);
  }
}

const combatantSheets = assetManifest.filter((asset) => (asset.category === 'enemy' || asset.category === 'boss') && asset.loadType === 'spritesheet');
for (const asset of combatantSheets) {
  for (const role of ['idle', 'move', 'attack', 'hurt', 'death']) {
    assert(keys.includes(spriteAnimationKey(asset.key, role)), `${asset.key} is missing ${role} animation.`);
  }
}

assert(!keys.includes(spriteAnimationKey('doors', 'portal-idle')), 'Portal must not animate doors 30..35 as a frame sequence.');
assert(!keys.some((key) => key.startsWith('hazards-')), 'Static hazard sprite animations must stay removed.');
assert(elementSprites.doors.portal.frame === 35, 'Portal must use the verified doors frame 35 as its base sprite.');

const preloadSource = await fs.readFile(path.join(root, 'src/scenes/PreloadScene.ts'), 'utf8');
assert(preloadSource.includes('spriteAnimationDefinitions'), 'PreloadScene must register sprite animations from the central config.');

const enemyBaseSource = await fs.readFile(path.join(root, 'src/entities/EnemyBase.ts'), 'utf8');
assert(enemyBaseSource.includes('playEnemyAnimation'), 'EnemyBase must drive enemy sprite animations.');
assert(enemyBaseSource.includes("playEnemyAnimation('death')"), 'EnemyBase must play a death animation before hiding defeated enemies.');

assert(!await exists(path.join(root, 'src/entities/Hazard.ts')), 'Static Hazard entity must stay removed.');

const levelBuilderSource = await fs.readFile(path.join(root, 'src/systems/LevelBuilder.ts'), 'utf8');
assert(!levelBuilderSource.includes('portal-idle'), 'LevelBuilder must render the portal procedurally instead of using portal-idle frames.');
assert(levelBuilderSource.includes('portalVisualRect'), 'LevelBuilder must separate portal visual sizing from the overlap zone.');

if (failures.length > 0) {
  for (const failure of failures) console.error(`[sprites:test] ${failure}`);
  process.exitCode = 1;
} else {
  console.log(`[sprites:test] ${definitions.length} sprite animations passed validation.`);
}
