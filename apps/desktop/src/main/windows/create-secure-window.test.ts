import { beforeEach, describe, expect, it, vi } from 'vitest';
import { createSecureWindow } from './create-secure-window.ts';

type Listener = (...args: unknown[]) => unknown;

interface FakeWindow {
  options: Record<string, unknown>;
  contentsListeners: Map<string, Listener>;
  windowOpenHandler: Listener | undefined;
  onceListeners: Map<string, Listener>;
  show: ReturnType<typeof vi.fn>;
}

// A stand-in for Electron's BrowserWindow that records what the factory does.
const created = vi.hoisted(() => ({ windows: [] as FakeWindow[] }));

vi.mock('electron', () => ({
  BrowserWindow: class {
    options: Record<string, unknown>;
    contentsListeners = new Map<string, Listener>();
    onceListeners = new Map<string, Listener>();
    windowOpenHandler: Listener | undefined;
    show = vi.fn();
    webContents = {
      on: (event: string, listener: Listener) => this.contentsListeners.set(event, listener),
      setWindowOpenHandler: (handler: Listener) => {
        this.windowOpenHandler = handler;
      },
    };
    once = (event: string, listener: Listener) => this.onceListeners.set(event, listener);

    constructor(options: Record<string, unknown>) {
      this.options = options;
      created.windows.push(this);
    }
  },
}));

const PRELOAD = '/app/out/preload/index.cjs';

function lastWindow(): FakeWindow {
  const window = created.windows.at(-1);
  if (!window) throw new Error('no window was created');
  return window;
}

describe('createSecureWindow', () => {
  beforeEach(() => {
    created.windows.length = 0;
  });

  it('creates the window with the security baseline', () => {
    createSecureWindow({ width: 200 }, PRELOAD);

    expect(lastWindow().options).toMatchObject({
      width: 200,
      webPreferences: { preload: PRELOAD, contextIsolation: true, sandbox: true },
    });
  });

  it('blocks every navigation away from the loaded page', () => {
    createSecureWindow({}, PRELOAD);
    const event = { preventDefault: vi.fn() };

    lastWindow().contentsListeners.get('will-navigate')?.(event, 'https://example.com/');

    expect(event.preventDefault).toHaveBeenCalledOnce();
  });

  it('denies every attempt to open a new window', () => {
    createSecureWindow({}, PRELOAD);

    expect(lastWindow().windowOpenHandler?.({ url: 'https://example.com/' })).toEqual({
      action: 'deny',
    });
  });

  it('shows the window once its content is ready', () => {
    createSecureWindow({}, PRELOAD);
    const window = lastWindow();
    expect(window.show).not.toHaveBeenCalled();

    window.onceListeners.get('ready-to-show')?.();

    expect(window.show).toHaveBeenCalledOnce();
  });

  it('does not wait for ready-to-show when the caller shows it immediately', () => {
    createSecureWindow({ show: true }, PRELOAD);

    expect(lastWindow().onceListeners.has('ready-to-show')).toBe(false);
  });
});
