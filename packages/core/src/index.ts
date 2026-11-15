/**
 * Public API of @mocha/core.
 *
 * Other packages import only from here, never from internal paths, so the
 * internals can be reorganized without breaking consumers.
 */

export {
  DEFAULT_FINDS_CONFIG,
  type Find,
  type FindsConfig,
  type FindsEvent,
  type FindsState,
  findStatus,
  pointsForBreak,
  reduceFinds,
  startFinds,
} from './collection/finds.ts';
export {
  type AccessorySlot,
  type DecorSlot,
  ITEMS,
  type Item,
  type ItemId,
  itemById,
} from './collection/items.ts';
export {
  type BreakConfig,
  type BreakEvent,
  type BreakState,
  breakConfig,
  DEFAULT_BREAK_CONFIG,
  reduceBreak,
  startWorking,
} from './habits/break-machine.ts';
export { type DailyStats, dailyStats, type SessionRecord } from './habits/daily-stats.ts';
export {
  isQuietTime,
  MINUTES_PER_DAY,
  minuteOfDay,
  type QuietHours,
} from './habits/quiet-hours.ts';
export {
  RITUALS,
  type Ritual,
  type RitualId,
  type RitualPose,
  type RitualProgress,
  type RitualStep,
  ritualById,
  ritualDuration,
  ritualProgress,
} from './habits/rituals.ts';
export { type SessionKind, sessionBoundary, sessionKind } from './habits/session-boundary.ts';
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
  DEFAULT_NEEDS_CONFIG,
  isTired,
  type NeedsActivity,
  type NeedsConfig,
  type NeedsEvent,
  type NeedsState,
  reduceNeeds,
  startNeeds,
  treatsLeft,
} from './pet/needs.ts';
export { needsActivity, needsEventsForBreakChange } from './pet/needs-from-breaks.ts';
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
export { localDay } from './time/local-day.ts';
