import fs from 'node:fs';
import path from 'node:path';
import { frameBoundsFor } from '../src/data/assetMap';
import { frameFor } from '../src/data/assetMap';
import { assetManifest } from '../src/assets/assetManifest';
import { elementSprites, portalVisualRect } from '../src/data/elementSpriteConfig';
import { dropConfig } from '../src/data/dropConfig';
import { levelDesignConfig } from '../src/data/levelDesignConfig';
import { levelOne } from '../src/data/levelOne';
import { type FlowBeatData, type LevelGraphEdgeData, type RectData } from '../src/data/levelTypes';

const failures: string[] = [];

function assert(condition: boolean, message: string): void {
  if (!condition) failures.push(message);
}

function rectKey(rect: RectData): string {
  return `${rect.x},${rect.y},${rect.width},${rect.height}`;
}

function contains(outer: RectData, inner: RectData, tolerance = 0): boolean {
  return outer.x <= inner.x + tolerance
    && outer.y <= inner.y + tolerance
    && outer.x + outer.width >= inner.x + inner.width - tolerance
    && outer.y + outer.height >= inner.y + inner.height - tolerance;
}

function insideWorld(rect: RectData): boolean {
  return rect.x >= 0
    && rect.y >= 0
    && rect.x + rect.width <= levelOne.width
    && rect.y + rect.height <= levelOne.height;
}

function byId<T extends { id?: string }>(items: T[], id: string): T {
  const item = items.find((entry) => entry.id === id);
  if (!item) throw new Error(`Missing level item: ${id}`);
  return item;
}

function beatWidth(beat: FlowBeatData): number {
  return beat.endX - beat.startX;
}

function graphHasPath(startNodeId: string, exitNodeId: string, edges: LevelGraphEdgeData[]): boolean {
  const queue = [startNodeId];
  const visited = new Set<string>();
  while (queue.length > 0) {
    const nodeId = queue.shift()!;
    if (nodeId === exitNodeId) return true;
    if (visited.has(nodeId)) continue;
    visited.add(nodeId);
    for (const edge of edges) {
      if (edge.from === nodeId && !visited.has(edge.to)) queue.push(edge.to);
    }
  }
  return false;
}

const destructibleBounds = frameBoundsFor.destructibles as Record<number, unknown>;
const tileBounds = frameBoundsFor.tiles as Record<number, unknown>;

const ids = new Set<string>();
for (const item of [
  levelOne.cameraBounds,
  levelOne.playerSpawn,
  levelOne.finalPortal,
  ...levelOne.zones,
  ...levelOne.walls,
  ...levelOne.platforms,
  ...levelOne.decorations,
  ...levelOne.pickups,
  ...levelOne.destructibles,
  ...levelOne.enemies,
  ...levelOne.terminals,
  ...levelOne.triggers,
  ...levelOne.tutorialPrompts,
  ...levelOne.design.signposts,
]) {
  assert(Boolean(item.id), `Level item is missing id: ${JSON.stringify(item)}`);
  if (!item.id) continue;
  assert(!ids.has(item.id), `Duplicated level id: ${item.id}`);
  ids.add(item.id);
}
for (const destructible of levelOne.destructibles) {
  if (!destructible.drop) continue;
  assert(Boolean(destructible.drop.id), `${destructible.id} drop is missing an id.`);
  assert(!ids.has(destructible.drop.id), `Duplicated level id: ${destructible.drop.id}`);
  ids.add(destructible.drop.id);
}

assert(levelOne.metadata.name.includes('Future Failure'), 'Level metadata must use the Future Failure name.');
assert(
  levelOne.width >= levelDesignConfig.traversal.minLevelOneWidth
    && levelOne.width <= levelDesignConfig.traversal.maxLevelOneWidth,
  `Level one width should stay between ${levelDesignConfig.traversal.minLevelOneWidth} and ${levelDesignConfig.traversal.maxLevelOneWidth}px.`,
);
assert(levelOne.finalPortal.x > levelOne.width - 220, 'Exit portal must be clearly placed at the right edge.');
const levelBackground = assetManifest.find((entry) => entry.key === levelOne.backgroundKey);
assert(Boolean(levelBackground), 'Level one must reference an existing background asset.');
assert(levelBackground?.category === 'background' && levelBackground.loadType === 'image', 'Level one background must be an image background asset.');

