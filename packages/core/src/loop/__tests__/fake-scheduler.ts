import type { Cancel, LoopScheduler } from '../game-loop.ts';

interface Timer {
  due: number;
  callback: () => void;
  cancelled: boolean;
}

/**
 * A scheduler whose clock only moves when a test says so.
 *
 * `advance(ms)` jumps the clock forward and then fires every timer that has
 * become due, at the *new* time. That models a busy or sleeping thread: the
 * timer runs late, and the loop must cope with the larger elapsed time.
 */
export class FakeScheduler implements LoopScheduler {
  time = 0;
  private timers: Timer[] = [];
  private frames: Array<{ callback: () => void; cancelled: boolean }> = [];

  now = (): number => this.time;

  after = (ms: number, callback: () => void): Cancel => {
    const timer = { due: this.time + ms, callback, cancelled: false };
    this.timers.push(timer);
    return () => {
      timer.cancelled = true;
    };
  };

  nextFrame = (callback: () => void): Cancel => {
    const frame = { callback, cancelled: false };
    this.frames.push(frame);
    return () => {
      frame.cancelled = true;
    };
  };

  /** Moves the clock to now + ms, then fires timers that became due. */
  advance(ms: number): void {
    this.time += ms;
    for (;;) {
      const due = this.timers
        .filter((timer) => !timer.cancelled && timer.due <= this.time)
        .sort((a, b) => a.due - b.due)[0];
      if (!due) break;
      due.cancelled = true;
      due.callback();
    }
  }

  /** Runs pending animation frames, like the browser's next repaint. */
  flushFrames(): void {
    const frames = this.frames;
    this.frames = [];
    for (const frame of frames) if (!frame.cancelled) frame.callback();
  }

  get pendingTimers(): number {
    return this.timers.filter((timer) => !timer.cancelled).length;
  }

  get pendingFrames(): number {
    return this.frames.filter((frame) => !frame.cancelled).length;
  }
}
