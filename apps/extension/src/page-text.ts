/**
 * A page's visible text, for Mocha's reader (ADR-0014): the meta
 * description, then the text of the main content in reading order, at
 * most `max` characters. Never navigation, forms, inputs, buttons,
 * editable areas, hidden elements, scripts or frames.
 *
 * Chrome runs it in the page from its source (`scripting.executeScript`),
 * so it must not use anything from outside: every helper lives inside.
 */
export function extractPageText(max: number): string {
  const SKIP = new Set([
    'SCRIPT',
    'STYLE',
    'NOSCRIPT',
    'TEMPLATE',
    'SVG',
    'CANVAS',
    'IFRAME',
    'OBJECT',
    'EMBED',
    'VIDEO',
    'AUDIO',
    'NAV',
    'ASIDE',
    'FOOTER',
    'FORM',
    'INPUT',
    'TEXTAREA',
    'SELECT',
    'OPTION',
    'BUTTON',
    'LABEL',
    'DIALOG',
  ]);
  const SKIP_ROLES = new Set(['navigation', 'banner', 'contentinfo', 'search', 'dialog', 'menu']);
  const BLOCK =
    /^(P|DIV|LI|UL|OL|H[1-6]|PRE|BLOCKQUOTE|TABLE|TR|SECTION|ARTICLE|MAIN|HEADER|DT|DD|FIGCAPTION|BR|HR)$/;
  const parts: string[] = [];
  let length = 0;
  const add = (text: string) => {
    if (length >= max) return;
    parts.push(text);
    length += text.length;
  };

  function hidden(element: Element): boolean {
    if (element.getAttribute('aria-hidden') === 'true' || element.hasAttribute('hidden')) {
      return true;
    }
    const role = element.getAttribute('role');
    if (role && SKIP_ROLES.has(role)) return true;
    if ((element as HTMLElement).isContentEditable) return true;
    const style = getComputedStyle(element);
    return style.display === 'none' || style.visibility === 'hidden';
  }

  function walk(node: Node): void {
    for (const child of node.childNodes) {
      if (length >= max) return;
      if (child.nodeType === Node.TEXT_NODE) {
        const text = (child as Text).data.replace(/\s+/g, ' ');
        if (text.trim()) add(text);
      } else if (child.nodeType === Node.ELEMENT_NODE) {
        const element = child as Element;
        if (SKIP.has(element.tagName.toUpperCase()) || hidden(element)) continue;
        const block = BLOCK.test(element.tagName.toUpperCase());
        if (block) add('\n');
        walk(element);
        if (block) add('\n');
      }
    }
  }

  const description = document
    .querySelector('meta[name="description"], meta[property="og:description"]')
    ?.getAttribute('content')
    ?.trim();
  if (description) add(`${description}\n`);
  // The main content when the page marks it and it says enough, else all.
  const main = document.querySelector('main, article, [role="main"]');
  const before = length;
  if (main) walk(main);
  if (!main || length - before < 200) {
    parts.length = description ? 1 : 0;
    length = parts.join('').length;
    walk(document.body);
  }
  return parts
    .join('')
    .replace(/[^\S\n]+/g, ' ')
    .replace(/ ?\n[\s]*/g, '\n')
    .trim()
    .slice(0, max);
}