const ceiling = byId(levelOne.walls, 'wall-ceiling');
assert(ceiling.x === 0 && ceiling.y === 0 && ceiling.width >= levelOne.width, 'Level must have a full ceiling wall.');

for (const rect of [...levelOne.walls, ...levelOne.platforms, levelOne.finalPortal]) {
  assert(insideWorld(rect), `${rect.id ?? 'rect'} is outside level bounds.`);
}

assert(elementSprites.doors.portal.frame === 35, 'Final portal must use only the verified doors frame 35.');
const finalPortalVisual = portalVisualRect(levelOne.finalPortal);
assert(insideWorld(finalPortalVisual), 'Final portal visual must stay inside the level bounds.');
const rightWall = byId(levelOne.walls, 'wall-right-bound');
assert(levelOne.finalPortal.x + levelOne.finalPortal.width <= rightWall.x, 'Final portal overlap zone must not intersect the right wall.');
const levelBuilderSource = fs.readFileSync(path.join(process.cwd(), 'src/systems/LevelBuilder.ts'), 'utf8');
const levelSceneSource = fs.readFileSync(path.join(process.cwd(), 'src/scenes/LevelOneScene.ts'), 'utf8');
const levelOneSource = fs.readFileSync(path.join(process.cwd(), 'src/data/levelOne.ts'), 'utf8');
const levelTypesSource = fs.readFileSync(path.join(process.cwd(), 'src/data/levelTypes.ts'), 'utf8');
const touchControlsSource = fs.readFileSync(path.join(process.cwd(), 'src/ui/TouchControls.ts'), 'utf8');
assert(!levelBuilderSource.includes('portal-idle'), 'Final portal must not use the invalid doors 30..35 frame animation.');
assert(!levelSceneSource.includes('collider(this.player, this.level.finalPortal'), 'Final portal must not be connected as a solid collider.');
assert(levelSceneSource.includes('overlap(this.player, this.level.finalPortal'), 'Final portal should remain an overlap-only exit zone.');
assert(!fs.existsSync(path.join(process.cwd(), 'src/entities/Door.ts')), 'Door entity must stay removed.');
assert(!levelBuilderSource.includes('../entities/Door'), 'LevelBuilder must not import or instantiate Door.');
assert(!levelSceneSource.includes('nearbyDoor') && !levelSceneSource.includes('isDoorRequirementMet'), 'LevelOneScene must not keep door interaction state.');
assert(!levelTypesSource.includes('DoorData') && !levelTypesSource.includes('doors:'), 'Level types must not expose door data.');
assert(!levelOneSource.includes('doors: [') && !levelOneSource.includes('gateId:'), 'LevelOne must not define door objects or door gate references.');
assert(!fs.existsSync(path.join(process.cwd(), 'src/entities/Checkpoint.ts')), 'Checkpoint entity must stay removed.');
assert(!levelBuilderSource.includes('../entities/Checkpoint'), 'LevelBuilder must not import or instantiate Checkpoint.');
assert(!levelSceneSource.includes('activateCheckpoint') && !levelSceneSource.includes('level.checkpoints'), 'LevelOneScene must not keep checkpoint activation state.');
assert(!levelTypesSource.includes('CheckpointData') && !levelTypesSource.includes('checkpoints:'), 'Level types must not expose checkpoint data.');
assert(!levelOneSource.includes('checkpoints: [') && !levelOneSource.includes('checkpointId:'), 'LevelOne must not define checkpoint objects or checkpoint beat references.');
assert(!fs.existsSync(path.join(process.cwd(), 'src/entities/Hazard.ts')), 'Static Hazard entity must stay removed.');
assert(!levelBuilderSource.includes('../entities/Hazard'), 'LevelBuilder must not import or instantiate Hazard.');
assert(!levelSceneSource.includes('hazardDamagePayload') && !levelSceneSource.includes('level.hazards'), 'LevelOneScene must not keep static hazard damage state.');
assert(!levelTypesSource.includes('HazardData') && !levelTypesSource.includes('hazards:'), 'Level types must not expose static hazard data.');
assert(!levelOneSource.includes('hazards: [') && !levelOneSource.includes('hazardTiming'), 'LevelOne must not define static damage hazards or hazard timing tests.');
const spriteFitSource = fs.readFileSync(path.join(process.cwd(), 'src/systems/spriteFit.ts'), 'utf8');
assert(spriteFitSource.includes('setCrop'), 'Sprite fitting must clip every element to its measured opaque bounds to prevent packed-sheet edge bleed.');
assert(spriteFitSource.includes('cropToOpaqueBounds'), 'Edge-bleed cropping must be a reusable helper so all element renderers share it.');

