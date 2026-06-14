import { gt } from '../game/i18n';

// Getter-backed object — every property reads the current language at access
// time, so all consumers automatically react to language changes without any
// changes at their call sites.
export const gameText = {
  get title() { return gt().title; },
  get subtitle() { return gt().subtitle; },
  get menu() { return gt().menu; },
  get hud() { return gt().hud; },
  get pause() { return gt().pause; },
  get gameOver() { return gt().gameOver; },
  get objectives() { return gt().objectives; },
  get guidance() { return gt().guidance; },
  get prompts() { return gt().prompts; },
  get terminals() { return gt().terminals; },
  get zones() { return gt().zones; },
};
