/**
 * Public API of @mocha/core.
 *
 * Other packages import only from here, never from internal paths, so the
 * internals can be reorganized without breaking consumers.
 */

export {
  type BreakConfig,
  type BreakEvent,
  type BreakState,
  breakConfig,
  DEFAULT_BREAK_CONFIG,
  reduceBreak,
  startWorking,
} from './habits/break-machine.ts';
export {
  type Cancel,
  createGameLoop,
  type GameLoop,
  type GameLoopOptions,
  type LoopScheduler,
} from './loop/game-loop.ts';
export { type AnimationPlayer, createAnimationPlayer } from './pet/animation-player.ts';
export { type BlinkTimer, type BlinkTimerOptions, createBlinkTimer } from './pet/blink-timer.ts';
export { type Gaze, type GazeOptions, gazeOffset } from './pet/gaze.ts';
export {
  createPetAnimator,
  type PetAnimator,
  type PetAnimatorOptions,
} from './pet/pet-animator.ts';
export {
  createReactionDetector,
  type Reaction,
  type ReactionDetector,
  type ReactionOptions,
} from './pet/reactions.ts';
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
