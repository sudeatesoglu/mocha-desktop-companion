// Runs in web pages while the user allows page activity (capability 7). It
// counts typing, scrolling and clicking, and nothing else: it never reads a
// key, a field's text, what is clicked or the page itself (ADR-0012).
import { createActivityCounter, isSecretField, WINDOW_SECONDS } from './activity-counter.ts';

const counter = createActivityCounter(() => performance.now());
const listening = { capture: true, passive: true };

function onKey(event: KeyboardEvent): void {
  if (!event.isTrusted) return;
  // The field really typed in, even inside a shadow root.
  const field = event.composedPath()[0];
  counter.key({
    repeat: event.repeat,
    secret: field instanceof HTMLInputElement && isSecretField(field),
  });
}
function onScroll(event: Event): void {
  if (event.isTrusted) counter.scroll();
}
function onClick(event: PointerEvent): void {
  if (event.isTrusted) counter.click();
}

addEventListener('keydown', onKey, listening);
addEventListener('scroll', onScroll, listening);
addEventListener('pointerdown', onClick, listening);

function stop(): void {
  clearInterval(timer);
  removeEventListener('keydown', onKey, listening);
  removeEventListener('scroll', onScroll, listening);
  removeEventListener('pointerdown', onClick, listening);
}

// Counts leave the page once a window, only while it is in front. The
// worker answers whether to keep counting: no when the user turned page
// activity off or paused, and then the script stops for good.
const timer = setInterval(async () => {
  const counts = counter.take();
  if (document.visibilityState !== 'visible') return;
  try {
    const answer: unknown = await chrome.runtime.sendMessage({ type: 'page-activity', counts });
    if ((answer as { keepCounting?: unknown } | undefined)?.keepCounting !== true) stop();
  } catch {
    stop(); // the extension was updated or removed
  }
}, WINDOW_SECONDS * 1_000);
