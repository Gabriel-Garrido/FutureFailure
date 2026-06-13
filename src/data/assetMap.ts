import { assetManifest, type AssetManifestEntry } from '../assets/assetManifest';

const assets = assetManifest as readonly AssetManifestEntry[];

export type FrameBounds = {
  x: number;
  y: number;
  width: number;
  height: number;
};

export type AssetQuery = {
  key?: string;
  category?: AssetManifestEntry['category'];
  role?: string;
  theme?: string;
  variant?: string;
  enemyType?: NonNullable<AssetManifestEntry['enemyType']>;
  bossType?: NonNullable<AssetManifestEntry['bossType']>;
  loadType?: AssetManifestEntry['loadType'];
};

export function findAsset(query: AssetQuery): AssetManifestEntry | undefined {
  return assets.find((entry) => {
    if (query.key !== undefined && entry.key !== query.key) return false;
    if (query.category !== undefined && entry.category !== query.category) return false;
    if (query.role !== undefined && entry.role !== query.role) return false;
    if (query.theme !== undefined && entry.theme !== query.theme) return false;
    if (query.variant !== undefined && entry.variant !== query.variant) return false;
    if (query.enemyType !== undefined && entry.enemyType !== query.enemyType) return false;
    if (query.bossType !== undefined && entry.bossType !== query.bossType) return false;
    if (query.loadType !== undefined && entry.loadType !== query.loadType) return false;
    return true;
  });
}

export function assetsByCategory(category: AssetManifestEntry['category']): readonly AssetManifestEntry[] {
  return assets.filter((entry) => entry.category === category);
}

export function firstAsset(selector: string): AssetManifestEntry | undefined {
  return assets.find((entry) => matchesSelector(entry, selector));
}

export function assetKey(selector: string, fallback = ''): string {
  return firstAsset(selector)?.key ?? fallback;
}

export function assetKeyFor(query: AssetQuery, fallback = ''): string {
  return findAsset(query)?.key ?? fallback;
}

export function backgroundKey(keyOrTheme: string, fallback = ''): string {
  return assetKeyFor({ key: keyOrTheme, category: 'background', loadType: 'image' })
    || assetKeyFor({ theme: keyOrTheme, category: 'background', loadType: 'image' })
    || fallback;
}

function matchesSelector(entry: AssetManifestEntry, selector: string): boolean {
  return entry.key === selector
    || entry.category === selector
    || entry.role === selector
    || entry.theme === selector
    || entry.variant === selector
    || entry.enemyType === selector
    || entry.bossType === selector;
}

export const frameFor = {
  floor: 30,
  floorPanel: 0,
  wall: 15,
  ledge: 7,
  ledgeSmall: 11,
  ledgeHeavy: 34,
  pipe: 20,
  breakableCrate: 0,
  breakableBarrel: 4,
  breakableCanister: 8,
  portal: 35,
  pickupHealth: 1,
  pickupHealthLarge: 15,
  pickupEnergy: 2,
  pickupKeycard: 7,
  terminal: 12,
  trooperIdle: 0,
  droneIdle: 6,
  mechIdle: 12,
  scoutIdle: 0,
  sentinelIdle: 0,
};

export const frameBoundsFor = {
  tiles: {
    0: { x: 30, y: 62, width: 177, height: 137 },
    7: { x: 26, y: 75, width: 176, height: 81 },
    10: { x: 7, y: 51, width: 200, height: 133 },
    11: { x: 2, y: 91, width: 168, height: 61 },
    15: { x: 57, y: 25, width: 81, height: 168 },
    30: { x: 30, y: 19, width: 177, height: 132 },
    34: { x: 3, y: 39, width: 172, height: 85 },
    35: { x: 2, y: 39, width: 163, height: 102 },
  },
  props: {
    0: { x: 62, y: 57, width: 117, height: 124 },
    3: { x: 78, y: 46, width: 46, height: 144 },
    6: { x: 58, y: 54, width: 121, height: 118 },
    8: { x: 39, y: 50, width: 131, height: 122 },
    11: { x: 28, y: 42, width: 127, height: 138 },
    18: { x: 47, y: 57, width: 142, height: 79 },
    20: { x: 45, y: 52, width: 124, height: 100 },
    25: { x: 75, y: 16, width: 73, height: 142 },
    28: { x: 16, y: 54, width: 151, height: 78 },
  },
  destructibles: {
    0: { x: 54, y: 70, width: 134, height: 132 },
    1: { x: 47, y: 71, width: 134, height: 131 },
    2: { x: 26, y: 72, width: 159, height: 135 },
    3: { x: 11, y: 108, width: 170, height: 95 },
    4: { x: 38, y: 65, width: 96, height: 142 },
    5: { x: 26, y: 65, width: 109, height: 142 },
    6: { x: 43, y: 48, width: 151, height: 159 },
    7: { x: 29, y: 80, width: 167, height: 127 },
    8: { x: 73, y: 69, width: 63, height: 138 },
    9: { x: 65, y: 72, width: 61, height: 135 },
    10: { x: 35, y: 62, width: 103, height: 145 },
    30: { x: 42, y: 34, width: 165, height: 110 },
    31: { x: 32, y: 31, width: 164, height: 115 },
    35: { x: 2, y: 43, width: 154, height: 97 },
  },
  doors: {
    35: { x: 2, y: 2, width: 178, height: 179 },
  },
  interactables: {
    11: { x: 58, y: 47, width: 83, height: 129 },
    12: { x: 40, y: 61, width: 128, height: 113 },
  },
  ui: {
    1: { x: 2, y: 71, width: 205, height: 136 },
    2: { x: 2, y: 70, width: 205, height: 137 },
    13: { x: 2, y: 49, width: 205, height: 158 },
    14: { x: 2, y: 31, width: 197, height: 176 },
    15: { x: 68, y: 25, width: 139, height: 182 },
    17: { x: 2, y: 24, width: 122, height: 183 },
    27: { x: 70, y: 2, width: 137, height: 205 },
    29: { x: 2, y: 2, width: 121, height: 205 },
  },
} as const satisfies Partial<Record<AssetManifestEntry['category'], Record<number, FrameBounds>>>;
