import { COMMENT_SHOW_MS } from '../shared/comment.ts';

// Entry point of the comment bubble. It only shows what the main process
// sends, as plain text: a comment can hold a page title, which is never
// trusted as HTML (ADR-0011).

const text = document.getElementById('text');
if (!text) throw new Error('comment.html is missing #text');
document.body.style.setProperty('--show-ms', `${COMMENT_SHOW_MS}ms`);

window.comment.onShow((show) => {
  text.textContent = show.text;
  document.body.dataset['side'] = show.side;
  document.body.dataset['ready'] = '';
});
