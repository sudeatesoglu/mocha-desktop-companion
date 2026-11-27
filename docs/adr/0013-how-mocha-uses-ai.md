# ADR-0013: Let Mocha use a language model only as the user allows, local first

- **Status:** Accepted
- **Date:** 2026-11-25, revised 2026-11-27, accepted 2026-11-28
- **Amends:** [ADR-0012](0012-what-mocha-may-know-about-browsing.md): main may keep the last half hour of browsing in memory for the chat

## Context

For v0.7 "Smart", Mocha should become smarter company:
- the user can chat with Mocha in the Tower;
- once a week Mocha shares what it noticed about the user's work and rest, with a gentle suggestion;
- its comments about browsing can be written for the moment rather than picked from fixed lines.

All three need a language model. That is a new kind of risk for a local-first app with no account and no telemetry. A model sees whatever is put into its prompt. A model in the cloud runs on someone else's computer. The user's words, their working hours and their browsing are among the most personal things Mocha could hand over. A model can also be steered by text it reads, such as a page title (prompt injection), and its answers cannot be fully predicted.

This decision sets, before any code, where the model runs, what it may see, what is kept, and who decides.

## Decision

We will make every AI feature opt-in, local first, and limited to what the user can see and turn off.

**Off by default.** Nothing is sent to any model until the user turns on AI in Mocha's Settings, picks where it runs and, for each feature, says yes. Turning AI off stops every feature at once.

**Where the model runs.** The user picks one:
- **On this computer (the default choice):** a model served by [Ollama](https://ollama.com) on `127.0.0.1`. Nothing leaves the computer. The user installs Ollama and a model; Settings lists the models it finds and says what to do when there are none.
- **Claude, with the user's own API key:** for better answers. Settings says plainly, before the key is saved, that the messages and the data listed below go to Anthropic under the user's own account. The key is encrypted with the operating system's keychain (Electron's `safeStorage`), never kept in `settings.json` in plain text, and never logged.

Mocha has no server and no key of its own. Only the main process talks to a model, and only to `127.0.0.1` or `api.anthropic.com`. The windows' content security policy stays as it is.

**What the model may see**, by feature:
- **Chat:** the user's messages in the conversation, and today's and this week's numbers: active time, breaks, focus sessions, rituals, Mocha's mood and energy. Behind a separate switch, "Let the chat see what you browse", also the pages of the last half hour, with only the browser fields the user allows (ADR-0012), so the user can ask Mocha about what they were just looking at.
- **Weekly insight:** the week's numbers per day, in the same terms. Never single sessions' times.
- **Comments:** only behind a separate switch, "Let AI write Mocha's comments". The comment may use the browser fields the user already allows (ADR-0012): kind of site, site name, scrubbed title. These go only into a comment's prompt, never into the chat or the insights.

Never: anything the extension's filter holds back, page activity counts, other apps, files, or anything the user did not type or allow.

**The last half hour, in memory only.** This amends ADR-0012, where main kept only the latest context. With the chat's browsing switch, main also keeps the pages of the last half hour (at most 40), with only the kind, site and scrubbed title, never activity counts. They live in memory only and are never written to disk or logged. The browser going quiet keeps them; a pause, sleep, a lock or quitting forgets them. They are filtered again by what the user allows at the moment they are read.

**Untrusted on the way in, plain on the way out.** Page titles and the user's own text go into prompts as quoted data, separate from Mocha's instructions, shortened and scrubbed. Mocha's persona tells the model to treat them as data. Answers are shown as plain text, never HTML, and are cut to a fixed length. The model has no tools and cannot act. It cannot change a setting, open a page or call the API; it can only return words. If a model fails or is slow, the comment falls back to the fixed lines and the chat says so.

