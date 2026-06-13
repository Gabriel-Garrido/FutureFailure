import { frameBoundsFor, type FrameBounds } from '../data/assetMap';

export type FitRect = { x: number; y: number; width: number; height: number };
export type FitCategory = keyof typeof frameBoundsFor;
export type FitMode = 'contain' | 'cover';
export type FitVerticalAlign = 'top' | 'center' | 'bottom';

/**
 * Scales and positions a sprite so the *opaque* part of its frame (the measured
 * `frameBoundsFor` rectangle, ignoring transparent padding) lands exactly on the
 * target world rectangle. This is the single source of truth for fitting every
 * authored sprite (tiles, props, doors, interactables, destructibles);
 * each caller only supplies the category, frame, target and alignment.
 *
 * - `contain` fits the whole opaque art inside the target; `cover` fills it.
 * - `verticalAlign` anchors the opaque art to the top/center/bottom of the target
 *   so floor-standing props and mounted interactables line up with the ground.
 *
 * It also crops the sprite to those measured bounds (see {@link cropToOpaqueBounds}),
 * so packed-sheet guide lines or neighbouring frames never bleed in at the edges.
 * Pass `crop = false` for sprites that play a multi-frame animation, since a crop
 * measured from one frame could clip the others.
 */
export function fitSpriteToOpaqueRect(
  sprite: Phaser.GameObjects.Sprite,
  category: FitCategory,
  frameIndex: number,
  target: FitRect,
  mode: FitMode,
  verticalAlign: FitVerticalAlign = 'center',
  crop = true,
): void {
  const measured = boundsFor(category, frameIndex);
  const bounds = measured ?? { x: 0, y: 0, width: sprite.frame.width, height: sprite.frame.height };
  const scaleX = target.width / bounds.width;
  const scaleY = target.height / bounds.height;
  const scale = mode === 'cover' ? Math.max(scaleX, scaleY) : Math.min(scaleX, scaleY);
  const frameCenterX = sprite.frame.width / 2;
  const frameCenterY = sprite.frame.height / 2;
  const visibleCenterOffsetX = (bounds.x + bounds.width / 2 - frameCenterX) * scale;
  const visibleCenterOffsetY = (bounds.y + bounds.height / 2 - frameCenterY) * scale;
  const spriteX = target.x + target.width / 2 - visibleCenterOffsetX;
  let spriteY = target.y + target.height / 2 - visibleCenterOffsetY;
  if (verticalAlign === 'top') spriteY = target.y - (bounds.y - frameCenterY) * scale;
  if (verticalAlign === 'bottom') spriteY = target.y + target.height - (bounds.y + bounds.height - frameCenterY) * scale;
  sprite.setScale(scale).setPosition(spriteX, spriteY);
  if (measured && crop) cropToOpaqueBounds(sprite, measured);
}

/**
 * Clips a sprite so only its measured opaque art renders. Cropping in frame
 * coordinates keeps the art in the exact same world position (Phaser positions
 * the crop relative to the full-frame origin), it just removes the transparent
 * padding where packed-sheet edge guide lines and neighbour bleed live. This is
 * the single, scalable guard against edge artifacts for every authored sprite.
 */
export function cropToOpaqueBounds(sprite: Phaser.GameObjects.Sprite, bounds: FrameBounds): void {
  sprite.setCrop(bounds.x, bounds.y, bounds.width, bounds.height);
}

/** Returns the measured opaque bounds for a frame, or undefined when none exist. */
export function boundsFor(category: FitCategory, frameIndex: number): FrameBounds | undefined {
  const categoryBounds = frameBoundsFor[category] as Record<number, FrameBounds> | undefined;
  return categoryBounds?.[frameIndex];
}

/** True when a category/frame has measured opaque bounds available. */
export function hasOpaqueBounds(category: string | undefined, frameIndex: number): category is FitCategory {
  if (!category || !(category in frameBoundsFor)) return false;
  return Boolean(boundsFor(category as FitCategory, frameIndex));
}
