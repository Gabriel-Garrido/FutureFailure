import { type RectData, type SignpostData, type VisualTileData, type ZoneData } from './levelTypes';

export function platform(id: string, x: number, y: number, width: number, height: number, zone: string, notes?: string, collision: RectData['collision'] = 'solid'): RectData {
  return {
    id,
    type: 'platform',
    collision,
    x,
    y,
    width,
    height,
    zone,
    isFunctional: true,
    notes,
  };
}

export function wall(id: string, x: number, y: number, width: number, height: number, zone: string, notes?: string): RectData {
  return {
    id,
    type: 'wall',
    x,
    y,
    width,
    height,
    zone,
    isFunctional: true,
    notes,
  };
}

export function tile(rect: RectData, frame: number): VisualTileData {
  return { ...rect, category: 'tiles', frame, isFunctional: true };
}

export function deco(id: string, frame: number, x: number, y: number, width: number, height: number, zone: string, notes?: string): VisualTileData {
  return {
    id,
    type: 'decoration',
    x,
    y,
    width,
    height,
    zone,
    category: 'props',
    frame,
    isFunctional: false,
    notes,
  };
}

export function zone(id: string, label: string, x: number, y: number, width: number, height: number, zoneName: string): ZoneData {
  return { id, type: 'zone', label, x, y, width, height, zone: zoneName, isFunctional: false };
}

export function signpost(
  id: string,
  role: SignpostData['role'],
  x: number,
  y: number,
  width: number,
  height: number,
  zoneName: string,
  direction: 1 | -1 = 1,
  intensity: SignpostData['intensity'] = 'normal',
): SignpostData {
  return {
    id,
    type: 'signpost',
    role,
    x,
    y,
    width,
    height,
    zone: zoneName,
    direction,
    intensity,
    isFunctional: false,
  };
}
