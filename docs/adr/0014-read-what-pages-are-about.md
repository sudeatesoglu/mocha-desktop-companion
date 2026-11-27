# ADR-0014: Read what pages are about, through a reader layer

- **Status:** Proposed
- **Date:** 2026-11-28
- **Amends:** [ADR-0012](0012-what-mocha-may-know-about-browsing.md): an eighth capability lets the extension send a page's visible text

## Context

With ADR-0012 and ADR-0013 (proposed), Mocha knows the kind of site, its name and a scrubbed title, and a model can write comments from these. A title says little: "Lifetimes - The Rust Book" or a video's name is as far as Mocha can understand. The owner wants Mocha to understand what a page is about and to comment on that, and to answer in the chat about what they read or watched.

That means reading page content, the most private thing Mocha has been asked to see so far. Pages hold names, messages, orders and much more than a title. They are also written by strangers, so their text may try to instruct a model (prompt injection). Small local models are slow on long text, and a page can be very long.

## Decision

We will let the user allow Mocha to read what pages are about, and send that text only through a reader layer that turns it into a short gist.

**An eighth capability, off by default: "Read what pages are about".** Like page activity, it needs Chrome's access to https sites. Main checks it again on every request.

**The extension takes the visible text, once per page:**
- the meta description, then the visible text of the page in reading order
- the main content (`main`, `article`) first, when the page marks one
- never: navigation, forms, inputs, buttons, editable areas, hidden elements, scripts, styles, frames
- the same filter as everything else (ADR-0012): never in incognito, on sensitive sites, on sites the user excluded, or while paused
- scrubbed like titles (addresses, emails, long numbers, tokens) and cut at 20,000 characters
- sent with `POST /v1/page` after the page loaded, once for each address; a page still rendering is tried again on the next update

The address is kept only in the extension's memory, to know a page was sent, and never leaves the browser.

**A reader layer in Mocha's main process:**
- The text is quoted as data, never as instructions.
- The reader model turns it into a gist: a topic of a few words and one sentence about what the page is and what the user seems to do there.
- Long text is split into chunks of about 4,000 characters, each read on its own (map), then combined (reduce). There are at most five chunks, so a page costs at most six calls.
- The reader is a separately chosen local model ("Reader model"). If none is chosen, Mocha's own model reads, Claude included: then the raw text goes to Anthropic with the user's key, and Settings says so.
- Gists are cached by the text's SHA-256, in memory only, so going back to a page costs nothing.

**Only the gist goes further.** The model that writes comments sees the gist and the allowed fields, never the raw text. With "Let the chat see what you browse", the last half hour's pages carry their gists. This second step is also a defence: whatever a page says to a model reaches the next model only as a cleaned sentence of at most 240 characters.

**Nothing is stored.** The text and the gists live in memory only. They are never written to disk or logged, and pause, sleep, a lock or quitting forget them. Memories and summaries never hold browsing (ADR-0013).

## Alternatives considered

- **Only the meta description and headings:** cheap and safer, but too little to understand a page. The owner wanted all the visible content.
- **Sending the raw text to the comment model directly:** one call fewer, but slow on long pages for small models, and every comment would carry a stranger's full text into the prompt.
- **Reading in the extension with a model in the browser:** keeps the text in the browser, but there is no model there that is good enough, small enough and available everywhere.
- **Keeping gists on disk:** Mocha could remember yesterday's reading, but it would end ADR-0012's promise that nothing about browsing is stored.

## Consequences

- Mocha can comment on, and answer about, what pages actually say.
- **The most private data Mocha has handled so far,** so it stays behind its own capability, the filter, the scrubber, the reader layer and memory-only storage. The README and the docs site say exactly what is read and where it goes.
- **Claude as the reader sends page text to Anthropic.** It is the owner's choice and is shown plainly; a local reader model keeps it on the computer.
- **Cost:** a local model reads each new page once, in the background. A slow reader delays only the gist, and comments fall back to the title.
- **The API grows a route** with a larger, bounded body: the same Host, Origin, token and rate checks as every route.
