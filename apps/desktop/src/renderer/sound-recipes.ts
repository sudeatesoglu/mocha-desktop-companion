import type { SoundKind } from '../shared/sounds.ts';

/** One tone of a sound: its pitch, when it starts and how long it lasts, in seconds. */
export interface Tone {
  frequency: number;
  at: number;
  duration: number;
  wave: 'sine' | 'triangle' | 'square';
}

// Pitches of the notes used, in Hz.
const C5 = 523.25;
const E5 = 659.25;
const G5 = 783.99;
const A5 = 880;
const C6 = 1046.5;
const E6 = 1318.51;
const G6 = 1567.98;

/**
 * Mocha's sounds as data: short, quiet chiptune phrases made from tones,
 * synthesized at play time, so the app ships no audio files.
 */
export const SOUNDS: Readonly<Record<SoundKind, readonly Tone[]>> = {
  // Two quick rising chirps.
  pet: [
    { frequency: A5, at: 0, duration: 0.06, wave: 'triangle' },
    { frequency: E6, at: 0.07, duration: 0.07, wave: 'triangle' },
  ],
  // A soft call, falling: time for a break, no alarm.
  reminder: [
    { frequency: G5, at: 0, duration: 0.14, wave: 'sine' },
    { frequency: E5, at: 0.18, duration: 0.2, wave: 'sine' },
  ],
  // A rising arpeggio: done together.
  ritualDone: [
    { frequency: C5, at: 0, duration: 0.12, wave: 'triangle' },
    { frequency: E5, at: 0.12, duration: 0.12, wave: 'triangle' },
    { frequency: G5, at: 0.24, duration: 0.2, wave: 'triangle' },
  ],
  // High twinkles, like the sparkle on the desktop.
  found: [
    { frequency: C6, at: 0, duration: 0.08, wave: 'sine' },
    { frequency: G6, at: 0.09, duration: 0.08, wave: 'sine' },
    { frequency: E6, at: 0.18, duration: 0.14, wave: 'sine' },
  ],
};
