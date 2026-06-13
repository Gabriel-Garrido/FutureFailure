export type RectData = {
  id?: string;
  type?: string;
  collision?: 'solid' | 'oneWay';
  x: number;
  y: number;
  width: number;
  height: number;
  zone?: string;
  isFunctional?: boolean;
  notes?: string;
};

export type VisualCategory = 'tiles' | 'props' | 'doors' | 'pickups' | 'interactables' | 'destructibles';

export type VisualTileData = RectData & {
  frame?: number;
  category?: VisualCategory;
  tint?: number;
};

export type ZoneData = RectData & {
  label: string;
};

export type EnemyData = {
  id: string;
  type: 'trooper' | 'drone' | 'mech';
  x: number;
  y: number;
  zone: string;
  isFunctional: true;
  patrolMin?: number;
  patrolMax?: number;
  notes?: string;
};

export type PickupData = {
  id: string;
  type: 'healthSmall' | 'healthLarge' | 'energyCell' | 'keycard';
  x: number;
  y: number;
  zone: string;
  isFunctional: true;
  notes?: string;
};

export type BreakableDropData = {
  id: string;
  type: PickupData['type'];
  offsetX?: number;
  offsetY?: number;
  riseY?: number;
};

export type BreakableData = RectData & {
  id: string;
  type: 'crate' | 'barrel' | 'canister';
  frame: number;
  health: number;
  damagedFrame?: number;
  destroyedFrame?: number;
  debrisFrame?: number;
  drop?: BreakableDropData;
  isFunctional: true;
};

export type ObjectiveRequirement = 'movement' | 'combat' | 'arena';

export type TerminalData = {
  id: string;
  type: 'terminal';
  x: number;
  y: number;
  zone: string;
  message: string;
  isFunctional: true;
};

export type TriggerData = RectData & {
  id: string;
  type: 'camera' | 'objective' | 'arena';
  isFunctional: true;
};

export type TutorialPromptData = RectData & {
  id: string;
  text: string;
  actionId?: import('./tutorialConfig').TutorialActionId;
  priority?: 1 | 2 | 3;
  anchor?: 'hud' | 'world' | 'context';
  suppressObjective?: boolean;
  once: boolean;
  isFunctional: true;
};

export type MapMarkerData = {
  x: number;
  label: string;
  type: 'start' | 'key' | 'arena' | 'exit';
};

export type PlayerSpawnData = {
  id: string;
  type: 'spawn';
  x: number;
  y: number;
  zone: string;
  isFunctional: true;
};

export type LevelMechanic =
  | 'move'
  | 'jump'
  | 'dash'
  | 'wallJump'
  | 'melee'
  | 'energy'
  | 'keycard'
  | 'arena'
  | 'exit';

export type FlowPace = 'learn' | 'practice' | 'test' | 'reward' | 'rest' | 'synthesis';

export type FlowBeatData = {
  id: string;
  label: string;
  zone: string;
  startX: number;
  endX: number;
  pace: FlowPace;
  targetIntensity: 1 | 2 | 3 | 4 | 5;
  teaches?: LevelMechanic[];
  tests?: LevelMechanic[];
  rewardIds?: string[];
  risk: 'safe' | 'low' | 'medium' | 'high';
  notes?: string;
};

export type LevelGraphNodeData = {
  id: string;
  label: string;
  beatId: string;
  x: number;
  kind: 'start' | 'skillCheck' | 'reward' | 'shortcut' | 'arena' | 'exit';
  landmarkId?: string;
};

export type LevelGraphEdgeData = {
  id: string;
  from: string;
  to: string;
  kind: 'critical' | 'optional' | 'shortcut' | 'return' | 'reward';
  unlock?: OptionalRouteData['unlock'];
  tests?: LevelMechanic[];
  rewardIds?: string[];
  notes?: string;
};

export type LevelGraphData = {
  startNodeId: string;
  exitNodeId: string;
  nodes: LevelGraphNodeData[];
  edges: LevelGraphEdgeData[];
};

export type OptionalRouteData = {
  id: string;
  label: string;
  fromBeatId: string;
  toBeatId: string;
  rewardIds: string[];
  unlock?: 'none' | 'keycard' | `objective:${ObjectiveRequirement}`;
  risk: 'low' | 'medium' | 'high';
  notes?: string;
};

export type SignpostData = RectData & {
  id: string;
  type: 'signpost';
  role: 'criticalPath' | 'danger' | 'reward' | 'shortcut' | 'exit';
  direction?: 1 | -1;
  intensity?: 'subtle' | 'normal' | 'strong';
  isFunctional: false;
};

export type LevelDesignData = {
  intent: string;
  criticalPath: FlowBeatData[];
  optionalRoutes: OptionalRouteData[];
  graph: LevelGraphData;
  signposts: SignpostData[];
  landmarks: string[];
};

export type LevelData = {
  metadata: {
    id: string;
    name: string;
    notes: string;
  };
  width: number;
  height: number;
  backgroundKey?: string;
  cameraBounds: RectData;
  playerSpawn: PlayerSpawnData;
  zones: ZoneData[];
  mapMarkers: MapMarkerData[];
  platforms: RectData[];
  walls: RectData[];
  visualTiles: VisualTileData[];
  decorations: VisualTileData[];
  pickups: PickupData[];
  destructibles: BreakableData[];
  enemies: EnemyData[];
  interactables: TerminalData[];
  terminals: TerminalData[];
  triggers: TriggerData[];
  tutorialPrompts: TutorialPromptData[];
  design: LevelDesignData;
  finalPortal: RectData;
};
