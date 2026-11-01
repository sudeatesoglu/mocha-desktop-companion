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
export { type AnimationPlayer, createAnimationPlayer } from './pet/animation-player.ts';
export { type BlinkTimer, type BlinkTimerOptions, createBlinkTimer } from './pet/blink-timer.ts';
export {
  createPetAnimator,
  type PetAnimator,
  type PetAnimatorOptions,
} from './pet/pet-animator.ts';
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
