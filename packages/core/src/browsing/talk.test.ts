import { describe, expect, it } from 'vitest';
import type { BrowsingContext } from './context.ts';
import {
  COMMENT_GAP_MS,
  FRESH_TALK,
  hushEnd,
  LATE_NIGHT_END_MINUTE,
  nextTalk,
  RECENT_LINES,
  SETTLE_MS,
  SOCIAL_STRETCH_MS,
  type TalkMoment,
  type TalkState,
} from './talk.ts';
import { COMMENT_LINES, NUDGE_LINES } from './talk-lines.ts';

const MINUTE = 60_000;
const DAY = 1_000_000;

function moment(context: BrowsingContext | undefined, over: Partial<TalkMoment> = {}): TalkMoment {
  return {
    now: 0,
    minute: 14 * 60,
    day: DAY,
    context,
    may: { talk: true, nudge: true },
    quiet: false,
    random: () => 0,
    ...over,
  };
}

/** Runs moments in order and collects what Mocha said. */
function play(moments: TalkMoment[], start: TalkState = FRESH_TALK) {
  let state = start;
  const said: (string | null)[] = [];
  for (const each of moments) {
    const next = nextTalk(state, each);
    state = next.state;
    said.push(next.say?.text ?? null);
  }
  return { state, said };
}

/** The user comes to a site at `over.now` and stays a few seconds. */
function settle(context: BrowsingContext, over: Partial<TalkMoment> = {}, start = FRESH_TALK) {
  const now = over.now ?? 0;
  const arrived = nextTalk(start, moment(context, { ...over, now })).state;
  return nextTalk(arrived, moment(context, { ...over, now: now + SETTLE_MS }));
}

describe('nextTalk: comments', () => {
  it('comments on a site once the user has stayed a few seconds', () => {
    const first = nextTalk(FRESH_TALK, moment({ kind: 'video' }));

    expect(SETTLE_MS).toBe(5_000);
    expect(first).toMatchObject({ say: null, retryAt: SETTLE_MS });
    expect(nextTalk(first.state, moment({ kind: 'video' }, { now: SETTLE_MS - 1 })).say).toBeNull();
    expect(settle({ kind: 'video' }).say).toEqual({
      kind: 'comment',
      text: COMMENT_LINES.video[0],
    });
  });

  it('comments on sites of any kind, but not without a kind', () => {
    expect(settle({ kind: 'other' }).say?.text).toBe(COMMENT_LINES.other[0]);
    expect(settle({ site: 'example.org' })).toEqual({ state: expect.anything(), say: null });
    expect(nextTalk(FRESH_TALK, moment(undefined))).toEqual({ state: FRESH_TALK, say: null });
  });

  it('says nothing while the user hops from tab to tab', () => {
    const { said } = play([
      moment({ kind: 'code', site: 'github.com' }, { now: 0 }),
      moment({ kind: 'video', site: 'youtube.com' }, { now: 2_000 }),
      moment({ kind: 'music', site: 'spotify.com' }, { now: 4_000 }),
      moment({ kind: 'music', site: 'spotify.com' }, { now: 4_000 + SETTLE_MS }),
    ]);

    expect(said).toEqual([null, null, null, COMMENT_LINES.music[0]]);
  });

  it('comments on every new site, twenty seconds apart at most', () => {
    const github = { kind: 'code', site: 'github.com' } as const;
    const gitlab = { kind: 'code', site: 'gitlab.com' } as const;
    const said = settle(github);
    const arrived = nextTalk(said.state, moment(gitlab, { now: 6_000 }));

    expect(COMMENT_GAP_MS).toBe(20_000);
    expect(arrived.retryAt).toBe(SETTLE_MS + COMMENT_GAP_MS);
    const { said: later } = play(
      [
        moment(gitlab, { now: SETTLE_MS + COMMENT_GAP_MS - 1 }),
        moment(gitlab, { now: SETTLE_MS + COMMENT_GAP_MS }),
        moment(gitlab, { now: MINUTE }),
      ],
      arrived.state,
    );
    expect(later.map((text) => text !== null)).toEqual([false, true, false]);
  });

  it('goes by the kind of site when Mocha may not know the site', () => {
    const code = settle({ kind: 'code' });
    const sameKind = settle({ kind: 'code' }, { now: MINUTE }, code.state);
    const video = settle({ kind: 'video' }, { now: 2 * MINUTE }, sameKind.state);

    expect([code.say, sameKind.say, video.say].map((say) => say !== null)).toEqual([
      true,
      false,
      true,
    ]);
  });

  it('uses the site and the title only when Mocha may know them', () => {
    const titled = { kind: 'video', title: 'Raven facts' } as const;
    const texts = new Set(
      [0, 0.3, 0.6, 0.99].map((r) => settle(titled, { random: () => r }).say?.text),
    );

    expect([...texts].some((text) => text?.includes('Raven facts'))).toBe(true);
    for (const r of [0, 0.5, 0.99]) {
      expect(settle({ kind: 'video' }, { random: () => r }).say?.text).not.toMatch(/[{}“]/);
    }
  });

  it('does not comment unless the user lets Mocha talk', () => {
    const quietMocha = settle({ kind: 'code' }, { may: { talk: false, nudge: false } });

    expect(quietMocha).toEqual({ state: expect.anything(), say: null });
  });

  it('keeps quiet when told to, and comments once it may', () => {
    const { said } = play([
      moment({ kind: 'code' }, { quiet: true }),
      moment({ kind: 'code' }, { now: MINUTE }),
    ]);

    expect(said).toEqual([null, COMMENT_LINES.code[0]]);
    expect(nextTalk(FRESH_TALK, moment({ kind: 'code' }, { quiet: true }))).not.toHaveProperty(
      'retryAt',
    );
  });

  it('does not repeat a line it said lately', () => {
    const first = settle({ kind: 'code' });
    const second = settle({ kind: 'video' }, { now: MINUTE }, first.state);
    const third = settle({ kind: 'code' }, { now: 2 * MINUTE }, second.state);

    expect(third.say?.text).not.toBe(first.say?.text);
  });
});

