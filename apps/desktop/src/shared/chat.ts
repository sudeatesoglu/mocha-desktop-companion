import { AI_PROBLEM_TEXTS, type AiProblem } from './ai.ts';

/** One turn of the chat, as the Tower shows it. */
export interface ChatEntry {
  from: 'user' | 'mocha';
  text: string;
}

/** The chat as the Tower opens it. */
export interface ChatView {
  /** Whether Mocha may chat: AI on and "Chat with Mocha" switched on. */
  available: boolean;
  /** The conversation going on. */
  entries: ChatEntry[];
  /** What Mocha has remembered since the chat was last opened (ADR-0013). */
  learned: string[];
}

export type ChatProblem = AiProblem | 'off';
export type ChatReply = { ok: true; text: string } | { ok: false; problem: ChatProblem };

export const CHAT_PROBLEM_TEXTS: Readonly<Record<ChatProblem, string>> = {
  ...AI_PROBLEM_TEXTS,
  off: 'To talk with Mocha, turn on “Chat with Mocha” in Settings, under AI.',
};

/** A memory as the Tower lists it. */
export interface MemoryView {
  id: number;
  text: string;
  pinned: boolean;
}

/** The longest message the Tower sends, as core caps it. */
export const MAX_CHAT_MESSAGE = 2_000;
