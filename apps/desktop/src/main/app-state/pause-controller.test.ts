import { describe, expect, it, vi } from 'vitest';
import { createPauseController } from './pause-controller.ts';

describe('createPauseController', () => {
  it('starts running', () => {
    expect(createPauseController().paused).toBe(false);
  });

  it('toggles between paused and running, notifying listeners', () => {
    const pause = createPauseController();
    const listener = vi.fn();
    pause.onChange(listener);

    pause.toggle();
    pause.toggle();

    expect(listener.mock.calls).toEqual([[true], [false]]);
    expect(pause.paused).toBe(false);
  });

  it('does not notify when the state does not change', () => {
    const pause = createPauseController();
    const listener = vi.fn();
    pause.onChange(listener);

    pause.setPaused(false);

    expect(listener).not.toHaveBeenCalled();
  });

  it('notifies every listener and stops notifying after unsubscribe', () => {
    const pause = createPauseController();
    const first = vi.fn();
    const second = vi.fn();
    const unsubscribe = pause.onChange(first);
    pause.onChange(second);

    pause.setPaused(true);
    unsubscribe();
    pause.setPaused(false);

    expect(first.mock.calls).toEqual([[true]]);
    expect(second.mock.calls).toEqual([[true], [false]]);
  });
});
