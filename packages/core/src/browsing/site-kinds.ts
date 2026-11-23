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

// Hints in an address, for sites that are not on the lists, as data. Words
// are whole path segments (or start one, like "watch?v=1"), in English and
// Turkish ("izle" watch, "bolum" episode, "haber" news, "urun" product,
// "sarki" song). The first match wins, so the strongest hints come first.
export const SITE_KIND_PATH_HINTS: readonly (readonly [
  Exclude<SiteKind, 'other'>,
  readonly string[],
])[] = [
  [
    'video',
    [
      'watch',
      'episode',
      'episodes',
      'video',
      'videos',
      'movie',
      'movies',
      'film',
      'films',
      'series',
      'stream',
      'izle',
      'bolum',
      'dizi',
    ],
  ],
  [
    'music',
    ['music', 'song', 'songs', 'album', 'albums', 'playlist', 'track', 'tracks', 'sarki', 'muzik'],
  ],
  [
    'docs',
    ['docs', 'doc', 'documentation', 'reference', 'manual', 'guide', 'guides', 'wiki', 'api'],
  ],
  [
    'reading',
    [
      'blog',
      'article',
      'articles',
      'news',
      'post',
      'posts',
      'story',
      'stories',
      'haber',
      'makale',
      'yazi',
    ],
  ],
  ['shopping', ['product', 'products', 'shop', 'store', 'urun', 'magaza']],
];

// Hosts that say what they are: docs.example.com, blog.example.com.
const HOST_HINTS: readonly (readonly [Exclude<SiteKind, 'other'>, RegExp])[] = [
  ['docs', /^(docs?|developer|developers|learn)\./i],
  ['reading', /^(blog|news|haber)\./i],
  ['video', /^(video|tv|watch)\./i],
  ['music', /^(music|muzik)\./i],
  ['shopping', /^(shop|store|magaza)\./i],
];

/** The words of a path, lowercased: "/Watch?v=1" gives ["watch"]. */
const segments = (pathname: string) =>
  pathname
    .toLowerCase()
    .split('/')
    .map((segment) => segment.replace(/[?#.;].*$/, ''))
    .filter(Boolean);

/**
 * The kind of site `hostname` is, or "other" for sites Mocha does not know.
 * The lists come first; for other sites, the host and then the path
 * (`pathname`) may give the kind away. The address is only read here,
 * never sent (ADR-0012).
 */
export function classifySite(hostname: string, pathname = '/'): SiteKind {
  for (const [kind, domains] of SITE_KIND_DOMAINS) {
    if (domains.some((domain) => matchesDomain(hostname, domain))) return kind;
  }
  for (const [kind, host] of HOST_HINTS) if (host.test(hostname)) return kind;
  const words = segments(pathname);
  for (const [kind, hints] of SITE_KIND_PATH_HINTS) {
    if (words.some((word) => hints.includes(word))) return kind;
  }
  return 'other';
}