const solidVisualKeys = new Set(levelOne.visualTiles.filter((tile) => tile.category === 'tiles').map(rectKey));
const solidVisuals = new Map(levelOne.visualTiles.filter((tile) => tile.category === 'tiles').map((tile) => [rectKey(tile), tile]));
for (const rect of [...levelOne.walls, ...levelOne.platforms]) {
  assert(solidVisualKeys.has(rectKey(rect)), `${rect.id ?? rectKey(rect)} has collider but no matching tile visual.`);
  const visual = solidVisuals.get(rectKey(rect));
  if (!visual) continue;
  assert(visual.frame !== undefined && Boolean(tileBounds[visual.frame]), `${rect.id ?? rectKey(rect)} uses a platform frame without measured opaque bounds.`);
  if (rect.width > rect.height * 4) {
    assert(visual.frame !== frameFor.wall, `${rect.id ?? rectKey(rect)} is horizontal but uses a vertical wall sprite.`);
  }
  if (rect.height > rect.width * 3) {
    assert(visual.frame === frameFor.wall, `${rect.id ?? rectKey(rect)} is vertical but does not use a wall sprite.`);
  }
}

for (const decoration of levelOne.decorations) {
  assert(decoration.isFunctional === false, `${decoration.id} decoration must stay non-functional.`);
  assert(decoration.category !== 'tiles', `${decoration.id} decoration should not use platform tile category.`);
}

