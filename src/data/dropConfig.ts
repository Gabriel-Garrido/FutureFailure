import { type PickupType } from '../entities/Pickup';

/**
 * Central, data-driven configuration for everything that "pops out" of a
 * destroyed object (breakable crates and defeated enemies).
 *
 * Keeping the probabilities here (instead of hard-coded in entities) keeps the
 * drop economy tunable in one place and lets the tests assert the balance
 * invariants — e.g. that energy is always the most likely reward.
 */

export type EnemyDropKind = 'trooper' | 'drone' | 'mech';

export type DropWeight = {
  type: PickupType;
  weight: number;
};

export type EnemyDropProfile = {
  /** Probability in [0, 1] that defeating this enemy drops anything at all. */
  dropChance: number;
  /** Relative weights; the higher the weight the more likely the pickup. */
  table: DropWeight[];
};

export const dropConfig = {
  /**
   * Shared "jump" duration for items leaving a box or an enemy.
   * 0.5s reads as a clear, juicy pop without feeling sluggish.
   */
  revealDurationMs: 500,
  /** Tween ease that gives the pop a small upward overshoot before settling. */
  revealEase: 'Back.easeOut',
  /** How far up (px) an enemy drop hops before it settles into a floating pickup. */
  enemyRiseY: 42,
  enemies: {
    trooper: {
      dropChance: 0.55,
      table: [
        { type: 'energyCell', weight: 50 },
        { type: 'healthSmall', weight: 30 },
        { type: 'healthLarge', weight: 8 },
      ],
    },
    drone: {
      dropChance: 0.5,
      table: [
        { type: 'energyCell', weight: 55 },
        { type: 'healthSmall', weight: 28 },
        { type: 'healthLarge', weight: 6 },
      ],
    },
    mech: {
      // Heavy elite: always rewards the player for the longer fight.
      dropChance: 1,
      table: [
        { type: 'energyCell', weight: 44 },
        { type: 'healthLarge', weight: 20 },
        { type: 'healthSmall', weight: 16 },
      ],
    },
  } satisfies Record<EnemyDropKind, EnemyDropProfile>,
} as const;

/**
 * Rolls a single drop for a defeated enemy. Returns `undefined` when the
 * `dropChance` gate fails (no drop this time). `random` is injectable so the
 * behaviour is deterministically testable.
 */
export function rollEnemyDrop(kind: EnemyDropKind, random: () => number = Math.random): PickupType | undefined {
  const profile = dropConfig.enemies[kind];
  if (random() >= profile.dropChance) return undefined;
  return pickWeighted(profile.table, random);
}

function pickWeighted(table: DropWeight[], random: () => number): PickupType {
  const total = table.reduce((sum, entry) => sum + entry.weight, 0);
  let roll = random() * total;
  for (const entry of table) {
    roll -= entry.weight;
    if (roll < 0) return entry.type;
  }
  return table[table.length - 1].type;
}
