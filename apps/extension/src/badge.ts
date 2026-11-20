import { CONNECTION_TEXTS } from './connection-texts.ts';
import type { Connection } from './mocha-client.ts';

/** The extension's toolbar badge and its tooltip. */
export interface Badge {
  text: string;
  title: string;
}

/**
 * A mark on the toolbar icon only when the user can do something about it:
 * a wrong code, or Chrome waiting for their OK. Mocha not running is normal
 * and only shows in the tooltip.
 */
export function badgeFor(state: {
  connection: Connection;
  paused: boolean;
  needsPermission: boolean;
}): Badge {
  if (state.paused) return { text: 'off', title: 'Mocha: paused. Nothing is sent.' };
  if (state.connection === 'wrong code' || state.connection === 'unexpected') {
    return { text: '!', title: `Mocha: ${CONNECTION_TEXTS[state.connection]}` };
  }
  if (state.connection === 'connected' && state.needsPermission) {
    return {
      text: '!',
      title: 'Mocha: Chrome needs your OK to see the tab in front. Click to open the options.',
    };
  }
  return { text: '', title: `Mocha: ${CONNECTION_TEXTS[state.connection]}` };
}
