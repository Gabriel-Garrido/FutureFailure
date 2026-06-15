import fs from 'node:fs/promises';
import path from 'node:path';
import { assetManifest } from '../src/assets/assetManifest';
import { enemySpriteConfig, humanoidScale, enemySpriteProfileFor, type EnemyType, type EnemyVisualRole } from '../src/data/enemySpriteConfig';
import { playerSpriteConfig } from '../src/data/playerSpriteConfig';
import { elementSprites } from '../src/data/elementSpriteConfig';
import { levelOne } from '../src/data/levelOne';
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

for (const playerAnimation of ['idle', 'run', 'jump', 'fall', 'land', 'attack', 'dash']) {
  assert(keys.includes(spriteAnimationKey('player', playerAnimation)), `Missing player animation: ${playerAnimation}.`);
}
const playerFall = definitions.find((definition) => definition.key === spriteAnimationKey('player', 'fall'));
const playerLand = definitions.find((definition) => definition.key === spriteAnimationKey('player', 'land'));
const playerDash = definitions.find((definition) => definition.key === spriteAnimationKey('player', 'dash'));
assert(playerFall?.frames.every((frame) => frame === 13) === true, 'Player fall animation must use the verified descending frame 13.');
assert(playerLand?.frames.every((frame) => frame === 14) === true, 'Player land animation must use the verified landing frame 14.');
assert(playerDash?.frames.join(',') === '10,11', 'Player dash animation must use non-attack airborne frames 10..11.');
assert(playerDash?.frames.every((frame) => frame < 15) === true, 'Player dash animation must not reuse sword-slash frames.');

const usedEnemyTypes = new Set<EnemyType>(levelOne.enemies.map((enemy) => enemy.type));
for (const type of usedEnemyTypes) {
  const profile = enemySpriteProfileFor(type);
  assert(Boolean(profile), `${type} must have an explicit enemy sprite profile.`);
  assert(assetManifest.some((asset) => asset.key === profile.textureKey), `${type} profile references missing texture ${profile.textureKey}.`);
  for (const role of ['idle', 'move', 'attack', 'hurt', 'death'] as EnemyVisualRole[]) {
    const spec = profile.animations[role];
    assert(Boolean(spec), `${type} must define ${role} sprite behavior.`);
    if (spec.frames.length >= 2) assert(keys.includes(spriteAnimationKey(profile.textureKey, role)), `Missing ${role} animation for ${type}.`);
    else assert(!keys.includes(spriteAnimationKey(profile.textureKey, role)), `${type} ${role} should stay static instead of registering a fake animation.`);
  }
}

const spriteAnimationSource = await fs.readFile(path.join(root, 'src/data/spriteAnimationConfig.ts'), 'utf8');
assert(!spriteAnimationSource.includes('combatantSheetAnimations'), 'Combatants must not be animated by a generic sheet-row generator.');
assert(!spriteAnimationSource.includes('rowFrames('), 'Combatants must not use generic row-based frame selection.');

const trooperDeath = enemySpriteConfig.trooper.animations.death.frames;
assert(trooperDeath.join(',') === '18,19,20,21,22,23', 'Trooper death must use verified damage/death frames 18..23.');
assert(!trooperDeath.some((frame) => frame >= 30 && frame <= 35), 'Trooper death must not use row 30..35.');

const droneDeath = enemySpriteConfig.drone.animations.death.frames;
assert(droneDeath.join(',') === '18,19,20,21,22,23', 'Drone death must use verified explosion frames 18..23.');
assert(!droneDeath.some((frame) => frame >= 30 && frame <= 35), 'Drone death must not use row 30..35.');

assert(enemySpriteConfig.mech.initialFrame === 0, 'Mech must start on frame 0.');
assert(enemySpriteConfig.mech.animations.death.frames.join(',') === '30,31,32,33,34,35', 'Mech death should use its actual collapse sequence.');
assert(enemySpriteConfig.trooper.scale === humanoidScale, 'Trooper scale must compensate for enemy/player frame size ratio to match protagonist visual height.');
assert(enemySpriteConfig.mech.scale === 0.5, 'Mech must keep its dedicated quadruped walker scale.');
assert(enemySpriteConfig.mech.animations.hurt.frames.join(',') === '24', 'Mech hurt must stay on the readable standing-damage frame.');
assert(enemySpriteConfig.boss.textureKey === enemySpriteConfig.mech.textureKey, 'Boss mech must reuse mech.png instead of a separate boss sheet.');
assert(enemySpriteConfig.boss.renderCrop === undefined, 'Boss mech must not crop the top edge when using the clean mech sheet.');
assert(enemySpriteConfig.boss.scale === enemySpriteConfig.mech.scale, 'Boss mech must inherit the mech base scale before size scaling.');
assert(enemySpriteConfig.boss.origin.y === enemySpriteConfig.mech.origin.y, 'Boss mech must keep the same vertical anchor as the base mech sheet.');
assert(enemySpriteConfig.boss.animations.attack.frames.join(',') === enemySpriteConfig.mech.animations.attack.frames.join(','), 'Boss mech must use the same verified firing row as mech.png.');
assert(enemySpriteConfig.boss.animations.hurt.frames.join(',') === '24', 'Boss hurt must stay on a stable damage frame instead of collapsing during stun.');

