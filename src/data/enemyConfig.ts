export const enemyConfig = {
  trooper: {
    health: 3,
    speed: 72,
    detectRange: 420,
    shootCooldownMs: 1450,
    windupMs: 420,
    damage: 1,
  },
  drone: {
    health: 2,
    speed: 55,
    detectRange: 360,
    shootCooldownMs: 2100,
    damage: 1,
  },
  mech: {
    health: 10,
    speed: 38,
    detectRange: 520,
    shootCooldownMs: 2200,
    windupMs: 720,
    burstCount: 3,
    damage: 1,
  },
  // Final boss: a heavy mech with controlled oversized readability and 5x health.
  // Every third triple-burst it summons drones instead of energy shots and then
  // waits triple the normal cooldown before attacking again. After absorbing
  // a set number of energy balls it is stunned and fully exposed.
  boss: {
    health: 50, // 5x mech
    sizeScale: 2.15,
    detectRange: 1000,
    // Firing band must keep retreat < attackStop so the boss actually reaches
    // its aim/fire state (the previous *sizeScale tuning inverted the band).
    closeRetreatDistance: 300,
    attackStopDistance: 560,
    leashDistance: 1500, // effectively never leashes inside its arena
    shootCooldownMs: 2400,
    windupMs: 660,
    droneVolleyEveryNthBurst: 5,
    droneVolleyCount: 3,
    droneVolleyCooldownMultiplier: 3,
    enrageHealthFraction: 0.4, // below this, cooldowns tighten
    enrageCooldownMultiplier: 0.6,
    energyStunThreshold: 5, // energy balls absorbed before a stun
    stunDurationMs: 4000,
    damage: 1,
  },
  scout: {
    health: 2,
    detectRange: 360,
    chargeInitRange: 190,
    attackRange: 68,
    chargeCooldownMs: 2000,
    chargeWindupMs: 220,
    chargeDurationMs: 280,
    chargeSpeed: 385,
    damage: 1,
  },
  sentinel: {
    health: 4,
    detectRange: 490,
    shootCooldownMs: 2800,
    windupMs: 580,
    spreadAngleDeg: 20,
    damage: 1,
    bobAmplitude: 14,
    bobMs: 1050,
  },
};
