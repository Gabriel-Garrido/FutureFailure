import { type LevelMechanic } from './levelTypes';

export type TutorialActionId =
  | 'move'
  | 'jump'
  | 'dash'
  | 'wallJump'
  | 'attack'
  | 'shoot'
  | 'interact'
  | 'avoid'
  | 'keycard'
  | 'arena'
  | 'exit';

export type TutorialAction = {
  id: TutorialActionId;
  mechanic: LevelMechanic;
  keyboard: string;
  gamepad: string;
  touch: string;
  icon: string;
  label: string;
  verb: string;
};

export type TutorialPresentationConfig = {
  maxPromptWords: number;
  promptDurationMs: number;
  objectiveMaxWords: number;
  chipMaxWords: number;
  reminderCooldownMs: number;
};

export type TutorialPromptPayload = {
  id: string;
  text: string;
  actionId: TutorialActionId;
  durationMs?: number;
  priority?: 1 | 2 | 3;
};

export const tutorialActions: Record<TutorialActionId, TutorialAction> = {
  move: { id: 'move', mechanic: 'move', keyboard: '< >', gamepad: 'Stick', touch: '< >', icon: '>>', label: 'Mover', verb: 'Avanza' },
  jump: { id: 'jump', mechanic: 'jump', keyboard: 'X', gamepad: 'A', touch: 'X', icon: '^', label: 'Saltar', verb: 'Salta' },
  dash: { id: 'dash', mechanic: 'dash', keyboard: 'Z', gamepad: 'B', touch: 'Z', icon: '>>', label: 'Dash', verb: 'Cruza' },
  wallJump: { id: 'wallJump', mechanic: 'wallJump', keyboard: 'X', gamepad: 'A', touch: 'X', icon: '|^', label: 'Pared', verb: 'Rebota' },
  attack: { id: 'attack', mechanic: 'melee', keyboard: 'C', gamepad: 'X', touch: 'C', icon: '/', label: 'Espada', verb: 'Ataca' },
  shoot: { id: 'shoot', mechanic: 'energy', keyboard: 'V', gamepad: 'RT', touch: 'V', icon: '*', label: 'Energia', verb: 'Dispara' },
  interact: { id: 'interact', mechanic: 'keycard', keyboard: 'Arriba', gamepad: 'Y', touch: '^', icon: '!', label: 'Usar', verb: 'Interactua' },
  avoid: { id: 'avoid', mechanic: 'hazardTiming', keyboard: 'X/Z', gamepad: 'A/B', touch: 'X/Z', icon: '!', label: 'Peligro', verb: 'Evita' },
  keycard: { id: 'keycard', mechanic: 'keycard', keyboard: 'Arriba', gamepad: 'Y', touch: '^', icon: 'KEY', label: 'Tarjeta', verb: 'Abre' },
  arena: { id: 'arena', mechanic: 'arena', keyboard: 'C/V/Z', gamepad: 'X/RT/B', touch: 'C/V/Z', icon: '!!', label: 'Arena', verb: 'Limpia' },
  exit: { id: 'exit', mechanic: 'exit', keyboard: '->', gamepad: '->', touch: '->', icon: 'OUT', label: 'Salida', verb: 'Entra' },
};

export const tutorialPresentationConfig: TutorialPresentationConfig = {
  maxPromptWords: 7,
  promptDurationMs: 1900,
  objectiveMaxWords: 8,
  chipMaxWords: 3,
  reminderCooldownMs: 1600,
};

export function actionForMechanic(mechanic: LevelMechanic): TutorialAction {
  const action = Object.values(tutorialActions).find((entry) => entry.mechanic === mechanic);
  return action ?? tutorialActions.move;
}
