import { describe, expect, it } from 'vitest';
import { filterPage } from './filter.ts';
import { SENSITIVE_DOMAINS } from './sensitive.ts';
import { classifySite, SITE_KIND_DOMAINS } from './site-kinds.ts';

const page = (url: string, extra: { incognito?: boolean; exclusions?: string[] } = {}) =>
  filterPage({ url, incognito: false, exclusions: [], ...extra });

describe('filterPage', () => {
  it('sends an ordinary page as its site and kind', () => {
    expect(page('https://github.com/sudeatesoglu/mocha-desktop-companion/pull/181')).toEqual({
      send: true,
      site: 'github.com',
      kind: 'code',
      titleAllowed: true,
    });
    expect(page('https://www.example.org/about')).toMatchObject({
      site: 'example.org',
      kind: 'other',
    });
  });

  it('reads the host past a user name, a port and a query', () => {
    expect(page('https://me:secret@GitHub.com:443/a?b=c#d')).toMatchObject({
      send: true,
      site: 'github.com',
    });
  });

  it('never sends a private window', () => {
    expect(page('https://github.com', { incognito: true })).toEqual({
      send: false,
      reason: 'private window',
    });
  });

  it.each([
    'chrome://settings',
    'about:blank',
    'file:///Users/me/notes.txt',
    'chrome-extension://abc/options.html',
    'https:///no-host',
    'not a url',
  ])('never sends %s, which is not a web page', (url) => {
    expect(page(url)).toEqual({ send: false, reason: 'not a web page' });
  });

  it.each([
    'http://localhost:5173/',
    'http://127.0.0.1:47213/v1/health',
    'http://192.168.1.10/admin',
    'http://[::1]/',
    'https://printer.local/',
    'https://wiki.corp/',
    'http://intranet/',
    'http://localhost./',
  ])('never sends %s on this computer or a private network', (url) => {
    expect(page(url)).toEqual({ send: false, reason: 'private network' });
  });

  it.each([
    'https://www.paypal.com/myaccount/summary',
    'https://online.isbank.com.tr/',
    'https://www.turkiye.gov.tr/',
    'https://mhrs.gov.tr/',
    'https://mail.google.com/mail/u/0/#inbox',
    'https://web.whatsapp.com/',
    'https://app.slack.com/client/T1/C1',
    'https://discord.com/channels/1/2',
    'https://vault.bitwarden.com/',
    'https://www.xvideos.com/',
    'https://www.anybank.example/',
    'https://irs.gov/',
    'https://accounts.example.com/',
    'https://mail.yandex.com/',
    'https://www.acibademhastane.example/',
  ])('never sends a sensitive site: %s', (url) => {
    expect(page(url)).toEqual({ send: false, reason: 'sensitive' });
  });

  it.each([
    'https://github.com/login',
    'https://www.amazon.com/ap/signin?openid=1',
    'https://shop.example.com/checkout/step-2',
    'https://www.trendyol.com/sepet/payment',
    'https://example.com/account/settings',
    'https://example.com/password/reset',
    'https://www.trendyol.com/giris',
    'https://www.hepsiburada.com/uyelik/uye-ol',
    'https://www.n11.com/odeme/adim-2',
    'https://example.com.tr/hesabim/siparislerim',
  ])('never sends a sign-in, payment or account page: %s', (url) => {
    expect(page(url)).toEqual({ send: false, reason: 'sensitive' });
  });

  it('never sends a site the user excluded, with its subdomains', () => {
    const exclusions = ['reddit.com'];

    expect(page('https://old.reddit.com/r/all', { exclusions })).toEqual({
      send: false,
      reason: 'excluded',
    });
    expect(page('https://github.com', { exclusions })).toMatchObject({ send: true });
  });

  it('sends AI chats without their titles', () => {
    expect(page('https://chatgpt.com/c/123')).toMatchObject({ kind: 'chat', titleAllowed: false });
  });

  it('checks every listed sensitive domain', () => {
    for (const domains of Object.values(SENSITIVE_DOMAINS)) {
      for (const domain of domains) {
        // A listed suffix such as "gov" is tried on a real-looking host.
        const host = domain.includes('.') ? domain : `agency.${domain}`;
        expect(page(`https://${host}/`)).toEqual({ send: false, reason: 'sensitive' });
      }
    }
  });
});

describe('classifySite', () => {
  it('knows each listed site by its kind', () => {
    for (const [kind, domains] of SITE_KIND_DOMAINS) {
      for (const domain of domains) expect(classifySite(domain)).toBe(kind);
    }
  });

  it('prefers a specific domain over a general one', () => {
    expect(classifySite('music.youtube.com')).toBe('music');
    expect(classifySite('www.youtube.com')).toBe('video');
  });

  it('recognizes documentation by its address, and calls the rest other', () => {
    expect(classifySite('docs.astro.build')).toBe('docs');
    expect(classifySite('example.org')).toBe('other');
  });

  it.each([
    ['sonanime.com', '/anime/ore-dake-level-up-na-ken/season/1/episode/4', 'video'],
    ['example.tv', '/watch?v=1', 'video'],
    ['diziizle.example', '/dizi/kara-kuzgun/1-sezon/3-bolum', 'video'],
    ['films.example', '/izle/kuzgun', 'video'],
    ['radio.example', '/playlist/lofi', 'music'],
    ['project.example', '/docs/getting-started', 'docs'],
    ['someone.example', '/blog/ravens-in-winter.html', 'reading'],
    ['gazete.example', '/haber/12345', 'reading'],
    ['crafts.example', '/urun/kuzgun-figuru', 'shopping'],
    ['blog.example.org', '/', 'reading'],
    ['shop.example.org', '/', 'shopping'],
    ['learn.example.org', '/', 'docs'],
  ])('guesses the kind of %s%s from its address: %s', (host, path, kind) => {
    expect(classifySite(host, path)).toBe(kind);
  });

  it.each([
    ['example.org', '/'],
    ['example.org', '/watchmen-review'],
    ['example.org', '/about/videography'],
    ['example.org', '/user/settings'],
  ])('does not read a kind into %s%s', (host, path) => {
    expect(classifySite(host, path)).toBe('other');
  });

  it('prefers the lists to any hint', () => {
    expect(classifySite('github.com', '/sudeatesoglu/mocha/blob/dev/docs/video.md')).toBe('code');
  });

  it('guesses only for pages it would send', () => {
    expect(
      filterPage({ url: 'https://stream.example/watch/1', incognito: false, exclusions: [] }),
    ).toMatchObject({ kind: 'video', site: 'stream.example' });
    expect(
      filterPage({ url: 'https://watch.example/login', incognito: false, exclusions: [] }),
    ).toEqual({ send: false, reason: 'sensitive' });
  });

  it('lists no sensitive site as an ordinary kind', () => {
    for (const [, domains] of SITE_KIND_DOMAINS) {
      for (const domain of domains)
        expect(page(`https://${domain}/`)).toMatchObject({ send: true });
    }
  });
});
