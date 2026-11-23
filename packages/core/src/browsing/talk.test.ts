import { describe, expect, it } from 'vitest';
import type { BrowsingContext } from './context.ts';
import {
  COMMENT_GAP_MS,
  FRESH_TALK,
  hushEnd,
  LATE_NIGHT_END_MINUTE,
  nextTalk,
  RECENT_LINES,
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

describe('nextTalk: comments', () => {
  it('comments on a kind of site with a line for it', () => {
    const { say } = nextTalk(FRESH_TALK, moment({ kind: 'video' }));

    expect(say).toEqual({ kind: 'comment', text: COMMENT_LINES.video[0] });
  });

  it('says nothing about other sites, or without a kind', () => {
    expect(nextTalk(FRESH_TALK, moment({ kind: 'other' })).say).toBeNull();
    expect(nextTalk(FRESH_TALK, moment({ site: 'example.org' })).say).toBeNull();
    expect(nextTalk(FRESH_TALK, moment(undefined)).say).toBeNull();
  });

  it('waits ten minutes between comments, and needs a new kind of site', () => {
    const { said } = play([
      moment({ kind: 'code' }, { now: 0 }),
      moment({ kind: 'video' }, { now: COMMENT_GAP_MS - 1 }),
      moment({ kind: 'video' }, { now: COMMENT_GAP_MS }),
      moment({ kind: 'video' }, { now: 3 * COMMENT_GAP_MS }),
      moment({ kind: 'code' }, { now: 4 * COMMENT_GAP_MS }),
    ]);

    expect(said.map((text) => text !== null)).toEqual([true, false, true, false, true]);
  });

  it('uses the site and the title only when Mocha may know them', () => {
    const titled = { kind: 'video', title: 'Raven facts' } as const;
    const texts = new Set(
      [0, 0.3, 0.6, 0.99].map(
        (r) => nextTalk(FRESH_TALK, moment(titled, { random: () => r })).say?.text,
      ),
    );

    expect([...texts].some((text) => text?.includes('Raven facts'))).toBe(true);
    for (const r of [0, 0.5, 0.99]) {
      expect(
        nextTalk(FRESH_TALK, moment({ kind: 'video' }, { random: () => r })).say?.text,
      ).not.toMatch(/[{}“]/);
    }
  });

  it('does not comment unless the user lets Mocha talk', () => {
    const quietMocha = moment({ kind: 'code' }, { may: { talk: false, nudge: false } });

    expect(nextTalk(FRESH_TALK, quietMocha).say).toBeNull();
  });

  it('keeps quiet when told to, and comments once it may', () => {
    const { said } = play([
      moment({ kind: 'code' }, { quiet: true }),
      moment({ kind: 'code' }, { now: MINUTE }),
    ]);

    expect(said).toEqual([null, COMMENT_LINES.code[0]]);
  });

  it('does not repeat a line it said lately', () => {
    const { said } = play([
      moment({ kind: 'code' }, { now: 0 }),
      moment({ kind: 'video' }, { now: COMMENT_GAP_MS }),
      moment({ kind: 'code' }, { now: 2 * COMMENT_GAP_MS }),
    ]);

    expect(said[2]).not.toBe(said[0]);
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

  it('marks a nudge as said, so a comment waits ten minutes after it', () => {
    const { said } = play([
      moment({ kind: 'code' }, { now: 0, minute: 30 }),
      moment({ kind: 'video' }, { now: MINUTE, minute: 31 }),
    ]);

    expect(said).toEqual([NUDGE_LINES.lateNight[0], null]);
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
      state = nextTalk(state, moment({ kind }, { now: i * COMMENT_GAP_MS })).state;
    });

    expect(state.recent).toHaveLength(RECENT_LINES);
  });
});
