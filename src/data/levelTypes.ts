export type RectData = {
  id?: string;
  type?: string;
  x: number;
  y: number;
  width: number;
  height: number;
  zone?: string;
  isFunctional?: boolean;
  notes?: string;
};

export type VisualCategory = 'tiles' | 'props' | 'hazards' | 'doors' | 'pickups' | 'interactables' | 'destructibles';

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

export type HazardData = RectData & {
  id: string;
  type: 'spikes' | 'laser' | 'acid' | 'steam';
  damage: number;
  frame?: number;
  visual?: RectData;
  cycleMs?: number;
  warningMs?: number;
};

export type PickupData = {
  id: string;
  type: 'healthSmall' | 'healthLarge' | 'energyCell' | 'keycard' | 'upgradeChip' | 'dataShard';
  x: number;
  y: number;
  zone: string;
  isFunctional: true;
  notes?: string;
};

export type BreakableData = RectData & {
  id: string;
  type: 'crate' | 'barrel' | 'canister';
  frame: number;
  health: number;
  isFunctional: true;
};

export type DoorRequirement = 'movement' | 'combat' | 'arena';

export type DoorData = RectData & {
  id: string;
  type: 'door';
  requiresKeycard?: boolean;
  requiresObjective?: DoorRequirement;
  target?: string;
  isFunctional: true;
};

export type CheckpointData = {
  id: string;
  type: 'checkpoint';
  x: number;
  y: number;
  zone: string;
  isFunctional: true;
};

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
  type: 'checkpoint' | 'door' | 'key' | 'arena' | 'exit';
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
  | 'hazardTiming'
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
  gateId?: string;
  checkpointId?: string;
  rewardIds?: string[];
  risk: 'safe' | 'low' | 'medium' | 'high';
  notes?: string;
};

export type LevelGraphNodeData = {
  id: string;
  label: string;
  beatId: string;
  x: number;
  kind: 'start' | 'skillCheck' | 'gate' | 'reward' | 'shortcut' | 'arena' | 'exit';
  landmarkId?: string;
};

export type LevelGraphEdgeData = {
  id: string;
  from: string;
  to: string;
  kind: 'critical' | 'optional' | 'shortcut' | 'return' | 'reward';
  unlock?: OptionalRouteData['unlock'];
  gateId?: string;
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
  unlock?: 'none' | 'keycard' | `objective:${DoorRequirement}`;
  risk: 'low' | 'medium' | 'high';
  notes?: string;
};

export type SignpostData = RectData & {
  id: string;
  type: 'signpost';
  role: 'criticalPath' | 'danger' | 'reward' | 'shortcut' | 'checkpoint' | 'exit';
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
  cameraBounds: RectData;
  playerSpawn: PlayerSpawnData;
  zones: ZoneData[];
  mapMarkers: MapMarkerData[];
  platforms: RectData[];
  walls: RectData[];
  visualTiles: VisualTileData[];
  decorations: VisualTileData[];
  hazards: HazardData[];
  pickups: PickupData[];
  destructibles: BreakableData[];
  enemies: EnemyData[];
  doors: DoorData[];
  checkpoints: CheckpointData[];
  interactables: TerminalData[];
  terminals: TerminalData[];
  triggers: TriggerData[];
  tutorialPrompts: TutorialPromptData[];
  design: LevelDesignData;
  finalPortal: RectData;
};
