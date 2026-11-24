export { cleanAnswer } from './ai/answer.ts';
export { MOCHA_PERSONA } from './ai/persona.ts';
export {
  CHARS_PER_TOKEN,
  type ChatTurn,
  chatPrompt,
  commentPrompt,
  type DayNumbers,
  dataBlock,
  insightPrompt,
  MAX_COMMENT_CHARS,
  MAX_MESSAGE_CHARS,
  type MochaFeelings,
  type Prompt,
  untrusted,
} from './ai/prompt.ts';
/**
 * Public API of @mocha/core.
 *
 * Other packages import only from here, never from internal paths, so the
 * internals can be reorganized without breaking consumers.
 */

export {
  BROWSING_POSES,
  type BrowsingPose,
  BUSY_TYPING_KEYS_PER_SECOND,
  browsingPose,
} from './browsing/browsing-pose.ts';
export { CAPABILITY_TEXTS } from './browsing/capability-texts.ts';
export {
  allowedContext,
  BROWSER_CAPABILITIES,
  type BrowserCapabilities,
  type BrowserCapability,
  type BrowsingContext,
  browsingContextSchema,
  NO_BROWSER_CAPABILITIES,
  SITE_KINDS,
  type SiteKind,
} from './browsing/context.ts';
export { matchesDomain, registrableDomain } from './browsing/domains.ts';
export { EXTENSION_ID, EXTENSION_ORIGIN, EXTENSION_PUBLIC_KEY } from './browsing/extension.ts';
export { filterPage, type HoldReason, type PageVerdict } from './browsing/filter.ts';
export { formatPairingCode, parsePairingCode } from './browsing/pairing.ts';
export { MAX_TITLE_LENGTH, scrubTitle } from './browsing/scrub-title.ts';
export {
  isSensitivePath,
  SENSITIVE_DOMAINS,
  type SensitiveKind,
  sensitiveKind,
} from './browsing/sensitive.ts';
export {
  classifySite,
  SITE_KIND_DOMAINS,
  SITE_KIND_PATH_HINTS,
} from './browsing/site-kinds.ts';
export {
  COMMENT_GAP_MS,
  FRESH_TALK,
  type HushLength,
  hushEnd,
  LATE_NIGHT_END_MINUTE,
  nextTalk,
  type Saying,
  SOCIAL_STRETCH_MS,
  type TalkMoment,
  type TalkState,
} from './browsing/talk.ts';
export { COMMENT_LINES, NUDGE_LINES } from './browsing/talk-lines.ts';
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
export { findsEventForBreakChange } from './collection/finds-from-breaks.ts';
export {
  type AccessorySlot,
  type DecorSlot,
  ITEMS,
  type Item,
  type ItemId,
  itemById,
} from './collection/items.ts';
export { BARE_LOOK, type Look, validLook, wear } from './collection/look.ts';
export { EMPTY_ROOM, place, type Room, validRoom } from './collection/room.ts';
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
export { type TimeOfDay, timeOfDay } from './time/time-of-day.ts';
