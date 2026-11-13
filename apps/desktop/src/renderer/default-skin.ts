import type { SkinManifest } from '@mocha/core';
import { SPRITE_SIZE } from '../shared/overlay.ts';
import { type Appearance, placeholderAppearance, skinAppearance } from './appearance.ts';
import { PLACEHOLDER_ANIMATIONS } from './placeholder-sprite.ts';
import { loadSkin, type SkinImage } from './skin-loader.ts';
import defaultManifest from './skins/default/manifest.json';
import defaultSpriteUrl from './skins/default/sprite.png';

// The bundled skin's files, by the name the manifest uses. A manifest can
// only reference files listed here.
const DEFAULT_SKIN_FILES: Readonly<Record<string, string>> = { 'sprite.png': defaultSpriteUrl };

/** Loads a file of the bundled skin; any other name is refused. */
export function loadBundledFile<I>(
  fileName: string,
  loadImage: (url: string) => Promise<I>,
  files: Readonly<Record<string, string>> = DEFAULT_SKIN_FILES,
): Promise<I> {
  const url = files[fileName];
  return url ? loadImage(url) : Promise.reject(new Error('not part of the skin'));
}

/** How Mocha looks: the drawing and the animations that go with it. */
export interface MochaLook<I> {
  appearance: Appearance<I>;
  animations: SkinManifest['animations'];
}

/**
 * Loads the bundled skin for any window that draws Mocha. Graceful
 * degradation: a broken skin is reported, and Mocha appears as the built-in
 * placeholder instead of disappearing.
 */
export async function loadDefaultLook<I extends SkinImage>(
  loadImage: (url: string) => Promise<I>,
  report: (message: string) => void,
): Promise<MochaLook<I>> {
  const skin = await loadSkin(defaultManifest, (fileName) => loadBundledFile(fileName, loadImage), {
    width: SPRITE_SIZE,
    height: SPRITE_SIZE,
  });
  if (skin.ok) {
    return { appearance: skinAppearance(skin.skin), animations: skin.skin.manifest.animations };
  }
  const message = `Default skin is invalid, using the placeholder: ${skin.errors.join('; ')}`;
  report(message.slice(0, 2_000));
  return { appearance: placeholderAppearance(), animations: PLACEHOLDER_ANIMATIONS };
}
