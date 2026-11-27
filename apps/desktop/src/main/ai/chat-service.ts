import {
  allowedContext,
  type BrowserCapabilities,
  type ChatTurn,
  chatPrompt,
  cleanAnswer,
  type DailyStats,
  type DayNumbers,
  MAX_MESSAGE_CHARS,
  MESSAGE_RETENTION_DAYS,
  type MochaFeelings,
  memoryQuery,
  parseSummary,
  type RecentPage,
  type SiteKind,
  summaryPrompt,
  untrusted,
} from '@mocha/core';
import type { AiProblem } from '../../shared/ai.ts';
import type { MemoryRepository } from '../db/memory-repository.ts';
import type { AiProvider } from './ai-provider.ts';

/** Why Mocha cannot chat right now: the chat is off, or the model failed. */
export type ChatProblem = AiProblem | 'off';
export type ChatReply = { ok: true; text: string } | { ok: false; problem: ChatProblem };

/** A chat prompt's size: enough for memories, summaries and the talk so far. */
export const CHAT_BUDGET_TOKENS = 3_000;
export const CHAT_ANSWER_TOKENS = 400;
export const MAX_CHAT_ANSWER_CHARS = 1_200;
/** Memories and summaries that may go into one prompt, most relevant first. */
const RECALLED = 8;
const SUMMARIES = 3;
/** Turns of the conversation going on that may go into a prompt. */
const HISTORY = 20;

export interface ChatDeps {
  memory: MemoryRepository;
  /** Whether the user lets Mocha chat (AI on, chat switched on). */
  enabled(): boolean;
  /** The model to ask, why there is none, or undefined while AI is off. */
  provider(): AiProvider | AiProblem | undefined;
  /**
   * What Mocha may know besides the chat (ADR-0013): numbers, and the last
   * half hour of browsing only when the user allows it.
   */
  context(): { today?: DayNumbers; feelings?: MochaFeelings; browsing?: RecentPage[] };
  now(): number;
}

/**
 * Mocha's chat (ADR-0013): each message is answered with the conversation
 * so far, the memories that matter and the latest summaries, within a
 * budget. Both sides are kept only once the answer came; ended
 * conversations are summed up later, and what Mocha learns is remembered.
 */
export function createChatService(deps: ChatDeps) {
  const model = (): AiProvider | ChatProblem => {
    if (!deps.enabled()) return 'off';
    return deps.provider() ?? 'off';
  };

  return {
    /** The conversation going on, oldest first; empty once it has ended. */
    history(): ChatTurn[] {
      const conversation = deps.memory.currentConversation(deps.now());
      return conversation === undefined ? [] : deps.memory.turns(conversation, 50);
    },

    async send(message: string, onText?: (piece: string) => void): Promise<ChatReply> {
      const text = untrusted(message, MAX_MESSAGE_CHARS);
      if (!text) return { ok: false, problem: 'unavailable' };
      const provider = model();
      if (typeof provider === 'string') return { ok: false, problem: provider };
      const now = deps.now();
      const conversation = deps.memory.currentConversation(now);
      const prompt = chatPrompt({
        message: text,
        history: conversation === undefined ? [] : deps.memory.turns(conversation, HISTORY),
        ...deps.context(),
        memories: deps.memory.recall(memoryQuery(text), RECALLED, now),
        summaries: deps.memory.summaries(SUMMARIES),
        budgetTokens: CHAT_BUDGET_TOKENS,
        maxTokens: CHAT_ANSWER_TOKENS,
      });
      const result = await provider.answer(prompt, onText ? { onText } : {});
      if (!result.ok) return result;
      const answer = cleanAnswer(result.text, { maxChars: MAX_CHAT_ANSWER_CHARS });
      if (!answer) return { ok: false, problem: 'unavailable' };
      deps.memory.addMessage('user', text, now);
      deps.memory.addMessage('mocha', answer, Math.max(now, deps.now()));
      return { ok: true, text: answer };
    },

    /**
     * Sums up ended conversations and keeps what Mocha learned, then drops
     * old messages. Returns the new memories, for Mocha to mention. Does
     * nothing while the chat is off: the model only ever sees what it is
     * allowed to.
     */
    async tidy(limit = 3): Promise<string[]> {
      const now = deps.now();
      const provider = model();
      const learned: string[] = [];
      if (typeof provider !== 'string') {
        for (const { id, turns } of deps.memory.toSummarize(now, limit)) {
          const result = await provider.answer(summaryPrompt(turns));
          const parsed = result.ok ? parseSummary(result.text) : undefined;
          // A failed summary is tried again next time.
          if (!parsed) continue;
          deps.memory.saveSummary(id, parsed.summary);
          deps.memory.remember(parsed.remember, now);
          learned.push(...parsed.remember);
        }
      }
      deps.memory.prune(now, MESSAGE_RETENTION_DAYS);
      return learned;
    },
  };
}

export type ChatService = ReturnType<typeof createChatService>;

/** A day's stats as the model sees them, in whole minutes. */
export function toDayNumbers(day: string, stats: DailyStats): DayNumbers {
  return {
    day,
    minutesWorked: Math.round(stats.activeMs / 60_000),
    breaksTaken: stats.breaks,
    longestWorkWithoutBreakMinutes: Math.round(stats.longestStretchMs / 60_000),
  };
}

/**
 * The last half hour as the chat may see it: each page with only what the
 * user allows now (a switch turned off since counts at once), newest
 * first, in whole minutes ago.
 */
export function recentPages(
  visits: readonly {
    until: number;
    kind?: SiteKind | undefined;
    site?: string | undefined;
    title?: string | undefined;
  }[],
  capabilities: BrowserCapabilities,
  now: number,
): RecentPage[] {
  return visits.flatMap(({ until, kind, site, title }) => {
    const allowed = allowedContext(
      { ...(kind && { kind }), ...(site && { site }), ...(title && { title }) },
      capabilities,
    );
    if (!(allowed.kind || allowed.site || allowed.title)) return [];
    return [
      {
        minutesAgo: Math.round((now - until) / 60_000),
        ...(allowed.kind && { kind: allowed.kind }),
        ...(allowed.site && { site: allowed.site }),
        ...(allowed.title && { title: allowed.title }),
      },
    ];
  });
}
