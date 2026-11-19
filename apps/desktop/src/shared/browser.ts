import type { BrowserCapabilities, BrowserCapability } from '@mocha/core';

/** The browser companion as the settings window shows it. */
export interface BrowserView {
  /** Whether the extension may connect. */
  allowed: boolean;
  /** The code to paste into the extension, while the API listens. */
  pairingCode: string | null;
  capabilities: BrowserCapabilities;
}

/**
 * Each capability in plain words, in the order Settings lists them
 * (ADR-0012): first what Mocha may know, then what it may do.
 */
export const CAPABILITY_TEXTS: readonly {
  name: BrowserCapability;
  label: string;
  hint: string;
}[] = [
  {
    name: 'kind',
    label: 'Know what kind of site you are on',
    hint: 'Code, docs, video, music, social and so on.',
  },
  { name: 'site', label: 'Know the site’s name', hint: 'Only the domain, like github.com.' },
  {
    name: 'title',
    label: 'Read page titles',
    hint: 'After addresses, numbers and links are taken out.',
  },
  {
    name: 'browserActivity',
    label: 'Notice what is going on in the browser',
    hint: 'Whether a tab plays sound, how many tabs are open, how often you switch and how long you stay.',
  },
  {
    name: 'pageActivity',
    label: 'Notice how busy you are on a page',
    hint: 'Typing, scrolling and clicking, as counts. Never what you type or click on. Chrome will ask for access to all sites.',
  },
  {
    name: 'talk',
    label: 'Talk about what you do',
    hint: 'Short comments in a bubble next to Mocha.',
  },
  {
    name: 'nudge',
    label: 'Nudge you',
    hint: 'A gentle word after a long stretch on social media, or late at night.',
  },
];
