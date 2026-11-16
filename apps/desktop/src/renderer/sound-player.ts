import type { SoundKind } from '../shared/sounds.ts';
import { SOUNDS } from './sound-recipes.ts';

/** The part of the Web Audio API the player uses; AudioContext fits it. */
export interface AudioOutput {
  readonly currentTime: number;
  readonly destination: unknown;
  createOscillator(): {
    type: string;
    frequency: { value: number };
    connect(target: unknown): unknown;
    start(when: number): void;
    stop(when: number): void;
  };
  createGain(): {
    gain: {
      setValueAtTime(value: number, when: number): unknown;
      linearRampToValueAtTime(value: number, when: number): unknown;
    };
    connect(target: unknown): unknown;
  };
  close(): Promise<void>;
}

/** Quiet on purpose: Mocha sits beside the user's work. */
const VOLUME = 0.05;
/** Fades in and out, so tones do not click. */
const FADE = 0.01;

/**
 * Plays Mocha's sounds, only while sounds are on. The audio output is made
 * on the first sound and closed when sounds are turned off, which also
 * cuts a sound that is still playing.
 */
export function createSoundPlayer(openOutput: () => AudioOutput) {
  let enabled = false;
  let output: AudioOutput | undefined;

  return {
    get enabled() {
      return enabled;
    },
    setEnabled(next: boolean): void {
      enabled = next;
      if (!next && output) {
        void output.close();
        output = undefined;
      }
    },
    play(kind: SoundKind): void {
      if (!enabled) return;
      output ??= openOutput();
      const start = output.currentTime;
      for (const tone of SOUNDS[kind]) {
        const begin = start + tone.at;
        const end = begin + tone.duration;
        const oscillator = output.createOscillator();
        oscillator.type = tone.wave;
        oscillator.frequency.value = tone.frequency;
        const gain = output.createGain();
        gain.gain.setValueAtTime(0, begin);
        gain.gain.linearRampToValueAtTime(VOLUME, begin + FADE);
        gain.gain.linearRampToValueAtTime(0, end);
        oscillator.connect(gain);
        gain.connect(output.destination);
        oscillator.start(begin);
        oscillator.stop(end + FADE);
      }
    },
  };
}