**A memory in three layers**, in `mocha.db`, so Mocha can remember without sending everything every time:
- **Conversations:** the messages themselves, kept for 90 days by default (the user can change it). Older messages are deleted; their conversation's summary stays.
- **Summaries:** when a conversation ends, the model writes a few sentences about it.
- **Memories:** lasting facts Mocha picks up by itself, such as "is learning Rust" or "likes short breaks". Mocha says so in the chat when it remembers something. The Tower lists them under "What Mocha remembers", where each can be edited or deleted. Mocha is told not to keep secrets, credentials, health or money matters, or websites and pages the user browsed. Every memory passes the same scrubber as page titles before it is saved, and facts naming a site or about browsing are dropped.

Every message is answered within a fixed budget: the persona, the numbers, pinned memories and the few most relevant to the new message, the latest summaries, then the conversation so far. Relevance comes from SQLite's built-in full-text search (FTS5, BM25), recency and use, not from embeddings. Embeddings may come later as an optional layer, through Ollama.

The memory is robust by construction:
- migrations in transactions and WAL, as before
- foreign keys, so deleting a conversation deletes its messages
- `CHECK` constraints on roles and lengths
- triggers that keep the search index in step
- a cap on the number of memories, dropping the least used first

Browser data never enters the memory. "Forget everything" in the Tower and in Settings deletes the conversations, summaries and memories. With `secure_delete` on, the WAL emptied and the file vacuumed, nothing is left in the file. A weekly insight is kept until the next one replaces it. Comments are never stored. Prompts and answers are never logged.

**The persona is shared.** One system prompt in `@mocha/core` describes Mocha for every feature: playful like its comments (#176), never hurtful, never guilt, short, honest that it is a raven in a computer and not a person or a doctor. It is unit-tested for what it must always say, and so is the code that builds each prompt from only the allowed data.

**Limits.** Every request has a timeout and a token limit. Comments keep the rules of #176: at most one every ten minutes, never during focus, breaks, rituals, quiet hours or Hush.

## Alternatives considered

- **Cloud only:** the best answers, but it would make every user send their data away to get any of v0.7. It also needs an account and a key before anything works.
- **Local only:** the most private, but the quality depends on the user's computer, and some users would rather choose a stronger model.
- **A Mocha server with our own key:** easy for users, but it turns a local app into a service that sees everyone's data, costs money per message and needs an account. Against the local-first promise.
- **A model bundled with the app:** no setup, but hundreds of megabytes to gigabytes in every download, and the app would have to manage model files and updates. Ollama already does this well.
- **Keeping the browser out of the chat:** the first choice, but the user found Mocha could not answer "what was I just looking at". The browsing is now behind its own switch, kept in memory only, and never becomes a memory.
- **Keeping browsing history on disk:** Mocha could remember yesterday's pages too, but it would end ADR-0012's promise that nothing about browsing is stored. Half an hour in memory answers the question the user asked.
- **Not keeping the chat:** safer, but Mocha could not remember anything, which the user wanted. A one-step delete keeps the choice with them.
- **Sending the whole history every time:** simple, but prompts would grow without end, slow down and cost more with Claude.
- **Vector search now:** finds memories by meaning, but needs an embedding model and a native SQLite extension in the packaged, fused app. FTS5 is built in, deterministic and testable; embeddings can be added on top later.
- **Memories only when the user asks, or only after the user confirms:** the safest, but the user chose a Mocha that remembers by itself, made visible and deletable.

## Consequences

- The README's privacy promise gains an exact account of what each AI feature may send, and where.
- What the user and Mocha say about a page in the chat is kept like any chat (90 days by default). The memories and summaries never hold browsing.
- Settings gets an AI section: off, on this computer, or Claude with a key, plus one switch per feature. The Tower gets a chat and a place for the weekly insight.
- The database gets tables for conversations, messages, memories, their search indexes and the insight (a migration). Deleting them is one action, and so is deleting one memory.
- Summaries and memories are written by the same model the user chose, in the background after a conversation, under the same rules as any prompt.
- A second network destination (`api.anthropic.com`) exists, used only from main and only when the user chose Claude. Security reviews cover it like the local API.
- Answers vary. Tests cover what goes into prompts and how answers are handled, not what a model says.
- Ollama's own behavior and Anthropic's data handling are outside Mocha's control; Settings and the docs say so and link to their policies.
