import { describe, expect, it } from 'vitest';
import { ANIMATION_NAMES } from '../skin/skin-manifest.ts';
import { BROWSING_POSES, browsingPose } from './browsing-pose.ts';
import type { BrowsingContext } from './context.ts';
import { SITE_KINDS } from './context.ts';

const typing = (keys: number) => ({ keys, scrolls: 0, clicks: 0, windowSeconds: 30 });
const browser = (sound: boolean) => ({ sound, tabs: 3, switchesPerMinute: 0, secondsOnPage: 60 });

describe('browsingPose', () => {
  it.each([
    ['code', 'readAlong'],
    ['docs', 'readAlong'],
    ['reading', 'readAlong'],
    ['video', 'watch'],
    ['music', 'bob'],
    ['shopping', 'shiny'],
    ['social', null],
    ['chat', null],
    ['other', null],
  ] as const)('keeps company on %s sites with %s', (kind, pose) => {
    expect(browsingPose({ kind })).toBe(pose);
  });

  it('has no pose when Mocha may not know the kind of site', () => {
    expect(browsingPose(undefined)).toBeNull();
    expect(browsingPose({})).toBeNull();
    expect(browsingPose({ site: 'github.com', page: typing(90) })).toBeNull();
  });

  it('scribbles along when the user types a lot, whatever the site', () => {
    expect(browsingPose({ kind: 'video', page: typing(30) })).toBe('scribble');
    expect(browsingPose({ kind: 'other', page: typing(45) })).toBe('scribble');
    expect(browsingPose({ kind: 'docs', page: typing(29) })).toBe('readAlong');
  });

  it('bobs only while something plays, when Mocha may know', () => {
    expect(browsingPose({ kind: 'music', browser: browser(true) })).toBe('bob');
    expect(browsingPose({ kind: 'music', browser: browser(false) })).toBeNull();
  });

  it('covers every kind of site, with poses the skins can provide', () => {
    for (const kind of SITE_KINDS) {
      const pose = browsingPose({ kind } as BrowsingContext);
      expect(pose === null || BROWSING_POSES.includes(pose)).toBe(true);
    }
    for (const pose of BROWSING_POSES) expect(ANIMATION_NAMES).toContain(pose);
  });
});
