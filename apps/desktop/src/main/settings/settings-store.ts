import { ITEMS, type ItemId, NO_BROWSER_CAPABILITIES } from '@mocha/core';
import { z } from 'zod';
import { AI_PROVIDERS, CLAUDE_MODELS, NO_AI_FEATURES } from '../../shared/ai.ts';
import { preferencesSchema } from '../../shared/preferences.ts';

const MAX_COORDINATE = 100_000; // far beyond any real desktop

const itemIdSchema = z.enum(ITEMS.map(({ id }) => id) as [ItemId, ...ItemId[]]);

// A capability the file does not say is on is off (ADR-0012).
const capability = z.boolean().catch(false);

const aiSchema = z.object({
  provider: z.enum(AI_PROVIDERS).catch('off'),
  localModel: z.string().min(1).max(200).optional().catch(undefined),
  claudeModel: z.enum(CLAUDE_MODELS).catch(CLAUDE_MODELS[0]),
  /** Encrypted by the keychain (safeStorage), as base64; never the key itself. */
  claudeKey: z.string().min(1).max(4000).optional().catch(undefined),
  features: z
    .object({
      chat: z.boolean().catch(false),
      insights: z.boolean().catch(false),
      comments: z.boolean().catch(false),
    })
    .catch(NO_AI_FEATURES),
});

/** The browser companion: whether the extension may connect, its pairing, and what Mocha may do. */
const browserSchema = z.object({
  allowed: z.boolean().catch(false),
  /** The pairing token: 128 random bits in base32. */
  token: z
    .string()
    .regex(/^[A-Z2-7]{26}$/)
    .optional()
    .catch(undefined),
  /** The port the API last listened on, so the pairing code stays valid. */
  port: z.int().min(1024).max(65535).optional().catch(undefined),
  capabilities: z
    .object({
      kind: capability,
      site: capability,
      title: capability,
      talk: capability,
      nudge: capability,
      browserActivity: capability,
      pageActivity: capability,
    })
    .catch(NO_BROWSER_CAPABILITIES),
});

const pointSchema = z.object({
  x: z.int().min(-MAX_COORDINATE).max(MAX_COORDINATE),
  y: z.int().min(-MAX_COORDINATE).max(MAX_COORDINATE),
});

/**
 * Settings persisted between runs. Unknown keys are dropped instead of
 * rejected, so a file written by a newer version still loads.
 */
const settingsSchema = z.object({
  /** Top-left of the overlay window, in screen coordinates. */
  overlayPosition: pointSchema.optional(),
  /**
   * Break lengths and quiet hours. If they are invalid (say, written by a
   * version with other limits), only they fall back to the defaults.
   */
  preferences: preferencesSchema.optional().catch(undefined),
  /**
   * What Mocha wears. An id this version does not know is dropped; main
   * also drops what Mocha has not found.
   */
  look: z
    .object({ neck: itemIdSchema.nullable().catch(null), hat: itemIdSchema.nullable().catch(null) })
    .optional()
    .catch(undefined),
  /** The browser companion (ADR-0011, ADR-0012); everything off unless turned on. */
  browser: browserSchema.optional().catch(undefined),
  /** AI (ADR-0013): off unless turned on; the Claude key only encrypted. */
  ai: aiSchema.optional().catch(undefined),
  /** Whether Mocha makes sounds; off unless the user turned them on. */
  sounds: z.boolean().optional().catch(undefined),
  /** Until when Mocha keeps its comments and nudges to itself, from Hush. */
  hushedUntil: z.int().nonnegative().optional().catch(undefined),
  /** What stands in Mocha's room, checked the same way. */
  room: z
    .object({
      shelf: itemIdSchema.nullable().catch(null),
      wall: itemIdSchema.nullable().catch(null),
      floor: itemIdSchema.nullable().catch(null),
      sill: itemIdSchema.nullable().catch(null),
    })
    .optional()
    .catch(undefined),
});

export type Settings = z.infer<typeof settingsSchema>;

/** File operations, injected so the store is tested without touching the disk. */
export interface SettingsFiles {
  read(path: string): Promise<string>;
  write(path: string, data: string): Promise<void>;
  rename(from: string, to: string): Promise<void>;
}

export interface SettingsStore {
  /** Reads the file. Missing, unreadable or invalid files give default settings. */
  load(): Promise<Settings>;
  /** Merges `patch` into the last loaded or saved settings and writes them. */
  update(patch: Partial<Settings>): Promise<void>;
}

const isMissingFile = (error: unknown) =>
  error instanceof Error && 'code' in error && error.code === 'ENOENT';

/**
 * A small JSON settings file (a database arrives later, see the roadmap).
 *
 * - Reading never throws: a broken file must not stop Mocha from starting.
 * - Writing is atomic: the data goes to a temporary file that is then
 *   renamed over the real one, so a crash mid-write cannot leave half a file.
 * - Writes run one after another, so two quick saves cannot interleave.
 */
export function createSettingsStore(
  path: string,
  files: SettingsFiles,
  logger: { warn(message: string, details?: unknown): void },
): SettingsStore {
  let current: Settings = {};
  let queue: Promise<void> = Promise.resolve();

  return {
    async load() {
      let text: string;
      try {
        text = await files.read(path);
      } catch (error) {
        if (!isMissingFile(error)) logger.warn('[settings] could not read, using defaults', error);
        current = {};
        return current;
      }

      let json: unknown;
      try {
        json = JSON.parse(text);
      } catch {
        logger.warn('[settings] file is not valid JSON, using defaults');
        current = {};
        return current;
      }

      const parsed = settingsSchema.safeParse(json);
      if (!parsed.success) {
        logger.warn('[settings] file is invalid, using defaults', parsed.error.issues);
        current = {};
        return current;
      }
      current = parsed.data;
      return current;
    },

    update(patch) {
      current = { ...current, ...patch };
      const snapshot = `${JSON.stringify(current, null, 2)}\n`;
      const temporary = `${path}.tmp`;
      queue = queue
        .then(async () => {
          await files.write(temporary, snapshot);
          await files.rename(temporary, path);
        })
        .catch((error: unknown) => logger.warn('[settings] could not save', error));
      return queue;
    },
  };
}