for (const destructible of levelOne.destructibles) {
  assert(Boolean(destructibleBounds[destructible.frame]), `${destructible.id} uses a destructible frame without measured opaque bounds.`);
  assert(destructible.health > 0, `${destructible.id} must have positive health.`);
  if (destructible.drop) {
    assert([3, 5].includes(destructible.health), `${destructible.id} contains an item and must take 3 or 5 hits to open.`);
    assert(Boolean(destructible.damagedFrame) && Boolean(destructible.destroyedFrame) && Boolean(destructible.debrisFrame), `${destructible.id} must define damaged, destroyed and debris frames.`);
    for (const frame of [destructible.damagedFrame, destructible.destroyedFrame, destructible.debrisFrame]) {
      assert(Boolean(destructibleBounds[frame ?? -1]), `${destructible.id} destruction frame ${frame} has no measured opaque bounds.`);
    }
    const riseY = destructible.drop.riseY ?? 46;
    const targetY = destructible.y + destructible.height / 2 + (destructible.drop.offsetY ?? 0) - riseY;
    assert(riseY >= 24 && riseY <= 80, `${destructible.id} drop rise should stay readable and short.`);
    assert(targetY >= 80 && targetY <= levelOne.height - 80, `${destructible.id} drop target is outside safe world bounds.`);
  } else {
    assert(destructible.health === 1, `${destructible.id} is empty and should remain a quick 1-hit object.`);
  }
}
const destructibleDrops = levelOne.destructibles.flatMap((destructible) => destructible.drop ? [destructible.drop] : []);
const emptyBreakables = levelOne.destructibles.filter((destructible) => !destructible.drop);
const healthBreakables = destructibleDrops.filter((drop) => drop.type === 'healthSmall' || drop.type === 'healthLarge');
const energyBreakables = destructibleDrops.filter((drop) => drop.type === 'energyCell');
assert(levelOne.destructibles.length >= levelDesignConfig.resources.minBreakables, `LevelOne must include at least ${levelDesignConfig.resources.minBreakables} breakable boxes.`);
assert(healthBreakables.length >= levelDesignConfig.resources.minHealthBreakables, `LevelOne must include at least ${levelDesignConfig.resources.minHealthBreakables} health boxes.`);
assert(energyBreakables.length >= levelDesignConfig.resources.minEnergyBreakables, `LevelOne must include at least ${levelDesignConfig.resources.minEnergyBreakables} energy boxes.`);
assert(destructibleDrops.some((drop) => drop.type === 'healthSmall' || drop.type === 'healthLarge'), 'LevelOne must place health rewards inside breakable boxes.');
assert(destructibleDrops.some((drop) => drop.type === 'energyCell'), 'LevelOne must place energy rewards inside breakable boxes.');
assert(destructibleDrops.every((drop) => !['upgradeChip', 'dataShard'].includes(String(drop.type))), 'Energy rewards must use only the canonical energyCell pickup.');
assert(emptyBreakables.length >= 3, 'LevelOne should include several empty breakable boxes.');
assert(levelOne.pickups.every((pickup) => pickup.type === 'keycard'), 'LevelOne resource pickups should be hidden inside breakables; only key items stay loose.');
const pickupSource = fs.readFileSync(path.join(process.cwd(), 'src/entities/Pickup.ts'), 'utf8');
assert(pickupSource.includes('revealFromBreakable'), 'Pickup must expose a breakable reveal animation.');
assert(pickupSource.includes('durationMs = 500'), 'Breakable pickup reveal should default to 0.5 seconds.');
assert(pickupSource.includes("this.pickupType === 'energyCell'") && !pickupSource.includes("this.pickupType === 'upgradeChip'"), 'Only energyCell should grant energy to the player.');
const breakableSource = fs.readFileSync(path.join(process.cwd(), 'src/entities/BreakableObject.ts'), 'utf8');
assert(breakableSource.includes('spawnHitSparks'), 'Breakables must create a visible hit effect.');
assert(breakableSource.includes('playBreakAnimation'), 'Breakables must animate through destruction frames.');
assert(breakableSource.includes('body.enable = false') && !breakableSource.includes('disableBody(true, true)'), 'Destroyed breakables must remain visible as debris without collision.');
assert(dropConfig.revealDurationMs === 500, 'Drop reveal duration must be the requested 0.5s jump.');
assert(pickupSource.includes('!this.collectible'), 'Pickup collection must be blocked while the reveal animation is active.');
assert(levelSceneSource.includes('spawnBreakableDrop'), 'LevelOneScene must spawn drops from broken breakables.');
assert(levelSceneSource.includes('spawnEnemyDrop'), 'LevelOneScene must spawn drops from defeated enemies.');
assert(levelSceneSource.includes('revealFromBreakable(targetY, dropConfig.revealDurationMs'), 'Drops must use the shared 0.5s reveal duration.');

const movementTrigger = byId(levelOne.triggers, 'trigger-movement-complete');
assert(movementTrigger.x >= 780 && movementTrigger.x <= 920, 'Movement objective trigger should remain at the end of the first movement lesson.');

const firstTrooper = byId(levelOne.enemies, 'enemy-security-trooper');
assert(firstTrooper.x > movementTrigger.x, 'First combat target should remain after the movement lesson.');

const keycard = byId(levelOne.pickups, 'pickup-reactor-keycard');
assert(keycard.x < levelOne.finalPortal.x, 'Keycard pickup must appear before the final exit.');

const arenaEnemies = levelOne.enemies.filter((enemy) => enemy.zone === 'arena');
assert(arenaEnemies.length >= 2, 'Final arena should have at least two enemies.');
for (const enemy of arenaEnemies) {
  assert(enemy.x > keycard.x, `${enemy.id} must be after the keycard pickup.`);
}
const bossEnemy = byId(levelOne.enemies, 'enemy-boss-core');
assert(bossEnemy.type === 'boss', 'LevelOne must keep the final boss enemy present.');
assert(bossEnemy.zone === 'boss', 'Final boss must spawn in the boss zone.');
assert(bossEnemy.x >= 9200 && bossEnemy.x <= 10000, 'Final boss must spawn inside the readable boss fight beat.');
assert(bossEnemy.y >= 900 && bossEnemy.y <= 980, 'Final boss must spawn grounded and visible above the boss arena floor.');

