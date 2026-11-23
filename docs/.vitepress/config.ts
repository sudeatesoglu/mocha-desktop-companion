import { defineConfig } from 'vitepress';

const repo = 'https://github.com/sudeatesoglu/mocha-desktop-companion';

// Mocha's documentation site, published to GitHub Pages under the
// repository's name. Local-first like the app: no analytics, no remote
// fonts, nothing loaded from other sites.
export default defineConfig({
  title: 'Mocha',
  description: 'A pixel-art raven that keeps you company on your desktop.',
  lang: 'en',
  base: '/mocha-desktop-companion/',
  cleanUrls: true,
  lastUpdated: false,
  head: [['link', { rel: 'icon', type: 'image/png', href: '/mocha-desktop-companion/icon.png' }]],
  // The ADR index is the folder's page.
  rewrites: { 'adr/README.md': 'adr/index.md' },
  srcExclude: ['node_modules/**'],
  // Some pages link to the app's source, which lives outside the site.
  ignoreDeadLinks: [/\/(apps|packages)\//],
  themeConfig: {
    nav: [
      { text: 'Guide', link: '/guide/getting-started' },
      { text: 'API', link: '/api' },
      { text: 'Decisions', link: '/adr/' },
      { text: 'Changelog', link: `${repo}/blob/main/CHANGELOG.md` },
    ],
    sidebar: [
      {
        text: 'Guide',
        items: [
          { text: 'Getting started', link: '/guide/getting-started' },
          { text: 'The browser extension', link: '/guide/browser-extension' },
          { text: 'Your data', link: '/guide/your-data' },
        ],
      },
      {
        text: 'Developers',
        items: [
          { text: 'Local API', link: '/api' },
          { text: 'Skins', link: '/skins' },
          { text: 'Architecture decisions', link: '/adr/' },
        ],
      },
    ],
    socialLinks: [{ icon: 'github', link: repo }],
    search: { provider: 'local' },
    footer: { message: 'Mocha is local-first: no account, no telemetry.' },
  },
});
