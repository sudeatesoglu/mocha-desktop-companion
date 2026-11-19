# ADR-0011: Let the paired browser extension reach Mocha through a local API

- **Status:** Accepted
- **Date:** 2026-11-19

## Context

From v0.6, a browser extension tells Mocha what the user is doing in the browser, within what the user allows ([ADR-0012](0012-what-mocha-may-know-about-browsing.md)). Until now Mocha accepted input only from its own windows, through validated IPC ([ADR-0002](0002-electron-shell-with-overlay-window.md)). This is the first time something outside the app talks to it.

Two kinds of strangers must not get in:
- **Web pages:** any site can make the user's browser send requests to `127.0.0.1`. With DNS rebinding, a site can even make them look same-origin.
- **Other software on the computer:** it can connect to any local port and set any header.

## Decision

We will run a small HTTP API in Mocha's main process, for the paired extension only:

- **Off by default.** Nothing listens until the user allows the extension in Settings; turning it off closes the server, and so does quitting.
- **Loopback only.** It binds to `127.0.0.1`, never to all interfaces, so other machines cannot reach it. It uses a fixed default port; if that port is taken, Mocha picks a free one. The pairing code carries the port.
- **Host check:** the `Host` header must be exactly `127.0.0.1:<port>`. A DNS-rebinding page sends its own host name and is refused.
- **Origin check:** the `Origin` header must be our extension, `chrome-extension://<id>`. The ID is fixed by the manifest's `key`, so it is the same for every install. Browsers do not let pages fake `Origin`. CORS headers are sent for that origin only.
- **Pairing token:** every request carries `Authorization: Bearer <token>`. The token is 128 random bits from Settings' pairing code, compared in constant time. This is what keeps out other local software, which could fake the headers above. "New code" replaces the token, and the old one stops working at once.
- **Small, strict requests:**
  - JSON only, a body limit of a few kilobytes
  - strict Zod schemas, as for IPC
  - a rate limit per minute
- **Quiet failures:** the status codes are 400, 401, 403, 404, 405, 413, 415 and 429, without details. Logs record the reason, never a request body.
- **Nothing the browser sends is trusted.** Texts are shown as plain text, never as HTML. No remote content is loaded: the windows' CSP stays `img-src 'self'`.
- **One contract:** the endpoints are described in an OpenAPI 3.1 file (`docs/openapi.yaml`, #8), checked against the Zod schemas by a test.

Request handling is a pure function: request in, response out, with the token, the clock and the handlers injected. Every check is unit-tested without opening a socket. The token is stored in `settings.json`, in the user's own Library folder, like the other settings.

## Alternatives considered

- **Native messaging:** the browser starts a helper program and talks to it over stdin and stdout, so no port is open. But each connection starts a new process, which would have to relay into the running app. A host manifest also has to be installed into every browser's profile folder, which is awkward for an extension loaded in developer mode. Worth a second look for a Web Store release.
- **A WebSocket:** a lasting connection would let Mocha push to the extension, which it does not need. It has the same Host, Origin and token questions, and more state.
- **No authentication because it is only localhost:** any web page could reach it through the browser (DNS rebinding), and so could any local program.
- **A relay through a server:** against Mocha's local-first promise.

## Consequences

- Mocha opens a port for the first time, and only when the user asks. The README says so.
- Pairing is a manual step: copy a code from Settings and paste it into the extension.
- The extension's ID is fixed, so its manifest key is part of the repository. The key is public by nature; it identifies the extension and grants nothing.
- The API is versioned (`/v1/...`) and documented, so later integrations (desktop apps, other browsers) can reuse it.
