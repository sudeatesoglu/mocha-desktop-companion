import { z } from 'zod';

/** At most this many sites can be left out. */
export const MAX_EXCLUSIONS = 200;

const DOMAIN = /^[a-z0-9-]+(?:\.[a-z0-9-]+)+$/;

// What the extension keeps, and nothing else: no page, address or title is
// ever stored (ADR-0012). Anything unreadable falls back to its default.
const settingsSchema = z.object({
  pairing: z
    .strictObject({
      port: z.int().min(1024).max(65_535),
      token: z.string().regex(/^[A-Z2-7]{26}$/),
    })
    .optional()
    .catch(undefined),
  exclusions: z.array(z.string().regex(DOMAIN)).max(MAX_EXCLUSIONS).catch([]),
  paused: z.boolean().catch(false),
});

export type ExtensionSettings = z.infer<typeof settingsSchema>;
export type Pairing = NonNullable<ExtensionSettings['pairing']>;

/** The part of chrome.storage the settings need, so tests can fake it. */
export interface SettingsArea {
  get(keys: string[]): Promise<Record<string, unknown>>;
  set(items: Record<string, unknown>): Promise<void>;
  remove(keys: string[]): Promise<void>;
}

export async function loadSettings(area: SettingsArea): Promise<ExtensionSettings> {
  return settingsSchema.parse(await area.get(['pairing', 'exclusions', 'paused']));
}

export async function savePairing(area: SettingsArea, pairing: Pairing | undefined): Promise<void> {
  if (pairing) await area.set({ pairing });
  else await area.remove(['pairing']);
}

export async function saveExclusions(area: SettingsArea, exclusions: readonly string[]) {
  await area.set({ exclusions: [...exclusions] });
}

export async function savePaused(area: SettingsArea, paused: boolean): Promise<void> {
  await area.set({ paused });
}
