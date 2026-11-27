// @vitest-environment happy-dom
import { afterEach, describe, expect, it } from 'vitest';
import { extractPageText } from './page-text.ts';

const LONG = 'Lifetimes make sure references stay valid as long as we need them. '.repeat(5);

function page(head: string, body: string) {
  document.head.innerHTML = head;
  document.body.innerHTML = body;
}

describe('extractPageText', () => {
  afterEach(() => page('', ''));

  it('reads the description, then the main content in order', () => {
    page(
      '<meta name="description" content="The Rust book, chapter 10.">',
      `<nav>Home · Docs</nav>
       <main><h1>Lifetimes</h1><p>${LONG}</p><ul><li>One</li><li>Two</li></ul></main>
       <footer>© Rust</footer>`,
    );

    expect(extractPageText(10_000)).toBe(
      `The Rust book, chapter 10.\nLifetimes\n${LONG.trim()}\nOne\nTwo`,
    );
  });

  it('never reads forms, fields, buttons, editable or hidden parts', () => {
    page(
      '',
      `<main><p>${LONG}</p>
        <form><label>Card</label><input value="4111 1111 1111 1111"></form>
        <textarea>my draft</textarea><button>Pay</button>
        <div contenteditable="true">a private note</div>
        <p hidden>hidden</p><p aria-hidden="true">aria</p>
        <p style="display:none">none</p><p style="visibility:hidden">invisible</p>
        <div role="navigation">menu</div><script>secret()</script><style>.x{}</style>
      </main>`,
    );
    const text = extractPageText(10_000);

    expect(text).toBe(LONG.trim());
  });

  it('reads the whole page when no main content says enough', () => {
    page('<meta property="og:description" content="A video.">', '<main>Hi</main><p>Ravens</p>');

    expect(extractPageText(10_000)).toBe('A video.\nHi\nRavens');
    page('', '<h2>Plain</h2><div>page</div>');
    expect(extractPageText(10_000)).toBe('Plain\npage');
  });

  it('keeps inline text together and skips comments', () => {
    page(
      '',
      `<main><p>${LONG}</p><p>Read <a href="#">the book</a>, <em>now</em>.<!-- note --></p></main>`,
    );

    expect(extractPageText(10_000)).toBe(`${LONG.trim()}\nRead the book, now.`);
  });

  it('stops at the limit', () => {
    page('', `<main><p>${LONG}</p><p>${LONG}</p></main>`);

    expect(extractPageText(50)).toHaveLength(50);
    expect(extractPageText(50)).toBe(LONG.slice(0, 50));
  });

  it('gives nothing for an empty page', () => {
    expect(extractPageText(100)).toBe('');
  });
});
