import { beforeEach, describe, expect, it, vi } from 'vitest';
import { FakeScheduler } from './__tests__/fake-scheduler.ts';
import { createGameLoop } from './game-loop.ts';

const STEP = 100;

describe('createGameLoop', () => {
  let scheduler: FakeScheduler;
  let update: ReturnType<typeof vi.fn<(stepMs: number) => boolean>>;
  let render: ReturnType<typeof vi.fn<() => void>>;

  const loopWith = (changes: boolean) => {
    update.mockReturnValue(changes);
    return createGameLoop({ stepMs: STEP, update, render, scheduler });
  };

  beforeEach(() => {
    scheduler = new FakeScheduler();
    update = vi.fn<(stepMs: number) => boolean>();
    render = vi.fn<() => void>();
  });

  describe('fixed timestep', () => {
    it('advances logic in fixed steps of stepMs', () => {
      loopWith(true).start();

      for (let i = 0; i < 3; i++) scheduler.advance(STEP);

      expect(update).toHaveBeenCalledTimes(3);
      expect(update).toHaveBeenCalledWith(STEP);
    });

    it('catches up when a timer fires late, keeping the remainder for later', () => {
      loopWith(true).start();

      // The thread was busy: the first tick only runs at 230 ms.
      scheduler.advance(230);
      expect(update).toHaveBeenCalledTimes(2); // 30 ms carried over

      scheduler.advance(170);
      expect(update).toHaveBeenCalledTimes(4); // 30 + 170 = 2 steps, nothing left
    });

    it('runs the same number of steps however the time is sliced', () => {
      // Any slicing below the clamp gives the same result: 1000 ms = 10 steps.
      loopWith(true).start();
      for (let i = 0; i < 10; i++) scheduler.advance(STEP);
      const evenSlices = update.mock.calls.length;

      update.mockClear();
      const other = new FakeScheduler();
      createGameLoop({ stepMs: STEP, update, render, scheduler: other }).start();
      for (const slice of [250, 150, 200, 180, 220]) other.advance(slice);

      expect(evenSlices).toBe(10);
      expect(update.mock.calls.length).toBe(evenSlices);
    });

    it('clamps a long pause so waking from sleep does not replay a burst of steps', () => {
      loopWith(true).start();

      scheduler.advance(10 * 60_000); // laptop lid closed for ten minutes

      expect(update).toHaveBeenCalledTimes(2); // capped at 250 ms by default
    });

    it('accepts a custom clamp', () => {
      update.mockReturnValue(true);
      createGameLoop({ stepMs: STEP, update, render, scheduler, maxElapsedMs: 500 }).start();

      scheduler.advance(10_000);

      expect(update).toHaveBeenCalledTimes(5);
    });
  });

  describe('dirty-flag rendering', () => {
    it('renders once on start', () => {
      loopWith(false).start();

      expect(render).toHaveBeenCalledOnce();
    });

    it('does not render when nothing changed', () => {
      loopWith(false).start();
      render.mockClear();

      scheduler.advance(1_000);

      expect(update).toHaveBeenCalled();
      expect(render).not.toHaveBeenCalled();
    });

    it('renders once per tick even if several steps changed something', () => {
      loopWith(true).start();
      render.mockClear();

      scheduler.advance(250); // one late tick, two steps

      expect(update).toHaveBeenCalledTimes(2);
      expect(render).toHaveBeenCalledOnce();
    });
  });

  describe('input path', () => {
    it('renders on the next animation frame instead of waiting for the next step', () => {
      const loop = loopWith(false);
      loop.start();
      render.mockClear();

      loop.invalidate();
      scheduler.flushFrames();

      expect(render).toHaveBeenCalledOnce();
    });

    it('requests a single frame for several invalidations', () => {
      const loop = loopWith(false);
      loop.start();

      loop.invalidate();
      loop.invalidate();
      loop.invalidate();

      expect(scheduler.pendingFrames).toBe(1);
    });

    it('does not draw twice when a tick already rendered the invalidated state', () => {
      const loop = loopWith(false);
      loop.start();
      render.mockClear();

      loop.invalidate();
      scheduler.advance(STEP); // the tick renders first
      scheduler.flushFrames(); // nothing left to draw

      expect(render).toHaveBeenCalledOnce();
    });

    it('ignores invalidation while stopped', () => {
      const loop = loopWith(false);

      loop.invalidate();

      expect(scheduler.pendingFrames).toBe(0);
    });
  });

  describe('lifecycle', () => {
    it('reports whether it is running', () => {
      const loop = loopWith(false);
      expect(loop.running).toBe(false);

      loop.start();
      expect(loop.running).toBe(true);

      loop.stop();
      expect(loop.running).toBe(false);
    });

    it('cancels pending timers and frames when stopped', () => {
      const loop = loopWith(true);
      loop.start();
      loop.invalidate();

      loop.stop();

      expect(scheduler.pendingTimers).toBe(0);
      expect(scheduler.pendingFrames).toBe(0);
    });

    it('does not replay the stopped time when started again', () => {
      const loop = loopWith(true);
      loop.start();
      loop.stop();
      scheduler.advance(5_000); // hidden for five seconds

      loop.start();
      scheduler.advance(STEP);

      expect(update).toHaveBeenCalledOnce();
    });

    it('ignores a second start', () => {
      const loop = loopWith(true);
      loop.start();
      loop.start();

      scheduler.advance(STEP);

      expect(update).toHaveBeenCalledOnce();
      expect(scheduler.pendingTimers).toBe(1);
    });
  });

  describe('failures', () => {
    it('stops and rethrows when an update throws, and can be started again', () => {
      const loop = loopWith(true);
      loop.start();
      update.mockImplementationOnce(() => {
        throw new Error('broken update');
      });

      expect(() => scheduler.advance(STEP)).toThrow('broken update');
      expect(loop.running).toBe(false);
      expect(scheduler.pendingTimers).toBe(0);

      loop.start();
      scheduler.advance(STEP);
      expect(loop.running).toBe(true);
    });

    it('stops and rethrows when rendering on the input path throws', () => {
      const loop = loopWith(false);
      loop.start();
      render.mockImplementationOnce(() => {
        throw new Error('broken render');
      });

      loop.invalidate();

      expect(() => scheduler.flushFrames()).toThrow('broken render');
      expect(loop.running).toBe(false);
    });

    it('does not stay marked as running when the first render throws', () => {
      render.mockImplementationOnce(() => {
        throw new Error('broken first frame');
      });
      const loop = loopWith(false);

      expect(() => loop.start()).toThrow('broken first frame');
      expect(loop.running).toBe(false);
      expect(scheduler.pendingTimers).toBe(0);
    });
  });

  it.each([0, -1, Number.NaN, Number.POSITIVE_INFINITY])('rejects a step of %s', (stepMs) => {
    expect(() => createGameLoop({ stepMs, update, render, scheduler })).toThrow(RangeError);
  });
});
