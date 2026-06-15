import { assetManifest, type AssetManifestEntry } from '../assets/assetManifest';
import { enemySpriteConfig, type EnemyVisualRole } from './enemySpriteConfig';

export type { EnemyVisualRole } from './enemySpriteConfig';

export type SpriteAnimationDefinition = {
  key: string;
  textureKey: string;
  frames: number[];
  frameRate: number;
  repeat: number;
};

const assets = assetManifest as readonly AssetManifestEntry[];

export function spriteAnimationKey(textureKey: string, animationId: string): string {
  return `${textureKey}-${animationId}`;
}

export function spriteAnimationDefinitions(): SpriteAnimationDefinition[] {
  return [
    ...playerAnimations(),
    ...enemyAnimations(),
  ];
}

function playerAnimations(): SpriteAnimationDefinition[] {
  if (!assetExists('player')) return [];
  return [
    animation('player', 'idle', [0, 1, 2, 3, 4], 8, -1),
    animation('player', 'run', [5, 6, 7, 8, 9], 13, -1),
    animation('player', 'jump', [10, 11, 12], 11, 0),
    animation('player', 'fall', [13, 13], 1, 0),
    animation('player', 'land', [14, 14], 1, 0),
    animation('player', 'attack', [15, 16, 17, 18, 19], 18, 0),
    // The current player sheet has no dedicated dash row; keep dash readable
    // without reusing the sword-slash frames.
    animation('player', 'dash', [10, 11], 20, -1),
  ];
}

function enemyAnimations(): SpriteAnimationDefinition[] {
  const unique = new Map<string, SpriteAnimationDefinition>();
  for (const profile of Object.values(enemySpriteConfig)) {
    for (const [role, spec] of Object.entries(profile.animations)) {
      if (spec.frames.length < 2) continue;
      const definition = animation(profile.textureKey, role as EnemyVisualRole, [...spec.frames], spec.frameRate ?? 8, spec.repeat ?? -1);
      if (!unique.has(definition.key)) unique.set(definition.key, definition);
    }
  }
  return [...unique.values()];
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

function assetExists(key: string): boolean {
  return assets.some((asset) => asset.key === key);
}
