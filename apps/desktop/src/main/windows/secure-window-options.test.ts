import { describe, expect, it } from 'vitest';
import { buildWindowOptions, type SafeWindowOptions } from './secure-window-options.ts';

const PRELOAD = '/app/out/preload/index.cjs';

describe('buildWindowOptions', () => {
  it('applies the security baseline', () => {
    const { webPreferences } = buildWindowOptions({ width: 200 }, PRELOAD);

    expect(webPreferences).toMatchObject({
      preload: PRELOAD,
      contextIsolation: true,
      sandbox: true,
      nodeIntegration: false,
      webSecurity: true,
      webviewTag: false,
    });
  });

  it('keeps caller options such as size and title', () => {
    const options = buildWindowOptions({ width: 200, height: 100, title: 'Mocha' }, PRELOAD);

    expect(options).toMatchObject({ width: 200, height: 100, title: 'Mocha' });
  });

  it('starts hidden unless the caller decides otherwise', () => {
    expect(buildWindowOptions({}, PRELOAD).show).toBe(false);
    expect(buildWindowOptions({ show: true }, PRELOAD).show).toBe(true);
  });

  it('cannot be weakened by smuggled web preferences', () => {
    // A cast simulates a caller bypassing the SafeWindowOptions type.
    const hostile = {
      webPreferences: { nodeIntegration: true, contextIsolation: false, sandbox: false },
    } as unknown as SafeWindowOptions;

    const { webPreferences } = buildWindowOptions(hostile, PRELOAD);

    expect(webPreferences).toMatchObject({
      nodeIntegration: false,
      contextIsolation: true,
      sandbox: true,
    });
  });
});
