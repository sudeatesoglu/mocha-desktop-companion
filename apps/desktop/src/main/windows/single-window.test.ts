import { describe, expect, it, vi } from 'vitest';
import { singleWindow } from './single-window.ts';

function fakeWindow() {
  const listeners: (() => void)[] = [];
  return {
    show: vi.fn(),
    focus: vi.fn(),
    close: vi.fn(),
    on: vi.fn((_event: 'closed', listener: () => void) => listeners.push(listener)),
    emitClosed: () => {
      for (const listener of listeners) listener();
    },
  };
}

describe('singleWindow', () => {
  it('creates the window once and brings it forward after that', () => {
    const window = fakeWindow();
    const create = vi.fn(() => window);
    const single = singleWindow(create);

    single.open();
    single.open();

    expect(create).toHaveBeenCalledOnce();
    expect(window.show).toHaveBeenCalledOnce();
    expect(window.focus).toHaveBeenCalledOnce();
    expect(single.current).toBe(window);
  });

  it('creates a new window after the old one closed', () => {
    const first = fakeWindow();
    const second = fakeWindow();
    const single = singleWindow(vi.fn().mockReturnValueOnce(first).mockReturnValueOnce(second));

    single.open();
    first.emitClosed();
    expect(single.current).toBeUndefined();
    single.open();

    expect(single.current).toBe(second);
  });

  it('closes the open window, and does nothing when none is open', () => {
    const window = fakeWindow();
    const single = singleWindow(() => window);

    single.close();
    single.open();
    single.close();

    expect(window.close).toHaveBeenCalledOnce();
  });

  it('ignores a late "closed" from a window it already replaced', () => {
    const first = fakeWindow();
    const second = fakeWindow();
    const single = singleWindow(vi.fn().mockReturnValueOnce(first).mockReturnValueOnce(second));
    single.open();
    first.emitClosed();
    single.open();

    first.emitClosed();

    expect(single.current).toBe(second);
  });
});