const markerXs = levelOne.mapMarkers.map((marker) => marker.x);
const sortedMarkerXs = [...markerXs].sort((a, b) => a - b);
assert(markerXs.every((x, index) => x === sortedMarkerXs[index]), 'Map markers must be sorted from left to right.');

assert(levelOne.design.criticalPath.length >= levelDesignConfig.flow.minCriticalBeats, 'Level design must define enough critical path beats.');
assert(levelOne.design.optionalRoutes.length >= levelDesignConfig.flow.minOptionalRoutes, 'Level design must define at least one optional route.');
assert(levelOne.design.signposts.length >= levelDesignConfig.flow.minSignposts, 'Level design must define enough world signposts.');
assert(levelOne.design.landmarks.length >= levelDesignConfig.readability.minLandmarks, 'Level design must define enough landmarks for orientation.');

const zoneIds = new Set(levelOne.zones.map((entry) => entry.zone));
const beatIds = new Set<string>();
const allObjectIds = new Set(ids);
const rewardIds = new Set([
  ...levelOne.pickups.map((entry) => entry.id),
  ...levelOne.destructibles.map((entry) => entry.id),
]);
let previousBeatStart = -Infinity;
let previousIntensity: number | undefined;
let consecutiveHighIntensity = 0;
const taughtMechanics = new Set<string>();
const paces = new Set<string>();
for (const beat of levelOne.design.criticalPath) {
  assert(!beatIds.has(beat.id), `Duplicated flow beat id: ${beat.id}`);
  beatIds.add(beat.id);
  paces.add(beat.pace);
  assert(zoneIds.has(beat.zone), `${beat.id} references an unknown zone: ${beat.zone}`);
  assert(beat.startX >= 0 && beat.endX <= levelOne.width && beat.startX < beat.endX, `${beat.id} has invalid world range.`);
  assert(beat.startX >= previousBeatStart, `${beat.id} is out of critical path order.`);
  previousBeatStart = beat.startX;
  assert(beat.targetIntensity >= 1 && beat.targetIntensity <= 5, `${beat.id} target intensity must be between 1 and 5.`);
  if (previousIntensity !== undefined) {
    assert(Math.abs(beat.targetIntensity - previousIntensity) <= levelDesignConfig.pacing.maxIntensityJump, `${beat.id} changes intensity too abruptly.`);
  }
  previousIntensity = beat.targetIntensity;
  consecutiveHighIntensity = beat.targetIntensity >= 4 ? consecutiveHighIntensity + 1 : 0;
  assert(consecutiveHighIntensity <= levelDesignConfig.pacing.maxConsecutiveHighIntensityBeats, `${beat.id} creates too many high-intensity beats in a row.`);
  assert(beatWidth(beat) <= levelDesignConfig.flow.maxBeatWidth, `${beat.id} is too wide; split it into smaller readable beats.`);
  assert((beat.teaches?.length ?? 0) + (beat.tests?.length ?? 0) > 0, `${beat.id} must teach or test at least one mechanic.`);
  for (const mechanic of [...beat.teaches ?? [], ...beat.tests ?? []]) taughtMechanics.add(mechanic);
  for (const rewardId of beat.rewardIds ?? []) assert(rewardIds.has(rewardId), `${beat.id} references missing reward ${rewardId}.`);
  if (beat.risk === 'high') assert(beat.pace === 'synthesis', `${beat.id} high-risk beats should be reserved for synthesis sections without checkpoints.`);
}

for (const mechanic of levelDesignConfig.readability.requiredMechanics) {
  assert(taughtMechanics.has(mechanic), `Critical path does not teach or test mechanic: ${mechanic}.`);
}

for (const pace of levelDesignConfig.pacing.requiredPaces) {
  assert(paces.has(pace), `Critical path is missing pacing beat: ${pace}.`);
}

for (const route of levelOne.design.optionalRoutes) {
  assert(beatIds.has(route.fromBeatId), `${route.id} references missing fromBeatId ${route.fromBeatId}.`);
  assert(beatIds.has(route.toBeatId), `${route.id} references missing toBeatId ${route.toBeatId}.`);
  assert(route.rewardIds.length > 0, `${route.id} must define a reward.`);
  for (const rewardId of route.rewardIds) assert(rewardIds.has(rewardId), `${route.id} references missing reward ${rewardId}.`);
}

