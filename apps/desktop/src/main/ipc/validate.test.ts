import { describe, expect, it, vi } from 'vitest';
import { rendererErrorReportSchema } from './schemas.ts';
import { isTrustedSenderUrl, validated } from './validate.ts';

const PROD_URL = 'file:///Applications/Mocha.app/Contents/Resources/app/out/renderer/index.html';
const DEV_URL = 'http://localhost:5173/';

describe('isTrustedSenderUrl', () => {
  it('accepts the exact renderer file', () => {
    expect(isTrustedSenderUrl(PROD_URL, [PROD_URL])).toBe(true);
  });

  it('ignores query strings and fragments', () => {
    expect(isTrustedSenderUrl(`${PROD_URL}?window=overlay#top`, [PROD_URL])).toBe(true);
  });

  it('rejects a different local file', () => {
    expect(isTrustedSenderUrl('file:///Users/someone/Downloads/evil.html', [PROD_URL])).toBe(false);
  });

  it('accepts any page on the dev server origin', () => {
    expect(isTrustedSenderUrl('http://localhost:5173/tower.html', [DEV_URL])).toBe(true);
  });

  it('rejects another origin or port', () => {
    expect(isTrustedSenderUrl('http://localhost:5174/', [DEV_URL])).toBe(false);
    expect(isTrustedSenderUrl('https://example.com/', [DEV_URL])).toBe(false);
  });

  it('rejects a protocol mismatch', () => {
    expect(isTrustedSenderUrl('http://localhost:5173/', [PROD_URL])).toBe(false);
  });

  it('rejects malformed URLs', () => {
    expect(isTrustedSenderUrl('not a url', [PROD_URL])).toBe(false);
  });
});

describe('validated', () => {
  const setup = (trusted = true) => {
    const handler = vi.fn((report: { message: string }) => report.message.length);
    const logger = { warn: vi.fn() };
    const listener = validated('test:channel', rendererErrorReportSchema, handler, {
      isTrusted: () => trusted,
      logger,
    });
    return { handler, logger, listener };
  };

  it('passes a valid payload to the handler and returns its result', () => {
    const { handler, logger, listener } = setup();

    expect(listener(PROD_URL, { message: 'boom' })).toBe(4);
    expect(handler).toHaveBeenCalledWith({ message: 'boom' });
    expect(logger.warn).not.toHaveBeenCalled();
  });

  it.each([
    ['a missing field', {}],
    ['a wrong type', { message: 42 }],
    ['an empty message', { message: '' }],
    ['an oversized message', { message: 'x'.repeat(2_001) }],
    ['an unknown extra field', { message: 'boom', admin: true }],
    ['a non-object', 'boom'],
    ['null', null],
  ])('rejects and logs %s', (_case, payload) => {
    const { handler, logger, listener } = setup();

    expect(listener(PROD_URL, payload)).toBeUndefined();
    expect(handler).not.toHaveBeenCalled();
    expect(logger.warn).toHaveBeenCalledWith(
      '[ipc] test:channel: rejected invalid payload',
      expect.any(Array),
    );
  });

  it('rejects an untrusted sender before looking at the payload', () => {
    const { handler, logger, listener } = setup(false);

    expect(listener('https://example.com/', { message: 'boom' })).toBeUndefined();
    expect(handler).not.toHaveBeenCalled();
    expect(logger.warn).toHaveBeenCalledWith('[ipc] test:channel: rejected untrusted sender', {
      senderUrl: 'https://example.com/',
    });
  });
});
