export const GAME_WIDTH = 960;
export const GAME_HEIGHT = 540;

export const COLORS = {
  background: 0x05070b,
  cyan: 0x36f6ff,
  cyanDark: 0x0c7486,
  red: 0xff355f,
  amber: 0xffc857,
  purple: 0x7a5cff,
  green: 0x5cff9d,
  steel: 0x2a3340,
  darkSteel: 0x111820,
};

export const EVENTS = {
  healthChanged: 'health-changed',
  energyChanged: 'energy-changed',
  keycardChanged: 'keycard-changed',
  objectiveChanged: 'objective-changed',
  contextChanged: 'context-changed',
  tutorialChanged: 'tutorial-changed',
  checkpointChanged: 'checkpoint-changed',
  playerDied: 'player-died',
  playerRespawned: 'player-respawned',
  playerPositionChanged: 'player-position-changed',
  mapConfigured: 'map-configured',
  debugChanged: 'debug-changed',
  enemyDamaged: 'enemy-damaged',
  enemyDefeated: 'enemy-defeated',
  playerDamaged: 'player-damaged',
  combatHitstop: 'combat-hitstop',
  playerLanded: 'player-landed',
  playerWallSlide: 'player-wall-slide',
  playerWallJump: 'player-wall-jump',
  playerDashEnded: 'player-dash-ended',
  enemyStateChanged: 'enemy-state-changed',
};

export const DEPTHS = {
  background: -30,
  decorations: -10,
  terrain: 0,
  pickups: 20,
  enemies: 30,
  player: 40,
  effects: 60,
  ui: 100,
};
