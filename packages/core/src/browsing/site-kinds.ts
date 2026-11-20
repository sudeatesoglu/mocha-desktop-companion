import type { SiteKind } from './context.ts';
import { matchesDomain } from './domains.ts';

/**
 * Well-known sites of each kind, as data: adding one needs no code. The
 * first kind that matches wins, so specific domains (music.youtube.com,
 * docs.github.com) come before general ones (youtube.com, github.com).
 */
export const SITE_KIND_DOMAINS: readonly (readonly [
  Exclude<SiteKind, 'other'>,
  readonly string[],
])[] = [
  [
    'music',
    [
      'music.youtube.com',
      'spotify.com',
      'soundcloud.com',
      'music.apple.com',
      'deezer.com',
      'bandcamp.com',
      'tidal.com',
    ],
  ],
  [
    'docs',
    [
      'developer.mozilla.org',
      'readthedocs.io',
      'docs.python.org',
      'learn.microsoft.com',
      'developer.apple.com',
      'docs.github.com',
      'electronjs.org',
      'typescriptlang.org',
      'react.dev',
      'nodejs.org',
    ],
  ],
  [
    'code',
    [
      'github.com',
      'gitlab.com',
      'bitbucket.org',
      'stackoverflow.com',
      'stackexchange.com',
      'codepen.io',
      'codesandbox.io',
      'replit.com',
      'npmjs.com',
      'leetcode.com',
    ],
  ],
  [
    'video',
    [
      'youtube.com',
      'vimeo.com',
      'twitch.tv',
      'netflix.com',
      'primevideo.com',
      'disneyplus.com',
      'mubi.com',
      'dailymotion.com',
    ],
  ],
  [
    'social',
    [
      'x.com',
      'twitter.com',
      'facebook.com',
      'instagram.com',
      'linkedin.com',
      'reddit.com',
      'tiktok.com',
      'threads.net',
      'bsky.app',
      'mastodon.social',
      'pinterest.com',
      'tumblr.com',
    ],
  ],
  // AI assistants. Messaging with people is sensitive and never sent.
  [
    'chat',
    ['chatgpt.com', 'claude.ai', 'gemini.google.com', 'perplexity.ai', 'copilot.microsoft.com'],
  ],
  [
    'shopping',
    [
      'amazon.com',
      'amazon.com.tr',
      'amazon.co.uk',
      'amazon.de',
      'trendyol.com',
      'hepsiburada.com',
      'n11.com',
      'etsy.com',
      'ebay.com',
      'aliexpress.com',
      'ikea.com',
    ],
  ],
  [
    'reading',
    [
      'wikipedia.org',
      'medium.com',
      'substack.com',
      'dev.to',
      'news.ycombinator.com',
      'nytimes.com',
      'theguardian.com',
      'bbc.co.uk',
      'bbc.com',
      'arxiv.org',
      'goodreads.com',
    ],
  ],
];

/** The kind of site `hostname` is, or "other" for sites Mocha does not know. */
export function classifySite(hostname: string): SiteKind {
  for (const [kind, domains] of SITE_KIND_DOMAINS) {
    if (domains.some((domain) => matchesDomain(hostname, domain))) return kind;
  }
  // Documentation sites tend to say so in their address.
  if (/^docs?\./i.test(hostname)) return 'docs';
  return 'other';
}
