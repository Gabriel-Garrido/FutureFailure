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
  // Final boss: a heavy mech 5x the usual size with 5x the usual health.
  // Every third triple-burst it summons drones instead of energy shots and then
  // waits triple the normal cooldown before attacking again.
  boss: {
    health: 50, // 5x mech
    sizeScale: 5, // 5x visual + hitbox; scales muzzle/glow offsets too
    detectRange: 900,
    droneVolleyEveryNthBurst: 3,
    droneVolleyCount: 3,
    droneVolleyCooldownMultiplier: 3,
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
