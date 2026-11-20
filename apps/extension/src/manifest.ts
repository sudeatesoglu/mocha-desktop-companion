import { EXTENSION_PUBLIC_KEY } from '@mocha/core';

/**
 * The extension's manifest, written at build time. It asks for as little as
 * it can: `tabs` and access to all sites are optional and requested only
 * when the user turns on what needs them (ADR-0012).
 */
export function extensionManifest(version: string) {
  return {
    manifest_version: 3,
    name: 'Mocha',
    version,
    description:
      'Lets Mocha, your desktop companion, keep you company while you browse, knowing only what you allow.',
    // Fixes the extension's ID, which Mocha checks on every request (ADR-0011).
    key: EXTENSION_PUBLIC_KEY,
    minimum_chrome_version: '120',
    icons: { 128: 'icon.png' },
    action: { default_title: 'Mocha', default_icon: { 128: 'icon.png' } },
    background: { service_worker: 'background.js', type: 'module' },
    options_ui: { page: 'options.html', open_in_tab: true },
    // No warnings: storage for the settings, alarms for a check once a minute.
    permissions: ['storage', 'alarms'],
    optional_permissions: ['tabs'],
    // No host access at all, not even to Mocha: requests to 127.0.0.1 are
    // then ordinary CORS requests, and Chrome always sends the extension's
    // Origin, which Mocha checks (ADR-0011). With host access to
    // http://127.0.0.1, Chrome leaves Origin out of GET requests and Mocha
    // refuses them.
    // Only the extension's own code, and requests to Mocha only: even a bug
    // cannot load a script from elsewhere or send anything to another server.
    content_security_policy: {
      extension_pages:
        "default-src 'none'; script-src 'self'; style-src 'self'; img-src 'self'; connect-src http://127.0.0.1:*; object-src 'none'; base-uri 'none'; form-action 'none'; frame-ancestors 'none'",
    },
  } as const;
}
