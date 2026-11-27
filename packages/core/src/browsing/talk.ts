import type { BrowsingContext } from './context.ts';
import { COMMENT_LINES, NUDGE_LINES, pickLine } from './talk-lines.ts';

/** Mocha comments at most this often, and only on a new site. */
export const COMMENT_GAP_MS = 20_000;
/** Mocha comments once the user has stayed this long on a new site. */
export const SETTLE_MS = 5_000;
/** A gentle nudge after this long on social media without a break. */
export const SOCIAL_STRETCH_MS = 30 * 60_000;
/** Late at night: from midnight to five in the morning. */
export const LATE_NIGHT_END_MINUTE = 5 * 60;
/** Mocha does not repeat any of its last few lines while it has another. */
export const RECENT_LINES = 6;

/** What Mocha remembers to talk well: in memory only, nothing about pages. */
export interface TalkState {
  readonly lastSaidAt: number | null;
  /** The site Mocha last commented on, or its kind when Mocha may not know the site. */
  readonly lastPlace: string | null;
  /** The site (or kind) the user is on, and since when. */
  readonly arrived: { readonly place: string; readonly at: number } | null;
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
  lastPlace: null,
  arrived: null,
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
 * comment needs a new site (or kind of site, when Mocha may not know the
 * site) where the user has stayed a few seconds, and twenty seconds since
 * Mocha last spoke. When a comment waits only for time, `retryAt` says
 * when to ask again, since the browser may report nothing new by then.
 */
export function nextTalk(
  state: TalkState,
  moment: TalkMoment,
): { state: TalkState; say: Saying | null; retryAt?: number } {
  const { now, context } = moment;
  const place = context?.kind ? (context.site ?? context.kind) : null;
  const arrived =
    place === null ? null : state.arrived?.place === place ? state.arrived : { place, at: now };
  // A stretch on social media goes on, or ends, whether Mocha may speak.
  const socialSince = context?.kind === 'social' ? (state.socialSince ?? now) : null;
  const tracked: TalkState = {
    ...state,
    socialSince,
    socialNudged: socialSince !== null && state.socialNudged,
    arrived,
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
  if (moment.may.talk && kind && arrived && arrived.place !== state.lastPlace) {
    const ready = Math.max(
      arrived.at + SETTLE_MS,
      state.lastSaidAt === null ? 0 : state.lastSaidAt + COMMENT_GAP_MS,
    );
    if (now >= ready) return say('comment', COMMENT_LINES[kind], { lastPlace: arrived.place });
    return { state: tracked, say: null, retryAt: ready };
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
