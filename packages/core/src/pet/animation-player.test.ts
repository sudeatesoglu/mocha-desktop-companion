import { describe, expect, it } from 'vitest';
import type { SkinManifest } from '../skin/skin-manifest.ts';
import { createAnimationPlayer } from './animation-player.ts';

type Animations = SkinManifest['animations'];

const frame = (index: number, durationMs: number) => ({ index, durationMs });

const ANIMATIONS: Animations = {
  idle: { loop: true, frames: [frame(0, 800), frame(1, 400)] },
  blink: { loop: false, frames: [frame(2, 60), frame(3, 100), frame(2, 60)] },
};

describe('createAnimationPlayer', () => {
  it('starts on the first idle frame', () => {
    const player = createAnimationPlayer(ANIMATIONS);

    expect(player.current).toBe('idle');
    expect(player.frame.index).toBe(0);
  });

  it('shows each frame for its own duration', () => {
    const player = createAnimationPlayer(ANIMATIONS);

    expect(player.update(700)).toBe(false); // still frame 0 (800 ms)
    expect(player.update(100)).toBe(true);
    expect(player.frame.index).toBe(1);
    expect(player.update(399)).toBe(false); // frame 1 lasts 400 ms
    expect(player.update(1)).toBe(true);
    expect(player.frame.index).toBe(0); // looped
  });

  it('carries leftover time into the next frame', () => {
    const player = createAnimationPlayer(ANIMATIONS);

    player.update(1000); // 800 for frame 0, 200 into frame 1
    player.update(200); // 400 reached: back to frame 0

    expect(player.frame.index).toBe(0);
  });

  it('skips several short frames in one long step', () => {
    const player = createAnimationPlayer(ANIMATIONS);
    player.play('blink');

    player.update(160); // 60 + 100: on the last frame

    expect(player.frame.index).toBe(2);
    expect(player.current).toBe('blink');
  });

  it('returns to idle when a one-shot animation ends', () => {
    const player = createAnimationPlayer(ANIMATIONS);
    player.play('blink');

    expect(player.update(220)).toBe(true);
    expect(player.current).toBe('idle');
    expect(player.frame.index).toBe(0);
  });

  it('restarts a one-shot animation that is played again', () => {
    const player = createAnimationPlayer(ANIMATIONS);
    player.play('blink');
    player.update(100);

    player.play('blink');

    expect(player.frame.index).toBe(2);
    expect(player.update(59)).toBe(false);
  });

  it('keeps a looping animation running when it is requested again', () => {
    const player = createAnimationPlayer(ANIMATIONS);
    player.update(900);

    player.play('idle');

    expect(player.frame.index).toBe(1);
  });

  it('falls back to idle for an animation the skin does not define', () => {
    const player = createAnimationPlayer(ANIMATIONS);
    player.update(900);

    player.play('hop');

    expect(player.current).toBe('idle');
    expect(player.frame.index).toBe(1); // idle keeps running, not restarted
  });

  it('reports whether play changed the visible frame', () => {
    const player = createAnimationPlayer(ANIMATIONS);

    expect(player.play('blink')).toBe(true);
    expect(player.play('hop')).toBe(true); // falls back to idle frame 0
    expect(player.play('idle')).toBe(false);
  });
});
