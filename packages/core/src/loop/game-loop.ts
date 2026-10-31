/** Cancels a scheduled callback. */
export type Cancel = () => void;

/**
 * Time and scheduling, injected so the loop has no platform dependency.
 * The renderer passes the browser's clock and timers; tests pass a fake
 * clock they move by hand.
 */
export interface LoopScheduler {
  /** Monotonic time in milliseconds. */
  now(): number;
  /** Runs `callback` once after `ms` milliseconds. */
  after(ms: number, callback: () => void): Cancel;
  /** Runs `callback` before the next repaint. */
  nextFrame(callback: () => void): Cancel;
}

export interface GameLoopOptions {
  /** Length of one logic step in milliseconds. */
  stepMs: number;
  /** Advances the game by one step. Returns true if anything visible changed. */
  update(stepMs: number): boolean;
  /** Draws the current state. Called only when something changed. */
  render(): void;
  scheduler: LoopScheduler;
  /** Upper bound for the time handled in one tick. Defaults to 250 ms. */
  maxElapsedMs?: number;
}

export interface GameLoop {
  start(): void;
  stop(): void;
  /** Requests a render on the next frame, e.g. after user input. */
  invalidate(): void;
  readonly running: boolean;
}

const DEFAULT_MAX_ELAPSED_MS = 250;

/**
 * Fixed-timestep loop with dirty-flag rendering (ADR-0004).
 *
 * - Logic advances in equal steps, so behavior does not depend on the
 *   display's refresh rate or on how late a timer fires.
 * - The loop wakes at the step rate, not at 60 fps: pixel art does not need
 *   more, and an always-on companion must stay cheap.
 * - Rendering happens only when an update or an input changed something.
 */
export function createGameLoop(options: GameLoopOptions): GameLoop {
  const { stepMs, update, render, scheduler } = options;
  const maxElapsedMs = options.maxElapsedMs ?? DEFAULT_MAX_ELAPSED_MS;
  if (!(stepMs > 0 && Number.isFinite(stepMs))) {
    throw new RangeError(`stepMs must be a positive finite number, got ${stepMs}`);
  }

  let running = false;
  let dirty = false;
  let last = 0;
  let accumulator = 0;
  let cancelTick: Cancel | undefined;
  let cancelFrame: Cancel | undefined;

  function draw(): void {
    if (!dirty) return;
    dirty = false;
    render();
  }

  function stop(): void {
    running = false;
    cancelTick?.();
    cancelFrame?.();
    cancelTick = undefined;
    cancelFrame = undefined;
  }

  /**
   * Runs loop work; if it throws, stops the loop before rethrowing. Without
   * this, a failed tick would schedule nothing while `running` stayed true,
   * and start() could never revive the loop.
   */
  function guarded(work: () => void): void {
    try {
      work();
    } catch (error) {
      stop();
      throw error;
    }
  }

  function tick(): void {
    guarded(() => {
      const now = scheduler.now();
      // Clamp: after sleep or a long freeze, skip ahead instead of catching up.
      accumulator += Math.min(now - last, maxElapsedMs);
      last = now;

      while (accumulator >= stepMs) {
        if (update(stepMs)) dirty = true;
        accumulator -= stepMs;
      }

      draw();
      cancelTick = scheduler.after(stepMs, tick);
    });
  }

  return {
    get running() {
      return running;
    },

    start() {
      if (running) return;
      running = true;
      last = scheduler.now(); // time spent stopped is not replayed
      accumulator = 0;
      dirty = true; // draw the first frame right away
      guarded(() => {
        draw();
        cancelTick = scheduler.after(stepMs, tick);
      });
    },

    stop,

    invalidate() {
      if (!running) return;
      dirty = true;
      if (cancelFrame) return; // a frame is already requested
      cancelFrame = scheduler.nextFrame(() => {
        cancelFrame = undefined;
        guarded(draw);
      });
    },
  };
}