const graph = levelOne.design.graph;
assert(graph.nodes.length >= levelDesignConfig.flow.minGraphNodes, 'Level graph must define enough navigation nodes.');
assert(graph.edges.length >= levelDesignConfig.flow.minGraphEdges, 'Level graph must define enough navigation edges.');
const graphNodeIds = new Set<string>();
const graphEdgeIds = new Set<string>();
const representedBeatIds = new Set<string>();
const outDegree = new Map<string, number>();

for (const node of graph.nodes) {
  assert(!graphNodeIds.has(node.id), `Duplicated graph node id: ${node.id}`);
  graphNodeIds.add(node.id);
  representedBeatIds.add(node.beatId);
  assert(beatIds.has(node.beatId), `${node.id} references missing beat ${node.beatId}.`);
  assert(node.x >= 0 && node.x <= levelOne.width, `${node.id} is outside level width.`);
  if (node.landmarkId) assert(allObjectIds.has(node.landmarkId), `${node.id} references missing landmark ${node.landmarkId}.`);
}

assert(graphNodeIds.has(graph.startNodeId), 'Level graph startNodeId is missing.');
assert(graphNodeIds.has(graph.exitNodeId), 'Level graph exitNodeId is missing.');
for (const beat of levelOne.design.criticalPath) {
  assert(representedBeatIds.has(beat.id), `${beat.id} is not represented in the navigation graph.`);
}

for (const edge of graph.edges) {
  assert(!graphEdgeIds.has(edge.id), `Duplicated graph edge id: ${edge.id}`);
  graphEdgeIds.add(edge.id);
  assert(graphNodeIds.has(edge.from), `${edge.id} references missing from node ${edge.from}.`);
  assert(graphNodeIds.has(edge.to), `${edge.id} references missing to node ${edge.to}.`);
  outDegree.set(edge.from, (outDegree.get(edge.from) ?? 0) + 1);
  for (const rewardId of edge.rewardIds ?? []) assert(rewardIds.has(rewardId), `${edge.id} references missing reward ${rewardId}.`);
  if (edge.kind === 'optional' || edge.kind === 'reward') {
    assert((edge.rewardIds?.length ?? 0) > 0, `${edge.id} optional/reward edge must define rewardIds.`);
  }
}

const branchingNodes = [...outDegree.values()].filter((degree) => degree > 1).length;
const shortcutEdges = graph.edges.filter((edge) => edge.kind === 'shortcut').length;
assert(branchingNodes >= levelDesignConfig.flow.minBranchingNodes, 'Level graph must contain real player choice/branching nodes.');
assert(shortcutEdges >= levelDesignConfig.flow.minShortcutEdges, 'Level graph must contain at least one shortcut edge.');
assert(graphHasPath(graph.startNodeId, graph.exitNodeId, graph.edges), 'Level graph must have a valid route from start to exit.');

for (const route of levelOne.design.optionalRoutes) {
  const routeHasGraphReward = graph.edges.some((edge) => edge.kind !== 'critical' && route.rewardIds.some((rewardId) => edge.rewardIds?.includes(rewardId)));
  assert(routeHasGraphReward, `${route.id} is not represented by a non-critical graph edge.`);
}

for (const signpost of levelOne.design.signposts) {
  assert(signpost.isFunctional === false, `${signpost.id} signpost must be non-functional.`);
  assert(insideWorld(signpost), `${signpost.id} signpost is outside level bounds.`);
  assert(zoneIds.has(signpost.zone ?? ''), `${signpost.id} references an unknown zone.`);
  assert(signpost.width > 0 && signpost.height > 0, `${signpost.id} must have positive dimensions.`);
}

const signpostRoles = new Set(levelOne.design.signposts.map((signpost) => signpost.role));
for (const role of levelDesignConfig.readability.requiredSignpostRoles) {
  assert(signpostRoles.has(role), `Level is missing signpost role: ${role}.`);
}

for (const landmarkId of levelOne.design.landmarks) {
  assert(allObjectIds.has(landmarkId), `Design landmark references missing id: ${landmarkId}.`);
}

