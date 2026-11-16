import { describe, expect, it, vi } from 'vitest';
import { createSoundPlayer } from './sound-player.ts';
import { SOUNDS } from './sound-recipes.ts';

/** An audio output that records what is played, at a fixed time. */
function fakeOutput(currentTime = 10) {
  const tones: { type: string; frequency: number; start: number; stop: number }[] = [];
  const peaks: number[] = [];
  const output = {
    currentTime,
    destination: 'speakers',
    close: vi.fn(async () => {}),
    createOscillator() {
      const oscillator = {
        type: '',
        frequency: { value: 0 },
        connect: vi.fn(),
        start(when: number) {
          tones.push({
            type: oscillator.type,
            frequency: oscillator.frequency.value,
            start: when,
            stop: 0,
          });
        },
        stop(when: number) {
          const last = tones.at(-1);
          if (last) last.stop = when;
        },
      };
      return oscillator;
    },
    createGain() {
      return {
        gain: {
          setValueAtTime: vi.fn(),
          linearRampToValueAtTime: vi.fn((value: number) => peaks.push(value)),
        },
        connect: vi.fn(),
      };
    },
  };
  return { output, tones, peaks };
}

describe('createSoundPlayer', () => {
  it('plays nothing, and opens no audio output, while sounds are off', () => {
    const open = vi.fn();
    const player = createSoundPlayer(open);

    player.play('pet');

    expect(open).not.toHaveBeenCalled();
    expect(player.enabled).toBe(false);
  });

  it('plays the tones of a sound from now, quietly', () => {
    const { output, tones, peaks } = fakeOutput(10);
    const player = createSoundPlayer(() => output);
    player.setEnabled(true);

    player.play('ritualDone');

    expect(tones.map(({ frequency, start }) => [frequency, start])).toEqual(
      SOUNDS.ritualDone.map(({ frequency, at }) => [frequency, 10 + at]),
    );
    expect(tones.every(({ type }) => type === 'triangle')).toBe(true);
    expect(Math.max(...peaks)).toBeLessThanOrEqual(0.05);
  });

  it('opens one audio output and reuses it', () => {
    const { output } = fakeOutput();
    const open = vi.fn(() => output);
    const player = createSoundPlayer(open);
    player.setEnabled(true);

    player.play('pet');
    player.play('found');

    expect(open).toHaveBeenCalledOnce();
  });

  it('closes the output when sounds are turned off, cutting what plays', () => {
    const { output } = fakeOutput();
    const open = vi.fn(() => output);
    const player = createSoundPlayer(open);
    player.setEnabled(true);
    player.play('reminder');

    player.setEnabled(false);
    player.play('reminder');

    expect(output.close).toHaveBeenCalledOnce();
    expect(open).toHaveBeenCalledOnce();
  });

  it('has a short sound for every moment', () => {
    for (const tones of Object.values(SOUNDS)) {
      const end = Math.max(...tones.map(({ at, duration }) => at + duration));
      expect(tones.length).toBeGreaterThan(0);
      expect(end).toBeLessThan(0.6);
    }
  });
});
