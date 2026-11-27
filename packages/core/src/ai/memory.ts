import { z } from 'zod';
import { scrubPrivate } from '../browsing/scrub-title.ts';
import { cleanAnswer } from './answer.ts';
import { MOCHA_PERSONA } from './persona.ts';
import { type ChatTurn, dataBlock, type Prompt, untrusted } from './prompt.ts';

/** At most this many memories; the least used go first (ADR-0013). */
export const MAX_MEMORIES = 300;
export const MAX_MEMORY_CHARS = 200;
export const MAX_SUMMARY_CHARS = 600;
/** Messages are kept this long by default; their summary stays after. */
export const MESSAGE_RETENTION_DAYS = 90;
/** A conversation with no message for this long has ended. */
export const CONVERSATION_IDLE_MS = 30 * 60_000;

// Words too common to find a memory by.
const STOPWORDS = new Set(
  'the and you are for with that this what how was have but not your can about just like from into will would there they them then than been were when where which who why its it’s i’m dont don’t did does had has our out all any one too very really also some more much ben sen bir bu şu ve ile için gibi çok daha ama ne nasıl mı mi mu mü'.split(
    ' ',
  ),
);

/**
 * A full-text query to find memories related to `message`, or null when it
 * has no word worth searching. Each word is quoted, so nothing the user
 * types can be read as FTS5 syntax.
 */
export function memoryQuery(message: string): string | null {
  const words = [...new Set(message.toLowerCase().match(/[\p{L}\p{N}]{3,}/gu) ?? [])]
    .filter((word) => !STOPWORDS.has(word))
    .slice(0, 12);
  return words.length > 0 ? words.map((word) => `"${word}"`).join(' OR ') : null;
}

// Things Mocha must not keep, even if a model offers them (ADR-0013). A
// word must start at a letter boundary; Unicode-aware, so "Şifresi" counts.
const SENSITIVE =
  /(?<![\p{L}\p{N}])(passwords?|passcodes?|pin codes?|şifre|parola|credit cards?|card numbers?|iban|bank accounts?|ssn|social security|diagnos|medications?|prescriptions?|therapy|salary|debts?|kredi kart|hastalı|ilaç|maaş|borç)/iu;

// Mocha's own numbers and passing moments are not memories: Mocha knows
// them anyway, and they are wrong by tomorrow.
const PASSING =
  /(?<![\p{L}\p{N}])(today|tonight|yesterday|this (morning|afternoon|evening|week)|right now|minutes?|hours?|breaks?|stretch(es)?|active time|bugün|dakika|saat|mola)/iu;

// What the user browses never becomes a memory, even when the chat talked
// about it (ADR-0013): no domains, no "website" or "page" facts.
const SITE =
  /[a-z0-9-]+\.(com|net|org|io|dev|ai|app|tv|co|me|gg|so|edu|gov|tr)(?![\p{L}\p{N}])|(?<![\p{L}\p{N}])(websites?|web pages?|browsing|browser|tabs?|youtube|github)/iu;

// Second person, as some models write facts: "You are learning Rust".
const SECOND_PERSON: readonly (readonly [RegExp, string])[] = [
  [/^you are\s+/i, 'is '],
  [/^you're\s+/i, 'is '],
  [/^you have\s+/i, 'has '],
  [/^you've\s+/i, 'has '],
  [/^(the )?user (is|has)\s+/i, '$2 '],
  [/^you\s+/i, ''],
];

/** A memory as Mocha may keep it, or undefined when it must not be kept. */
export function cleanMemory(text: string): string | undefined {
  let scrubbed = scrubPrivate(text)
    .replace(/[.!]+$/, '')
    .trim();
  for (const [pattern, replacement] of SECOND_PERSON) {
    scrubbed = scrubbed.replace(pattern, replacement);
  }
  scrubbed = scrubbed.charAt(0).toUpperCase() + scrubbed.slice(1);
  // "İ" lowercases to "i" and a combining dot, which no pattern expects.
  const folded = scrubbed.toLowerCase().replace(/\u0307/g, '');
  if (scrubbed.length < 3 || SENSITIVE.test(folded) || PASSING.test(folded) || SITE.test(folded)) {
    return undefined;
  }
  return untrusted(scrubbed, MAX_MEMORY_CHARS);
}

/**
 * Asks the model to sum up an ended conversation and pick lasting facts
 * about the user. The conversation is quoted as data.
 */
export function summaryPrompt(turns: readonly ChatTurn[]): Prompt {
  const conversation = turns.map(({ role, content }) => ({
    from: role === 'user' ? 'user' : 'Mocha',
    text: untrusted(content, 2_000),
  }));
  return {
    system: `${MOCHA_PERSONA}\n\n${dataBlock({ conversation })}`,
    turns: [
      {
        role: 'user',
        content:
          'Sum up the conversation in DATA in at most three sentences, as Mocha. Then list up to three lasting facts the user said about themselves: interests, goals, preferences, what they are learning or working on. Write each as a short phrase about the user, like "Is learning Rust" or "Likes tea in the afternoon". Only what the user really said, never guesses. Never numbers, times or anything about today, never websites, pages or what they browsed, never secrets, passwords, health, money or other people. An empty list is fine. Reply with JSON only: {"summary": "...", "remember": ["..."]}',
      },
    ],
    maxTokens: 300,
  };
}

const summarySchema = z.object({
  summary: z.string(),
  remember: z.array(z.string()).max(5).catch([]),
});

/**
 * The summary and the memories in a model's answer, cleaned, or undefined
 * when the answer is not what was asked for. Models wrap JSON in prose or
 * code fences now and then, so the outermost object is taken.
 */
export function parseSummary(answer: string): { summary: string; remember: string[] } | undefined {
  const start = answer.indexOf('{');
  const end = answer.lastIndexOf('}');
  if (start === -1 || end < start) return undefined;
  let json: unknown;
  try {
    json = JSON.parse(answer.slice(start, end + 1));
  } catch {
    return undefined;
  }
  const parsed = summarySchema.safeParse(json);
  if (!parsed.success) return undefined;
  const summary = cleanAnswer(parsed.data.summary, { maxChars: MAX_SUMMARY_CHARS });
  if (!summary) return undefined;
  const remember = [
    ...new Set(parsed.data.remember.flatMap((fact) => cleanMemory(fact) ?? [])),
  ].slice(0, 3);
  return { summary, remember };
}
