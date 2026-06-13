import { assetKeyFor } from './assetMap';
import { type EnemyData } from './levelTypes';

export type EnemyType = EnemyData['type'];
export type EnemyVisualRole = 'idle' | 'move' | 'attack' | 'hurt' | 'death';

export type EnemySpriteAnimationSpec = {
  frames: readonly number[];
  frameRate?: number;
  repeat?: number;
};

export type EnemySpriteProfile = {
  type: EnemyType;
  textureKey: string;
  initialFrame: number;
  scale: number;
  origin: {
    x: number;
    y: number;
  };
  body: {
    width: number;
    height: number;
    offsetX: number;
    offsetY: number;
  };
  animations: Record<EnemyVisualRole, EnemySpriteAnimationSpec>;
};

const range = (start: number, end: number): number[] => Array.from({ length: end - start + 1 }, (_value, index) => start + index);

const defaultOrigin = { x: 0.5, y: 0.5 } as const;

export const enemySpriteConfig = {
  trooper: {
    type: 'trooper',
    textureKey: assetKeyFor({ key: 'trooper', category: 'enemy', enemyType: 'trooper' }, 'fallback-trooper'),
    initialFrame: 0,
    scale: 0.34,
    origin: defaultOrigin,
    body: { width: 90, height: 140, offsetX: 60, offsetY: 48 },
    animations: {
      idle: { frames: range(0, 5), frameRate: 7, repeat: -1 },
      move: { frames: range(6, 11), frameRate: 10, repeat: -1 },
      attack: { frames: range(12, 17), frameRate: 12, repeat: -1 },
      hurt: { frames: range(18, 20), frameRate: 13, repeat: 0 },
      death: { frames: range(18, 23), frameRate: 12, repeat: 0 },
    },
  },
  drone: {
    type: 'drone',
    textureKey: assetKeyFor({ key: 'drone', category: 'enemy', enemyType: 'drone' }, 'fallback-drone'),
    initialFrame: 0,
    scale: 0.34,
    origin: defaultOrigin,
    body: { width: 110, height: 90, offsetX: 48, offsetY: 60 },
    animations: {
      idle: { frames: range(0, 5), frameRate: 7, repeat: -1 },
      move: { frames: range(6, 11), frameRate: 10, repeat: -1 },
      attack: { frames: range(12, 17), frameRate: 12, repeat: -1 },
      hurt: { frames: range(18, 19), frameRate: 13, repeat: 0 },
      death: { frames: range(18, 23), frameRate: 12, repeat: 0 },
    },
  },
  mech: {
    type: 'mech',
    textureKey: assetKeyFor({ key: 'mech', category: 'enemy', enemyType: 'mech' }, 'fallback-mech'),
    initialFrame: 0,
    scale: 0.5,
    origin: { x: 0.5, y: 0.62 },
    body: { width: 104, height: 148, offsetX: 52, offsetY: 44 },
    animations: {
      idle: { frames: range(0, 5), frameRate: 7, repeat: -1 },
      move: { frames: range(6, 11), frameRate: 8, repeat: -1 },
      attack: { frames: range(12, 17), frameRate: 9, repeat: -1 },
      hurt: { frames: range(24, 29), frameRate: 13, repeat: 0 },
      death: { frames: range(30, 35), frameRate: 12, repeat: 0 },
    },
  },
  scout: {
    type: 'scout',
    textureKey: assetKeyFor({ category: 'enemy', enemyType: 'scout', variant: 'set-a' }, 'fallback-drone'),
    initialFrame: 0,
    scale: 0.31,
    origin: defaultOrigin,
    body: { width: 86, height: 98, offsetX: 62, offsetY: 70 },
    animations: {
      idle: { frames: [0], frameRate: 1, repeat: 0 },
      move: { frames: [0], frameRate: 1, repeat: 0 },
      attack: { frames: [0], frameRate: 1, repeat: 0 },
      hurt: { frames: [24], frameRate: 1, repeat: 0 },
      death: { frames: [24], frameRate: 1, repeat: 0 },
    },
  },
  sentinel: {
    type: 'sentinel',
    textureKey: assetKeyFor({ category: 'enemy', enemyType: 'sentinel' }, 'fallback-drone'),
    initialFrame: 0,
    scale: 0.36,
    origin: defaultOrigin,
    body: { width: 118, height: 96, offsetX: 46, offsetY: 58 },
    animations: {
      idle: { frames: [0, 1], frameRate: 5, repeat: -1 },
      move: { frames: [6, 7], frameRate: 7, repeat: -1 },
      attack: { frames: [12, 13], frameRate: 8, repeat: -1 },
      hurt: { frames: [24, 25], frameRate: 9, repeat: 0 },
      death: { frames: [30, 31], frameRate: 8, repeat: 0 },
    },
  },
} as const satisfies Record<EnemyType, EnemySpriteProfile>;

export function enemySpriteProfileFor(type: EnemyType): EnemySpriteProfile {
  return enemySpriteConfig[type];
}
