# ADR-0012: Let the user decide what Mocha may know about their browsing

- **Status:** Accepted
- **Date:** 2026-11-19
- **Amended by:** [ADR-0013](0013-how-mocha-uses-ai.md) (proposed): with the user's separate switch, main also keeps the last half hour of browsing in memory for the chat

## Context

Mocha is meant to keep the user company, not to watch them. Until v0.5 it read only how long ago the last keyboard or mouse input was, and the README promised it never looks at what you type, where you click or which apps you use.

For v0.6 the goal is a more present, talkative companion. Mocha should notice what the user is doing in the browser, react to it and talk about it: which kind of site, which page, and what is going on there. Knowing a page title is more than Mocha has ever known, and titles can hold private things: a name, an email subject, a diagnosis, an order number. Activity on a page is closer still to the keystrokes Mocha has always promised never to read. This needs one clear model, decided before any code: what is read, what leaves the browser, what is filtered, what is never kept, and who decides.

## Decision

We will let the user decide, and keep everything else out.

**Capabilities.** Each of these is off by default and turned on by the user in Mocha's Settings, with a plain line about what it means:

1. **Know what kind of site you are on:** code, docs, reading, video, music, social, chat, shopping or other.
2. **Know the site's name:** the domain only.
3. **Read page titles:** after the filter below.
4. **Talk about what you do:** short comments in a bubble.
5. **Nudge you:** for example after a long stretch on social media, or late at night. Never guilt.
6. **Notice what is going on in the browser:** whether a tab plays sound, how many tabs are open, how often you switch tabs and how long you stay on a page. The browser reports these itself; no page is looked into.
7. **Notice how busy you are on a page:** whether you are typing, scrolling or clicking, as counts over a short window. Never which keys, what text, what you click on or where.

Mocha's main process is the source of truth. The extension asks which capabilities are on and sends only those fields. Main drops anything else again, so a misbehaving extension cannot widen them.

**The filtering layer runs in the extension**, so nothing it removes ever leaves the browser:
- **Never sent:**
  - incognito windows
  - pages that are not http(s)
  - localhost, private network addresses and intranet names
  - sensitive kinds of sites: banking and payments, health, government and ID, mail and messaging, password managers, adult
  - login, sign-up, checkout, payment, account and password pages, recognized from their address
- **Titles are scrubbed:** emails, phone numbers, long runs of digits (cards, IDs, IBANs), web addresses and token-like strings are removed. Titles are shortened to 80 characters.
- **The site's name** is the registrable domain, never a path or a query.
- **The user's own exclusions** and a pause switch apply on top.

**Activity on a page (capability 7)** needs a small script in every page, so it gets extra rules:
- The script is registered only while the capability is on, and removed when it is turned off.
- It counts events and nothing else. It never reads a key's value, the text of a field, a click's target or the page's content.
- Keys typed in password fields are not even counted, since a count could reveal a password's length.
- Counts from a page the filter would not send are dropped in the extension, like everything else from that page.
- Only counts over a short window leave the browser, never single events.
The classifier, the sensitive lists and the scrubber are data and pure functions in `@mocha/core`, unit-tested rule by rule. Main runs the scrubber again on what it receives. The lists are shown to the user.

**Nothing about browsing is stored or logged.** Main keeps only the latest context in memory, to pick a pose and a comment. It forgets it on pause, on sleep or lock, and when the extension disconnects. Nothing goes to the database, the settings file or the logs.

**The user is told plainly, before anything is read.** The extension's first-run page, Mocha's Settings and the README say what is read, what is sent, what is never sent and that nothing is kept. Chrome's permissions are requested only when the user turns on the capability that needs them, with an explanation next to Chrome's own words:
- capabilities 1 to 6 need `tabs`, which shows as "Read your browsing history"
- capability 7 needs access to all sites, which shows as "Read and change all your data on all websites"; it is asked for separately, so 1 to 6 work without it

## Alternatives considered

- **The kind of site only:** the safest, but too little for the talkative companion the user asked for. It remains possible: the user can leave the other capabilities off.
- **Full addresses or page content:** far more than comments need, and much harder to keep private.
- **Classifying in the cloud or with an AI model:** against the local-first promise; AI features are planned separately and opt-in (v0.7).
- **Watching every page with no filter:** the user would have to trust that Mocha never says or keeps anything sensitive, with nothing to check it against.
- **Site-specific actions (a like, a post, a message sent, an item added to a cart):** they need code for every site that breaks when the site changes, and they reveal the most about the user. Left out.
- **Reading keys or text, even to say something clever:** that is a keylogger, whatever the intent. Never.

## Consequences

- The README's privacy promise changes from "never looks at what you do" to an exact description of what the user allows, what is filtered and that nothing is kept.
- The sensitive lists need care over time; they are data with tests, so additions are cheap.
- Some harmless pages will be filtered (a bank's blog, for example). We accept missing a comment to avoid saying something private.
- A Web Store release later will need a privacy disclosure that matches this ADR, and capability 7's broad permission will draw a closer review.
- Capability 7 is the most sensitive one. Its event counting is a pure function with tests for every rule above, including password fields.
