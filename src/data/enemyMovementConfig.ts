export type EnemyMovementState = 'idle' | 'patrol' | 'chase' | 'attackWindup' | 'recover' | 'leash' | 'stunned';

export type GroundEnemyMovementConfig = {
  patrolSpeed: number;
  chaseSpeed: number;
  acceleration: number;
  deceleration: number;
  leashDistance: number;
  edgeProbeX: number;
  edgeProbeY: number;
  recoverMs: number;
  closeRetreatDistance: number;
  attackStopDistance: number;
};

export type DroneMovementConfig = {
  patrolSpeed: number;
  maxSpeed: number;
  acceleration: number;
  deceleration: number;
  leashDistance: number;
  idealDistanceX: number;
  idealDistanceY: number;
  verticalBob: number;
  verticalBobMs: number;
  recoverMs: number;
  attackStopDistance: number;
};

export type ScoutMovementConfig = GroundEnemyMovementConfig & {
  chargeSpeed: number;
};

export const enemyMovementConfig = {
  trooper: {
    patrolSpeed: 72,
    chaseSpeed: 98,
    acceleration: 880,
    deceleration: 1240,
    leashDistance: 430,
    edgeProbeX: 38,
    edgeProbeY: 18,
    recoverMs: 250,
    closeRetreatDistance: 92,
    attackStopDistance: 305,
  },
  drone: {
    patrolSpeed: 44,
    maxSpeed: 84,
    acceleration: 520,
    deceleration: 620,
    leashDistance: 500,
    idealDistanceX: 255,
    idealDistanceY: -22,
    verticalBob: 28,
    verticalBobMs: 720,
    recoverMs: 230,
    attackStopDistance: 345,
  },
  mech: {
    patrolSpeed: 36,
    chaseSpeed: 62,
    acceleration: 390,
    deceleration: 1050,
    leashDistance: 470,
    edgeProbeX: 50,
    edgeProbeY: 18,
    recoverMs: 360,
    closeRetreatDistance: 118,
    attackStopDistance: 355,
  },
  scout: {
    patrolSpeed: 118,
    chaseSpeed: 162,
    chargeSpeed: 385,
    acceleration: 1450,
    deceleration: 1800,
    leashDistance: 410,
    edgeProbeX: 30,
    edgeProbeY: 18,
    recoverMs: 300,
    closeRetreatDistance: 85,
    attackStopDistance: 190,
  },
  sentinel: {
    patrolSpeed: 0,
    chaseSpeed: 0,
    acceleration: 1350,
    deceleration: 1400,
    leashDistance: 0,
    edgeProbeX: 0,
    edgeProbeY: 0,
    recoverMs: 200,
    closeRetreatDistance: 0,
    attackStopDistance: 490,
  },
} satisfies {
  trooper: GroundEnemyMovementConfig;
  drone: DroneMovementConfig;
  mech: GroundEnemyMovementConfig;
  scout: ScoutMovementConfig;
  sentinel: GroundEnemyMovementConfig;
};
