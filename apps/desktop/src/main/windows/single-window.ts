/** What a single window needs from an Electron window. */
export interface SingleWindowTarget {
  show(): void;
  focus(): void;
  close(): void;
  on(event: 'closed', listener: () => void): unknown;
}

export interface SingleWindow<W extends SingleWindowTarget> {
  /** The open window, or undefined. */
  readonly current: W | undefined;
  /** Opens the window, or brings the open one forward. */
  open(): void;
  close(): void;
}

/**
 * At most one window of a kind, such as Settings or the Tower: opening it
 * again brings the existing one forward instead of creating a second.
 */
export function singleWindow<W extends SingleWindowTarget>(create: () => W): SingleWindow<W> {
  let current: W | undefined;
  return {
    get current() {
      return current;
    },
    open() {
      if (current) {
        current.show();
        current.focus();
        return;
      }
      const opened = create();
      current = opened;
      opened.on('closed', () => {
        if (current === opened) current = undefined;
      });
    },
    close() {
      current?.close();
    },
  };
}
