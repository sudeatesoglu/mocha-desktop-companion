import { describe, expect, it } from 'vitest';
import { OVERLAY_SIZE } from '../../shared/overlay.ts';
import { bottomRightPosition, overlayWindowOptions } from './overlay-window-options.ts';

describe('bottomRightPosition', () => {
  it('places the window in the bottom-right corner with a margin', () => {
    const workArea = { x: 0, y: 25, width: 1440, height: 875 };

    expect(bottomRightPosition(workArea, 144, 24)).toEqual({ x: 1272, y: 732 });
  });

  it('respects a display that is not at the origin', () => {
    // A second monitor to the left of the primary one has negative x.
    const workArea = { x: -1920, y: 0, width: 1920, height: 1080 };

    expect(bottomRightPosition(workArea, 144, 24)).toEqual({ x: -168, y: 912 });
  });

  it('rounds fractional work areas to whole pixels', () => {
    const workArea = { x: 0.5, y: 0, width: 1000, height: 800.4 };

    expect(bottomRightPosition(workArea, 100, 0)).toEqual({ x: 901, y: 700 });
  });
});

describe('overlayWindowOptions', () => {
  const position = { x: 10, y: 20 };

  it('creates a transparent, frameless square at the given position', () => {
    expect(overlayWindowOptions('darwin', position)).toMatchObject({
      x: 10,
      y: 20,
      width: OVERLAY_SIZE,
      height: OVERLAY_SIZE,
      transparent: true,
      frame: false,
      hasShadow: false,
      resizable: false,
      skipTaskbar: true,
    });
  });

  it('uses a floating panel on macOS', () => {
    expect(overlayWindowOptions('darwin', position).type).toBe('panel');
  });

  it.each(['win32', 'linux'] as const)(
    'does not use the macOS-only panel type on %s',
    (platform) => {
      expect(overlayWindowOptions(platform, position)).not.toHaveProperty('type');
    },
  );
});
