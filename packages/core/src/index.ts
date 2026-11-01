/**
 * Public API of @mocha/core.
 *
 * Other packages import only from here, never from internal paths, so the
 * internals can be reorganized without breaking consumers.
 */
export const APP_NAME = 'Mocha';

export function greet(name: string): string {
  return `Hi ${name}, I'm ${APP_NAME}!`;
}

export {
  type Cancel,
  createGameLoop,
  type GameLoop,
  type GameLoopOptions,
  type LoopScheduler,
} from './loop/game-loop.ts';
export {
  ANIMATION_NAMES,
  type AnimationName,
  checkSkinImage,
  frameSource,
  type ManifestResult,
  parseSkinManifest,
  SKIN_SCHEMA_VERSION,
  type SkinAnchors,
  type SkinAnimation,
  type SkinFrame,
  type SkinManifest,
} from './skin/skin-manifest.ts';
export { formatDuration } from './time/format-duration.ts';
