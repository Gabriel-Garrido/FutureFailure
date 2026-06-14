export const playerSpriteConfig = {
  scale: 0.346,
  body: {
    width: 104,
    height: 242,
    offsetX: 88,
    offsetY: 26,
  },
  projectileHurtZone: {
    width: 80,
    height: 160,
    offsetY: 2,
  },
  projectileDamageArea: {
    offsetY: 22,
    radiusX: 28,
    radiusY: 48,
  },
  targeting: {
    torsoAimOffsetY: 22,
  },
} as const;
