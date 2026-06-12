import { frameBoundsFor } from '../src/data/assetMap';
import { frameFor } from '../src/data/assetMap';
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

function rectCenterX(rect: RectData): number {
  return rect.x + rect.width / 2;
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

const hazardBounds = frameBoundsFor.hazards as Record<number, unknown>;
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
  ...levelOne.hazards,
  ...levelOne.pickups,
  ...levelOne.destructibles,
  ...levelOne.enemies,
  ...levelOne.doors,
  ...levelOne.checkpoints,
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

assert(levelOne.metadata.name.includes('Future Failure'), 'Level metadata must use the Future Failure name.');
assert(levelOne.width >= 5200, 'Level one should have enough horizontal room for tutorial, reactor and arena.');
assert(levelOne.finalPortal.x > levelOne.width - 220, 'Exit portal must be clearly placed at the right edge.');

const ceiling = byId(levelOne.walls, 'wall-ceiling');
assert(ceiling.x === 0 && ceiling.y === 0 && ceiling.width >= levelOne.width, 'Level must have a full ceiling wall.');

for (const rect of [...levelOne.walls, ...levelOne.platforms, levelOne.finalPortal]) {
  assert(insideWorld(rect), `${rect.id ?? 'rect'} is outside level bounds.`);
}

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

for (const hazard of levelOne.hazards) {
  assert(Boolean(hazard.visual), `${hazard.id} must define a visual rect separate from the damage collider.`);
  if (hazard.visual) assert(contains(hazard.visual, hazard, 8), `${hazard.id} damage collider must fit inside its sprite visual.`);
  assert(hazard.frame !== undefined, `${hazard.id} must choose an explicit hazard sprite frame.`);
  assert(Boolean(hazardBounds[hazard.frame ?? -1]), `${hazard.id} uses a hazard frame without measured opaque bounds.`);
}

for (const destructible of levelOne.destructibles) {
  assert(Boolean(destructibleBounds[destructible.frame]), `${destructible.id} uses a destructible frame without measured opaque bounds.`);
  assert(destructible.health > 0, `${destructible.id} must have positive health.`);
}

const movementDoor = byId(levelOne.doors, 'movement-door');
const movementTrigger = byId(levelOne.triggers, 'trigger-movement-complete');
assert(movementTrigger.x < movementDoor.x, 'Movement objective must unlock before the movement door.');

const combatDoor = byId(levelOne.doors, 'combat-door');
const firstTrooper = byId(levelOne.enemies, 'enemy-security-trooper');
assert(firstTrooper.x < combatDoor.x, 'Combat door must be after the first combat target.');
assert(levelOne.checkpoints.some((checkpoint) => checkpoint.x < firstTrooper.x && checkpoint.x > movementDoor.x), 'A checkpoint should sit before the first combat target.');

const keycardDoor = byId(levelOne.doors, 'keycard-door');
const keycard = byId(levelOne.pickups, 'pickup-reactor-keycard');
assert(keycard.x < keycardDoor.x, 'Keycard pickup must appear before the keycard door.');
assert(levelOne.finalPortal.x > keycardDoor.x, 'Final exit must be after the keycard door.');

const arenaEnemies = levelOne.enemies.filter((enemy) => enemy.zone === 'arena');
assert(arenaEnemies.length >= 2, 'Final arena should have at least two enemies.');
for (const enemy of arenaEnemies) {
  assert(enemy.x > keycardDoor.x, `${enemy.id} must be after the keycard door.`);
}

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
const doorIds = new Set(levelOne.doors.map((entry) => entry.id));
const checkpointIds = new Set(levelOne.checkpoints.map((entry) => entry.id));

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
  if (beat.gateId) assert(doorIds.has(beat.gateId), `${beat.id} references missing gate ${beat.gateId}.`);
  if (beat.checkpointId) assert(checkpointIds.has(beat.checkpointId), `${beat.id} references missing checkpoint ${beat.checkpointId}.`);
  for (const rewardId of beat.rewardIds ?? []) assert(rewardIds.has(rewardId), `${beat.id} references missing reward ${rewardId}.`);
  if (beat.risk === 'high') {
    const hasCloseCheckpoint = levelOne.checkpoints.some((checkpoint) => checkpoint.x <= beat.startX + 120 && Math.abs(checkpoint.x - beat.startX) <= levelDesignConfig.flow.maxCheckpointToHighRiskDistance);
    assert(Boolean(beat.checkpointId) || hasCloseCheckpoint, `${beat.id} is high risk without a nearby checkpoint.`);
  }
  if (beat.gateId) {
    const gate = byId(levelOne.doors, beat.gateId);
    const hasNearbyPrompt = levelOne.tutorialPrompts.some((prompt) => Math.abs(rectCenterX(prompt) - gate.x) <= levelDesignConfig.flow.maxGateToInstructionDistance);
    const hasNearbyTerminal = levelOne.terminals.some((terminal) => Math.abs(terminal.x - gate.x) <= levelDesignConfig.flow.maxGateToInstructionDistance);
    assert(hasNearbyPrompt || hasNearbyTerminal, `${beat.gateId} needs nearby instructional context.`);
  }
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
  if (edge.gateId) assert(doorIds.has(edge.gateId), `${edge.id} references missing gate ${edge.gateId}.`);
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

const arenaZone = byId(levelOne.zones, 'zone-arena');
assert(arenaZone.width >= levelDesignConfig.traversal.minArenaWidth, 'Final arena must provide enough width for readable enemy states.');
const sortedArenaEnemies = levelOne.enemies.filter((enemy) => enemy.zone === 'arena').sort((a, b) => a.x - b.x);
for (let i = 1; i < sortedArenaEnemies.length; i += 1) {
  assert(sortedArenaEnemies[i].x - sortedArenaEnemies[i - 1].x >= levelDesignConfig.traversal.minArenaEnemySpacing, 'Arena enemies need enough horizontal spacing.');
}

if (failures.length > 0) {
  for (const failure of failures) console.error(`[level:test] ${failure}`);
  process.exitCode = 1;
} else {
  console.log(`[level:test] ${ids.size} level items passed validation.`);
}
