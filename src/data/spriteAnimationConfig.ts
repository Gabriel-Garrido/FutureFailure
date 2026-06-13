import { assetManifest, type AssetManifestEntry } from '../assets/assetManifest';

export type SpriteAnimationDefinition = {
  key: string;
  textureKey: string;
  frames: number[];
  frameRate: number;
  repeat: number;
};

export type EnemyVisualRole = 'idle' | 'move' | 'attack' | 'hurt' | 'death';

const assets = assetManifest as readonly AssetManifestEntry[];

export function spriteAnimationKey(textureKey: string, animationId: string): string {
  return `${textureKey}-${animationId}`;
}

export function spriteAnimationDefinitions(): SpriteAnimationDefinition[] {
  return [
    ...playerAnimations(),
    ...combatantSheetAnimations(),
  ];
}

function playerAnimations(): SpriteAnimationDefinition[] {
  if (!assetExists('player')) return [];
  return [
    animation('player', 'idle', [0, 1, 2, 3, 4], 8, -1),
    animation('player', 'run', [5, 6, 7, 8, 9], 13, -1),
    animation('player', 'jump', [10, 11, 12], 10, -1),
    animation('player', 'fall', [12, 13, 14], 10, -1),
    animation('player', 'attack', [15, 16, 17, 18, 19], 18, 0),
    animation('player', 'dash', [15, 16, 17, 18, 19], 20, -1),
  ];
}

function combatantSheetAnimations(): SpriteAnimationDefinition[] {
  return assets
    .filter((asset) => (asset.category === 'enemy' || asset.category === 'boss') && asset.loadType === 'spritesheet' && asset.columns === 6 && asset.rows === 6)
    .flatMap((asset) => [
      animation(asset.key, 'idle', rowFrames(0), 7, -1),
      animation(asset.key, 'move', rowFrames(1), asset.category === 'boss' ? 8 : 10, -1),
      animation(asset.key, 'attack', rowFrames(2), asset.category === 'boss' ? 9 : 12, -1),
      animation(asset.key, 'hurt', rowFrames(3), 13, 0),
      animation(asset.key, 'death', rowFrames(5), 12, 0),
    ]);
}

function animation(textureKey: string, animationId: string, frames: number[], frameRate: number, repeat: number): SpriteAnimationDefinition {
  return {
    key: spriteAnimationKey(textureKey, animationId),
    textureKey,
    frames,
    frameRate,
    repeat,
  };
}

function rowFrames(row: number, columns = 6): number[] {
  const start = row * columns;
  return Array.from({ length: columns }, (_value, index) => start + index);
}

function assetExists(key: string): boolean {
  return assets.some((asset) => asset.key === key);
}