describe('nextTalk: nudges', () => {
  const social = { kind: 'social' } as const;

  it('nudges once after half an hour on social media without a break', () => {
    const { said } = play([
      moment(social, { now: 0, may: { talk: false, nudge: true } }),
      moment(social, { now: SOCIAL_STRETCH_MS - 1, may: { talk: false, nudge: true } }),
      moment(social, { now: SOCIAL_STRETCH_MS, may: { talk: false, nudge: true } }),
      moment(social, { now: 2 * SOCIAL_STRETCH_MS, may: { talk: false, nudge: true } }),
    ]);

    expect(said).toEqual([null, null, NUDGE_LINES.socialStretch[0], null]);
  });

  it('starts the stretch over when the user leaves social media', () => {
    const nudgeOnly = { may: { talk: false, nudge: true } };
    const { said } = play([
      moment(social, { now: 0, ...nudgeOnly }),
      moment({ kind: 'code' }, { now: 20 * MINUTE, ...nudgeOnly }),
      moment(social, { now: 21 * MINUTE, ...nudgeOnly }),
      moment(social, { now: 40 * MINUTE, ...nudgeOnly }),
      moment(social, { now: 51 * MINUTE, ...nudgeOnly }),
    ]);

    expect(said).toEqual([null, null, null, null, NUDGE_LINES.socialStretch[0]]);
  });

  it('counts the stretch while quiet, and nudges once it may', () => {
    const { said } = play([
      moment(social, { now: 0, quiet: true }),
      moment(social, { now: SOCIAL_STRETCH_MS, quiet: true }),
      moment(social, { now: SOCIAL_STRETCH_MS + MINUTE }),
    ]);

    expect(said[2]).toBe(NUDGE_LINES.socialStretch[0]);
  });

  it('nudges once a night after midnight, if Mocha knows anything', () => {
    const night = { minute: 30, may: { talk: false, nudge: true } };
    const { said } = play([
      moment({}, night),
      moment({ kind: 'code' }, { ...night, now: MINUTE }),
      moment({ kind: 'code' }, { ...night, now: 2 * MINUTE }),
      moment({ kind: 'code' }, { ...night, now: 3 * MINUTE, minute: LATE_NIGHT_END_MINUTE }),
      moment({ kind: 'code' }, { ...night, now: 4 * MINUTE, day: DAY + 1 }),
    ]);

    expect(said).toEqual([null, NUDGE_LINES.lateNight[0], null, null, NUDGE_LINES.lateNight[1]]);
  });

  it('does not nudge unless the user lets Mocha nudge', () => {
    const { said } = play([
      moment(social, { now: 0, may: { talk: false, nudge: false } }),
      moment(social, { now: SOCIAL_STRETCH_MS, minute: 30, may: { talk: false, nudge: false } }),
    ]);

    expect(said).toEqual([null, null]);
  });

  it('marks a nudge as said, so a comment waits after it', () => {
    const nudged = nextTalk(FRESH_TALK, moment({ kind: 'code' }, { now: 0, minute: 30 }));
    const video = settle({ kind: 'video' }, { now: 1_000, minute: 30 }, nudged.state);

    expect(nudged.say?.text).toBe(NUDGE_LINES.lateNight[0]);
    expect(video).toMatchObject({ say: null, retryAt: COMMENT_GAP_MS });
  });
});

describe('hushEnd', () => {
  it('hushes for an hour', () => {
    expect(hushEnd(1_000, 14 * 60, 'hour')).toBe(1_000 + 60 * MINUTE);
  });

  it('hushes until six the next morning', () => {
    expect(hushEnd(0, 14 * 60, 'morning')).toBe(16 * 60 * MINUTE);
    expect(hushEnd(0, 1 * 60, 'morning')).toBe(5 * 60 * MINUTE);
    expect(hushEnd(0, 6 * 60, 'morning')).toBe(24 * 60 * MINUTE);
  });
});

describe('nextTalk: recent lines', () => {
  it('remembers only the last few lines', () => {
    let state = FRESH_TALK;
    const kinds = [
      'code',
      'video',
      'music',
      'social',
      'shopping',
      'chat',
      'reading',
      'docs',
    ] as const;
    kinds.forEach((kind, i) => {
      state = settle({ kind }, { now: i * MINUTE }, state).state;
    });

    expect(state.recent).toHaveLength(RECENT_LINES);
  });
});
