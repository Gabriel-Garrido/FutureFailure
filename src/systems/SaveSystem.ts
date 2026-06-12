export type SaveState = {
  checkpointId: string;
  x: number;
  y: number;
  health: number;
  hasKeycard: boolean;
};

const key = 'future-failure-save';

export class SaveSystem {
  load(): SaveState | undefined {
    const raw = window.localStorage.getItem(key);
    if (!raw) return undefined;
    try {
      return JSON.parse(raw) as SaveState;
    } catch {
      return undefined;
    }
  }

  save(state: SaveState): void {
    window.localStorage.setItem(key, JSON.stringify(state));
  }

  clear(): void {
    window.localStorage.removeItem(key);
  }
}