for (const platform of levelOne.platforms) {
  if (platform.height < 70 && platform.width > 120) {
    assert(platform.width >= levelDesignConfig.traversal.minLandingWidth, `${platform.id} is too narrow for a readable landing platform.`);
  }
}

// Foreground gameplay elements must not visually punch through one another.
// Resting/standing contacts (<= OVERLAP_TOLERANCE px on an axis) are allowed, as
// are background decorations (they render behind terrain and are always occluded).
const OVERLAP_TOLERANCE = 4;
type FootBox = { id: string; kind: string; x: number; y: number; w: number; h: number };

function bothAxesOverlap(a: FootBox, b: FootBox): boolean {
  const dx = Math.min(a.x + a.w, b.x + b.w) - Math.max(a.x, b.x);
  const dy = Math.min(a.y + a.h, b.y + b.h) - Math.max(a.y, b.y);
  return dx > OVERLAP_TOLERANCE && dy > OVERLAP_TOLERANCE;
}

const breakableBoxes: FootBox[] = levelOne.destructibles.map((d) => ({ id: d.id, kind: 'breakable', x: d.x, y: d.y, w: d.width, h: d.height }));
const terminalBoxes: FootBox[] = levelOne.terminals.map((t) => ({ id: t.id, kind: 'terminal', x: t.x - 42, y: t.y - 102, w: 84, h: 96 }));

// Breakables must stand clear of terminals and each other.
const breakableBlockers = [...breakableBoxes, ...terminalBoxes];
for (let i = 0; i < breakableBoxes.length; i += 1) {
  for (const other of breakableBlockers) {
    if (breakableBoxes[i].id === other.id) continue;
    assert(!bothAxesOverlap(breakableBoxes[i], other), `${breakableBoxes[i].id} overlaps ${other.kind} ${other.id}.`);
  }
}
const arenaZone = byId(levelOne.zones, 'zone-arena');
assert(arenaZone.width >= levelDesignConfig.traversal.minArenaWidth, 'Final arena must provide enough width for readable enemy states.');
const sortedArenaEnemies = levelOne.enemies.filter((enemy) => enemy.zone === 'arena').sort((a, b) => a.x - b.x);
assert(sortedArenaEnemies.length <= levelDesignConfig.traversal.maxArenaEnemies, `Arena should not exceed ${levelDesignConfig.traversal.maxArenaEnemies} enemies.`);
for (let i = 1; i < sortedArenaEnemies.length; i += 1) {
  assert(sortedArenaEnemies[i].x - sortedArenaEnemies[i - 1].x >= levelDesignConfig.traversal.minArenaEnemySpacing, 'Arena enemies need enough horizontal spacing.');
}

const nonArenaEnemies = levelOne.enemies.filter((enemy) => enemy.zone !== 'arena').sort((a, b) => a.x - b.x);
for (let i = 0; i < nonArenaEnemies.length; i += 1) {
  const cluster = nonArenaEnemies.filter((enemy) => enemy.x >= nonArenaEnemies[i].x && enemy.x <= nonArenaEnemies[i].x + levelDesignConfig.traversal.enemyClusterWindow);
  assert(cluster.length <= levelDesignConfig.traversal.maxEnemiesPerClusterWindow, `Enemy cluster near x=${nonArenaEnemies[i].x} has ${cluster.length} enemies.`);
}

const highOneWayPlatforms = levelOne.platforms.filter((platformData) => platformData.collision === 'oneWay' && platformData.y < 760);
assert(highOneWayPlatforms.length >= levelDesignConfig.traversal.minHighOneWayPlatforms, `LevelOne should include at least ${levelDesignConfig.traversal.minHighOneWayPlatforms} high one-way platforms.`);
assert(touchControlsSource.includes('GAME_HEIGHT - 218'), 'Touch toggle should sit away from the minimap area.');
assert(!touchControlsSource.includes('GAME_WIDTH - 82, 118'), 'Touch toggle must not overlap the minimap at the old top-right position.');

if (failures.length > 0) {
  for (const failure of failures) console.error(`[level:test] ${failure}`);
  process.exitCode = 1;
} else {
  console.log(`[level:test] ${ids.size} level items passed validation.`);
}
