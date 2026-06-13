import { frameFor } from './assetMap';
import { type RectData, type VisualCategory } from './levelTypes';

export type ElementSpriteCategory = VisualCategory | 'enemy' | 'boss' | 'player';
export type ElementSpriteFit = 'contain' | 'cover';
export type ElementSpriteAlign = 'top' | 'center' | 'bottom';
export type ElementGameplayRole =
  | 'solid'
  | 'portal'
  | 'terminal'
  | 'pickup'
  | 'destructible'
  | 'enemy'
  | 'decorative';

export type ElementSpriteSpec = {
  category: ElementSpriteCategory;
  frame: number;
  fit: ElementSpriteFit;
  align: ElementSpriteAlign;
  role: ElementGameplayRole;
  alpha?: number;
};

export const elementSprites = {
  terrain: {
    floor: { category: 'tiles', frame: frameFor.floor, fit: 'cover', align: 'top', role: 'solid' },
    floorPanel: { category: 'tiles', frame: frameFor.floorPanel, fit: 'cover', align: 'top', role: 'solid' },
    wall: { category: 'tiles', frame: frameFor.wall, fit: 'cover', align: 'center', role: 'solid' },
    ledge: { category: 'tiles', frame: frameFor.ledge, fit: 'cover', align: 'top', role: 'solid' },
    ledgeSmall: { category: 'tiles', frame: frameFor.ledgeSmall, fit: 'cover', align: 'top', role: 'solid' },
    ledgeHeavy: { category: 'tiles', frame: frameFor.ledgeHeavy, fit: 'cover', align: 'top', role: 'solid' },
  },
  destructibles: {
    crate: { category: 'destructibles', frame: frameFor.breakableCrate, fit: 'contain', align: 'bottom', role: 'destructible' },
    barrel: { category: 'destructibles', frame: frameFor.breakableBarrel, fit: 'contain', align: 'bottom', role: 'destructible' },
    canister: { category: 'destructibles', frame: frameFor.breakableCanister, fit: 'contain', align: 'bottom', role: 'destructible' },
  },
  doors: {
    portal: { category: 'doors', frame: frameFor.portal, fit: 'cover', align: 'center', role: 'portal' },
  },
  pickups: {
    healthSmall: { category: 'pickups', frame: frameFor.pickupHealth, fit: 'contain', align: 'center', role: 'pickup' },
    healthLarge: { category: 'pickups', frame: frameFor.pickupHealthLarge, fit: 'contain', align: 'center', role: 'pickup' },
    energyCell: { category: 'pickups', frame: frameFor.pickupEnergy, fit: 'contain', align: 'center', role: 'pickup' },
    keycard: { category: 'pickups', frame: frameFor.pickupKeycard, fit: 'contain', align: 'center', role: 'pickup' },
  },
  interactables: {
    terminal: { category: 'interactables', frame: frameFor.terminal, fit: 'contain', align: 'bottom', role: 'terminal' },
  },
  enemies: {
    trooper: { category: 'enemy', frame: frameFor.trooperIdle, fit: 'contain', align: 'bottom', role: 'enemy' },
    drone: { category: 'enemy', frame: frameFor.droneIdle, fit: 'contain', align: 'center', role: 'enemy' },
    mech: { category: 'enemy', frame: frameFor.mechIdle, fit: 'contain', align: 'bottom', role: 'enemy' },
    scout: { category: 'enemy', frame: frameFor.scoutIdle, fit: 'contain', align: 'bottom', role: 'enemy' },
    sentinel: { category: 'enemy', frame: frameFor.sentinelIdle, fit: 'contain', align: 'center', role: 'enemy' },
  },
} as const;

export const portalSpriteMetrics = {
  visualPaddingX: 92,
  visualPaddingY: 30,
  ringPaddingX: 76,
  ringPaddingY: 48,
} as const;

export function portalVisualRect(portal: RectData): RectData {
  return {
    id: `${portal.id ?? 'portal'}-visual`,
    x: portal.x - portalSpriteMetrics.visualPaddingX / 2,
    y: portal.y - portalSpriteMetrics.visualPaddingY / 2,
    width: portal.width + portalSpriteMetrics.visualPaddingX,
    height: portal.height + portalSpriteMetrics.visualPaddingY,
  };
}
