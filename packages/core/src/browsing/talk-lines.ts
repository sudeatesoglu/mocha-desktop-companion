import type { BrowsingContext, SiteKind } from './context.ts';

/**
 * What Mocha may say about each kind of site: playful, never hurtful
 * (#176). `{site}` and `{title}` are filled in only when the user lets
 * Mocha know them; a line that needs one is skipped otherwise.
 */
export const COMMENT_LINES: Readonly<Record<Exclude<SiteKind, 'other'>, readonly string[]>> = {
  code: [
    'Another bug? I’d eat it.',
    'Code! I’ll pretend I understand it.',
    'Semicolons everywhere. Ravens approve.',
    '{site} again? Ship it.',
    '“{title}”? Sounds serious. I’ll hold the coffee.',
  ],
  docs: [
    'Reading the manual? Who does that? You, apparently.',
    'Docs! The secret ending.',
    '“{title}”. Taking notes. In my head. Mostly.',
  ],
  reading: [
    'A good read? I’ll peek over your shoulder.',
    'Words, words, words. I like the long ones.',
    '“{title}”? Finally, research worth doing.',
  ],
  video: [
    'One more video. Sure. Sure.',
    'Popcorn’s ready. Shh.',
    'Is this the one with the cat?',
    '“{title}”? Scoot over.',
  ],
  music: [
    'Is that a banger? My head says yes.',
    'I’m not dancing. My head is.',
    '“{title}”? Turn it up.',
  ],
  social: [
    'Scroll, scroll, scroll… like waves.',
    'Anything about ravens in there?',
    '{site}? Say hi from me.',
  ],
  chat: ['Asking the other bird for help?', 'Tell it Mocha says hi.'],
  shopping: [
    'Your wallet just shivered.',
    'Shiny things! Just looking, right?',
    '{site}? I’ll guard the cart.',
  ],
};

/** Gentle words, never guilt (ADR-0012): questions, not verdicts. */
export const NUDGE_LINES = {
  socialStretch: [
    'Half an hour of scrolling. Stretch your wings?',
    'The feed will still be there after a little walk.',
  ],
  lateNight: [
    'Past midnight. Even owls sleep sometimes.',
    'Late, isn’t it? A few more minutes, then rest?',
  ],
} as const;

/** Titles are shortened to fit the bubble. */
export const MAX_TITLE_IN_LINE = 32;

/** `line` with what Mocha may know filled in, or undefined if it needs more. */
export function writeLine(line: string, context: BrowsingContext): string | undefined {
  if (line.includes('{site}') && !context.site) return undefined;
  if (line.includes('{title}') && !context.title) return undefined;
  const title = context.title ?? '';
  const short =
    title.length > MAX_TITLE_IN_LINE
      ? `${title.slice(0, MAX_TITLE_IN_LINE - 1).trimEnd()}…`
      : title;
  return line.replace('{site}', context.site ?? '').replace('{title}', short);
}

/**
 * One of `lines` that can be written with what Mocha may know, at random,
 * and none of `recent` (said lately) while there is another. Every list has
 * lines that need nothing filled in, so there is always one (tested).
 */
export function pickLine(
  lines: readonly string[],
  context: BrowsingContext,
  recent: readonly string[],
  random: () => number,
): string {
  const written = lines.flatMap((line) => writeLine(line, context) ?? []);
  const fresh = written.filter((line) => !recent.includes(line));
  const choices = fresh.length > 0 ? fresh : written;
  return choices[Math.floor(random() * choices.length)] as string;
}
