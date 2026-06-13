export const levelDesignConfig = {
  flow: {
    minCriticalBeats: 6,
    maxBeatWidth: 980,
    minOptionalRoutes: 1,
    minSignposts: 6,
    minGraphNodes: 8,
    minGraphEdges: 9,
    minBranchingNodes: 2,
    minShortcutEdges: 1,
    maxGateToInstructionDistance: 420,
  },
  pacing: {
    maxIntensityJump: 3,
    maxConsecutiveHighIntensityBeats: 1,
    requiredPaces: ['learn', 'practice', 'test', 'reward', 'rest', 'synthesis'],
  },
  traversal: {
    maxIntroGap: 320,
    maxDashGap: 430,
    minLandingWidth: 170,
    minArenaWidth: 900,
    minArenaEnemySpacing: 260,
  },
  readability: {
    minLandmarks: 4,
    requiredSignpostRoles: ['criticalPath', 'danger', 'reward', 'shortcut', 'exit'],
    requiredMechanics: ['move', 'jump', 'dash', 'wallJump', 'melee', 'energy', 'keycard', 'arena', 'exit'],
  },
} as const;
