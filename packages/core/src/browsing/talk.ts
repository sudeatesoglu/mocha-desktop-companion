import type { BrowsingContext, SiteKind } from './context.ts';
import { COMMENT_LINES, NUDGE_LINES, pickLine } from './talk-lines.ts';

/** Mocha comments at most this often, and only on a new kind of site. */
export const COMMENT_GAP_MS = 10 * 60_000;
/** A gentle nudge after this long on social media without a break. */
export const SOCIAL_STRETCH_MS = 30 * 60_000;
/** Late at night: from midnight to five in the morning. */
export const LATE_NIGHT_END_MINUTE = 5 * 60;
/** Mocha does not repeat any of its last few lines while it has another. */
export const RECENT_LINES = 6;

/** What Mocha remembers to talk well: in memory only, nothing about pages. */
export interface TalkState {
  readonly lastSaidAt: number | null;
  /** The kind of site Mocha last commented on. */
  readonly lastKind: SiteKind | null;
  /** The lines said lately, newest last. */
  readonly recent: readonly string[];
  /** When the current stretch on social media began. */
  readonly socialSince: number | null;
  readonly socialNudged: boolean;
  /** The local day (its start) of the last late-night nudge. */
  readonly lateNightNudgedOn: number | null;
}

export const FRESH_TALK: TalkState = {
  lastSaidAt: null,
  lastKind: null,
  recent: [],
  socialSince: null,
  socialNudged: false,
  lateNightNudgedOn: null,
};

export interface TalkMoment {
  now: number;
  /** Minutes after local midnight. */
  minute: number;
  /** The start of the local day. */
  day: number;
  /** The latest context, with only what the user allows. */
  context: BrowsingContext | undefined;
  /** Whether the user lets Mocha talk about what they do, and nudge them. */
  may: { talk: boolean; nudge: boolean };
  /**
   * Mocha keeps quiet: focus, a break or a due one, a ritual, a pause, the
   * quiet hours, Hush, or a bubble already showing.
   */
  quiet: boolean;
  /** Returns a number in [0, 1). */
  random: () => number;
}

export interface Saying {
  readonly kind: 'comment' | 'nudge';
  readonly text: string;
}

/**
 * Whether Mocha says something now, and what. Nudges come first; a
 * comment needs a new kind of site and ten minutes since Mocha last spoke.
 */
export function nextTalk(
  state: TalkState,
  moment: TalkMoment,
): { state: TalkState; say: Saying | null } {
  const { now, context } = moment;
  // A stretch on social media goes on, or ends, whether Mocha may speak.
  const socialSince = context?.kind === 'social' ? (state.socialSince ?? now) : null;
  const tracked: TalkState = {
    ...state,
    socialSince,
    socialNudged: socialSince !== null && state.socialNudged,
  };
  if (moment.quiet || !context) return { state: tracked, say: null };

  const say = (kind: Saying['kind'], lines: readonly string[], next: Partial<TalkState>) => {
    const text = pickLine(lines, context, state.recent, moment.random);
    const recent = [...state.recent, text].slice(-RECENT_LINES);
    return {
      state: { ...tracked, ...next, lastSaidAt: now, recent },
      say: { kind, text },
    };
  };

  if (moment.may.nudge) {
    if (socialSince !== null && !tracked.socialNudged && now - socialSince >= SOCIAL_STRETCH_MS) {
      return say('nudge', NUDGE_LINES.socialStretch, { socialNudged: true });
    }
    // Late at night, once, if Mocha knows the user is browsing at all.
    if (
      Object.keys(context).length > 0 &&
      moment.minute < LATE_NIGHT_END_MINUTE &&
      state.lateNightNudgedOn !== moment.day
    ) {
      return say('nudge', NUDGE_LINES.lateNight, { lateNightNudgedOn: moment.day });
    }
  }

  const { kind } = context;
  const due = state.lastSaidAt === null || now - state.lastSaidAt >= COMMENT_GAP_MS;
  if (moment.may.talk && kind && kind !== 'other' && kind !== state.lastKind && due) {
    return say('comment', COMMENT_LINES[kind], { lastKind: kind });
  }
  return { state: tracked, say: null };
}

/** How long to hush Mocha: an hour, or until six the next morning. */
export type HushLength = 'hour' | 'morning';

/** When Hush chosen at `now` (`minute` after local midnight) ends. */
export function hushEnd(now: number, minute: number, length: HushLength): number {
  if (length === 'hour') return now + 60 * 60_000;
  const minutesToSix = (6 * 60 - minute + 24 * 60) % (24 * 60) || 24 * 60;
  return now + minutesToSix * 60_000;
}
