export type DamageSource =
  | 'playerMelee'
  | 'playerProjectile'
  | 'deflectedProjectile'
  | 'enemyContact'
  | 'enemyProjectile'
  | 'fall'
  | 'breakable';

export type AttackStage = 1 | 2 | 3;

export type HitstopConfig = {
  durationMs: number;
  timeScale: number;
};

export type KnockbackConfig = {
  enabled: boolean;
  x: number;
  y: number;
};

export type DamageReactionMode = 'knockback' | 'stagger' | 'preserve' | 'fatal';

export type DamageReactionConfig = {
  mode: DamageReactionMode;
  cancelDash: boolean;
  clearInputBuffers: boolean;
  allowGlobalHitstop: boolean;
  retainVelocityX: number;
  retainVelocityY: number;
  maxRetainedVelocityX: number;
  maxRetainedVelocityY: number;
  flashMs: number;
};

export type DamagePayload = {
  amount: number;
  source: DamageSource;
  hitX: number;
  hitId?: string;
  knockback: KnockbackConfig;
  stunMs: number;
  invulnerabilityMs?: number;
  hitstop: HitstopConfig;
  defeatHitstop?: HitstopConfig;
  isFinisher?: boolean;
  attackStage?: AttackStage;
  reaction?: DamageReactionConfig;
};

export type AttackStageConfig = {
  stage: AttackStage;
  amount: number;
  durationMs: number;
  activeStartMs: number;
  activeEndMs: number;
  chainStartMs: number;
  chainEndMs: number;
  cancelAfterMs: number;
  width: number;
  height: number;
  offsetX: number;
  offsetY: number;
  lungeX: number;
  knockback: KnockbackConfig;
  stunMs: number;
  hitstop: HitstopConfig;
  defeatHitstop: HitstopConfig;
  isFinisher: boolean;
};

export const combatConfig = {
  combo: {
    inputBufferMs: 420,
    jumpCancelBufferMs: 160,
    repeatIntervalMs: 300,
    resetMs: 760,
    hitConfirmJumpCancelMs: 180,
    recoveryMs: 300,
    cancelRecoveryMs: 300,
    finisherRecoveryMs: 420,
    stages: [
      {
        stage: 1,
        amount: 1,
        durationMs: 168,
        activeStartMs: 38,
        activeEndMs: 112,
        chainStartMs: 76,
        chainEndMs: 168,
        cancelAfterMs: 106,
        width: 72,
        height: 54,
        offsetX: 50,
        offsetY: 0,
        lungeX: 38,
        knockback: { enabled: true, x: 210, y: -86 },
        stunMs: 125,
        hitstop: { durationMs: 24, timeScale: 0.38 },
        defeatHitstop: { durationMs: 40, timeScale: 0.24 },
        isFinisher: false,
      },
      {
        stage: 2,
        amount: 1,
        durationMs: 188,
        activeStartMs: 48,
        activeEndMs: 132,
        chainStartMs: 90,
        chainEndMs: 188,
        cancelAfterMs: 122,
        width: 86,
        height: 58,
        offsetX: 58,
        offsetY: 1,
        lungeX: 46,
        knockback: { enabled: true, x: 250, y: -104 },
        stunMs: 150,
        hitstop: { durationMs: 28, timeScale: 0.34 },
        defeatHitstop: { durationMs: 44, timeScale: 0.22 },
        isFinisher: false,
      },
      {
        stage: 3,
        amount: 2,
        durationMs: 260,
        activeStartMs: 64,
        activeEndMs: 164,
        chainStartMs: 260,
        chainEndMs: 260,
        cancelAfterMs: 260,
        width: 104,
        height: 66,
        offsetX: 68,
        offsetY: -1,
        lungeX: 28,
        knockback: { enabled: true, x: 350, y: -145 },
        stunMs: 205,
        hitstop: { durationMs: 42, timeScale: 0.26 },
        defeatHitstop: { durationMs: 62, timeScale: 0.18 },
        isFinisher: true,
      },
    ] satisfies AttackStageConfig[],
  },
  projectile: {
    player: {
      amount: 1,
      speed: 470,
      cooldownMs: 390,
      energyCost: 1,
      knockback: { enabled: true, x: 170, y: -54 },
      stunMs: 90,
      hitstop: { durationMs: 14, timeScale: 0.52 },
      defeatHitstop: { durationMs: 34, timeScale: 0.28 },
    },
    enemy: {
      amount: 1,
      knockback: { enabled: false, x: 0, y: 0 },
      stunMs: 92,
      invulnerabilityMs: 780,
      hitstop: { durationMs: 0, timeScale: 1 },
      reaction: {
        mode: 'stagger',
        cancelDash: true,
        clearInputBuffers: true,
        allowGlobalHitstop: false,
        retainVelocityX: 0,
        retainVelocityY: 0,
        maxRetainedVelocityX: 0,
        maxRetainedVelocityY: 0,
        flashMs: 250,
      },
    },
    deflect: {
      amount: 1,
      speed: 560,
      knockback: { enabled: true, x: 230, y: -76 },
      stunMs: 130,
      hitstop: { durationMs: 26, timeScale: 0.34 },
      defeatHitstop: { durationMs: 44, timeScale: 0.22 },
    },
  },
  playerDamage: {
    contact: {
      amount: 1,
      knockback: { enabled: true, x: 260, y: -190 },
      stunMs: 150,
      invulnerabilityMs: 840,
      hitstop: { durationMs: 18, timeScale: 0.52 },
      reaction: {
        mode: 'knockback',
        cancelDash: true,
        clearInputBuffers: true,
        allowGlobalHitstop: true,
        retainVelocityX: 0,
        retainVelocityY: 0,
        maxRetainedVelocityX: 0,
        maxRetainedVelocityY: 0,
        flashMs: 270,
      },
    },
    fall: {
      amount: 99,
      knockback: { enabled: false, x: 0, y: 0 },
      stunMs: 0,
      invulnerabilityMs: 0,
      hitstop: { durationMs: 0, timeScale: 1 },
      reaction: {
        mode: 'fatal',
        cancelDash: true,
        clearInputBuffers: true,
        allowGlobalHitstop: false,
        retainVelocityX: 0,
        retainVelocityY: 0,
        maxRetainedVelocityX: 0,
        maxRetainedVelocityY: 0,
        flashMs: 0,
      },
    },
  },
  hitRules: {
    enemyDeathEmitsOnce: true,
    enemyProjectilesApplyKnockback: false,
    enemyProjectilesUseGlobalHitstop: false,
    enemyProjectileDamageIsIdempotent: true,
    enemyProjectileDamagePreservesPlayerPosition: true,
    enemyProjectilesCanBeDeflected: true,
    playerInvulnerabilityBlocksContactRepeat: true,
    hitstopAlwaysResetsToOne: true,
  },
} as const;
