export class AudioSystem {
  private context?: AudioContext;

  constructor(private readonly scene: Phaser.Scene) {}

  blip(kind: 'jump' | 'dash' | 'hit' | 'finisher' | 'hurt' | 'pickup' | 'shoot' | 'blocked'): void {
    const audioContext = this.context ?? this.createContext();
    if (!audioContext) return;

    const now = audioContext.currentTime;
    const osc = audioContext.createOscillator();
    const gain = audioContext.createGain();
    const settings = {
      jump: [420, 0.05],
      dash: [180, 0.055],
      hit: [680, 0.045],
      finisher: [760, 0.12],
      hurt: [110, 0.09],
      pickup: [880, 0.08],
      shoot: [520, 0.045],
      blocked: [180, 0.04],
    } satisfies Record<typeof kind, [number, number]>;
    const [frequency, duration] = settings[kind];

    osc.type = kind === 'hurt' || kind === 'blocked' ? 'sawtooth' : 'triangle';
    osc.frequency.setValueAtTime(frequency, now);
    osc.frequency.exponentialRampToValueAtTime(Math.max(40, frequency * 0.55), now + duration);
    gain.gain.setValueAtTime(0.05, now);
    gain.gain.exponentialRampToValueAtTime(0.0001, now + duration);
    osc.connect(gain).connect(audioContext.destination);
    osc.start(now);
    osc.stop(now + duration);
  }

  private createContext(): AudioContext | undefined {
    const audioWindow = window as unknown as { webkitAudioContext?: typeof AudioContext };
    const Ctor = globalThis.AudioContext || audioWindow.webkitAudioContext;
    if (!Ctor) return undefined;
    this.context = new Ctor();
    this.scene.input.once('pointerdown', () => void this.context?.resume());
    return this.context;
  }
}