for (const role of ['idle', 'move', 'attack'] as EnemyVisualRole[]) {
  assert(enemySpriteConfig.scout.animations[role].frames.join(',') === '0', `Scout ${role} must stay on the selected bot-with-wheels frame.`);
}
for (const role of ['hurt', 'death'] as EnemyVisualRole[]) {
  assert(enemySpriteConfig.scout.animations[role].frames.join(',') === '24', `Scout ${role} must stay on the selected damaged bot frame.`);
}

const sentinelAllowedFrames = new Set([0, 1, 6, 7, 12, 13, 24, 25, 30, 31]);
const sentinelFrames = Object.values(enemySpriteConfig.sentinel.animations).flatMap((spec) => [...spec.frames]);
assert(sentinelFrames.every((frame) => sentinelAllowedFrames.has(frame)), 'Sentinel must not animate turret frames or unrelated variants.');

assert(!keys.includes(spriteAnimationKey('doors', 'portal-idle')), 'Portal must not animate doors 30..35 as a frame sequence.');
assert(!keys.some((key) => key.startsWith('hazards-')), 'Static hazard sprite animations must stay removed.');
assert(elementSprites.doors.portal.frame === 35, 'Portal must use the verified doors frame 35 as its base sprite.');

const preloadSource = await fs.readFile(path.join(root, 'src/scenes/PreloadScene.ts'), 'utf8');
assert(preloadSource.includes('spriteAnimationDefinitions'), 'PreloadScene must register sprite animations from the central config.');

const playerSource = await fs.readFile(path.join(root, 'src/entities/Player.ts'), 'utf8');
assert(playerSource.includes('landingPoseMs'), 'Player must expose a short landing pose state.');
assert(playerSource.includes("this.visual.play('player-land'"), 'Player must play the landing sprite when touching down.');
assert(playerSource.includes("this.visual.play('player-fall'"), 'Player must play the falling sprite while descending.');

const breakableSource = await fs.readFile(path.join(root, 'src/entities/BreakableObject.ts'), 'utf8');
assert(breakableSource.includes('resolveVisualSinkPx'), 'Breakables must define a sprite sink to avoid floating above platforms.');
assert(breakableSource.includes('bounds.y + bounds.height - bodyHeight - sinkUnits'), 'Breakable colliders must stay grounded while the visual sprite sinks into the surface.');
assert(breakableSource.includes('this.visualSinkPx'), 'Breakable fitting must use the configured sink amount for intact and damaged frames.');

const enemyBaseSource = await fs.readFile(path.join(root, 'src/entities/EnemyBase.ts'), 'utf8');
assert(enemyBaseSource.includes('playEnemyAnimation'), 'EnemyBase must drive enemy sprite animations.');
assert(enemyBaseSource.includes("playEnemyAnimation('death')"), 'EnemyBase must play a death animation before hiding defeated enemies.');
assert(enemyBaseSource.includes('spriteProfile.body'), 'EnemyBase must apply body sizing from enemySpriteConfig.');
assert(enemyBaseSource.includes('spriteProfile.scale'), 'EnemyBase must apply visual scale from enemySpriteConfig.');
assert(enemyBaseSource.includes('renderCrop'), 'EnemyBase must support per-profile sprite cropping for packed sheets.');

const mechSource = await fs.readFile(path.join(root, 'src/entities/MechEnemy.ts'), 'utf8');
assert(mechSource.includes('spriteFramePoint'), 'MechEnemy must derive cannon anchors from fixed sprite-frame coordinates.');
assert(!mechSource.includes('const bounds = this.getBounds()'), 'MechEnemy cannon anchors must not drift with animated bounds.');

assert(!await exists(path.join(root, 'src/entities/Hazard.ts')), 'Static Hazard entity must stay removed.');

const levelBuilderSource = await fs.readFile(path.join(root, 'src/systems/LevelBuilder.ts'), 'utf8');
assert(!levelBuilderSource.includes('portal-idle'), 'LevelBuilder must render the portal procedurally instead of using portal-idle frames.');
assert(levelBuilderSource.includes('portalVisualRect'), 'LevelBuilder must separate portal visual sizing from the overlap zone.');
assert(levelBuilderSource.includes('enemySpriteProfileFor'), 'LevelBuilder must instantiate enemies from enemySpriteConfig profiles.');
assert(!levelBuilderSource.includes('elementSprites.enemies'), 'LevelBuilder must not select enemy frames from elementSprites.');

if (failures.length > 0) {
  for (const failure of failures) console.error(`[sprites:test] ${failure}`);
  process.exitCode = 1;
} else {
  console.log(`[sprites:test] ${definitions.length} sprite animations passed validation.`);
}
