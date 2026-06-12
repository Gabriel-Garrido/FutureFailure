import { assetManifest, type AssetManifestEntry } from '../assets/assetManifest';

export type FrameBounds = {
  x: number;
  y: number;
  width: number;
  height: number;
};

export function firstAsset(category: AssetManifestEntry['category']): AssetManifestEntry | undefined {
  return assetManifest.find((entry) => entry.category === category);
}

export function assetKey(category: AssetManifestEntry['category'], fallback = ''): string {
  return firstAsset(category)?.key ?? fallback;
}

export const frameFor = {
  floor: 30,
  floorPanel: 0,
  wall: 15,
  ledge: 7,
  ledgeSmall: 11,
  ledgeHeavy: 34,
  pipe: 20,
  spike: 1,
  spikeCeiling: 4,
  laser: 14,
  acid: 15,
  steam: 19,
  breakableCrate: 0,
  breakableBarrel: 4,
  breakableCanister: 8,
  door: 0,
  doorTall: 34,
  pickupHealth: 0,
  pickupEnergy: 1,
  pickupKeycard: 2,
  checkpoint: 11,
  terminal: 12,
  trooperIdle: 0,
  droneIdle: 6,
  mechIdle: 12,
};

export const frameBoundsFor = {
  tiles: {
    0: { x: 30, y: 62, width: 177, height: 137 },
    7: { x: 26, y: 75, width: 176, height: 81 },
    10: { x: 7, y: 51, width: 200, height: 133 },
    11: { x: 2, y: 91, width: 168, height: 61 },
    15: { x: 57, y: 25, width: 81, height: 168 },
    30: { x: 30, y: 19, width: 177, height: 132 },
    34: { x: 3, y: 39, width: 204, height: 85 },
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
  hazards: {
    1: { x: 29, y: 97, width: 150, height: 86 },
    14: { x: 18, y: 107, width: 173, height: 42 },
    15: { x: 21, y: 107, width: 165, height: 70 },
    19: { x: 63, y: 90, width: 80, height: 85 },
    28: { x: 41, y: 32, width: 116, height: 141 },
  },
  destructibles: {
    0: { x: 54, y: 70, width: 134, height: 132 },
    4: { x: 38, y: 65, width: 96, height: 142 },
    8: { x: 73, y: 69, width: 63, height: 138 },
  },
  doors: {
    0: { x: 29, y: 27, width: 178, height: 180 },
    34: { x: 2, y: 2, width: 205, height: 179 },
    35: { x: 2, y: 2, width: 178, height: 179 },
  },
  interactables: {
    11: { x: 58, y: 2, width: 149, height: 205 },
    12: { x: 2, y: 2, width: 166, height: 205 },
  },
} as const satisfies Partial<Record<AssetManifestEntry['category'], Record<number, FrameBounds>>>;
