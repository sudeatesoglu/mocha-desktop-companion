import { z } from 'zod';
import { preferencesSchema } from '../../shared/preferences.ts';

const MAX_COORDINATE = 100_000; // far beyond any real desktop

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
