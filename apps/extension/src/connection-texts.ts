import type { Connection } from './mocha-client.ts';

/** What each state of the link to Mocha means, in plain words. */
export const CONNECTION_TEXTS: Readonly<Record<Connection, string>> = {
  connected: 'Paired with Mocha.',
  'not paired': 'Not paired yet.',
  'not running':
    'Mocha isn’t answering. Is it running, with “Let the Mocha extension connect” on in its Settings?',
  'wrong code': 'The pairing code is wrong or old. Copy it again from Mocha’s Settings.',
  busy: 'Mocha is busy. Try again in a minute.',
  unexpected: 'Something other than Mocha answered. Copy the code again from Mocha’s Settings.',
};
