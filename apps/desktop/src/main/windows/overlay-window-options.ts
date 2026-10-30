import { OVERLAY_SIZE } from '../../shared/overlay.ts';
import type { SafeWindowOptions } from './secure-window-options.ts';

export interface Rect {
  x: number;
  y: number;
  width: number;
  height: number;
}

export interface Point {
  x: number;
  y: number;
}

/**
 * Top-left corner that places a square window of `size` in the bottom-right
 * of a display's work area (the area not covered by the Dock or menu bar).
 */
export function bottomRightPosition(workArea: Rect, size: number, margin: number): Point {
  return {
    x: Math.round(workArea.x + workArea.width - size - margin),
    y: Math.round(workArea.y + workArea.height - size - margin),
  };
}

/** Window options for the transparent, frameless, always-on-top overlay. */
export function overlayWindowOptions(
  platform: NodeJS.Platform,
  position: Point,
): SafeWindowOptions {
  return {
    ...position,
    width: OVERLAY_SIZE,
    height: OVERLAY_SIZE,
    transparent: true, // only Mocha's own pixels are visible
    frame: false,
    hasShadow: false, // macOS would draw a shadow around the whole square
    resizable: false,
    minimizable: false,
    maximizable: false,
    fullscreenable: false,
    skipTaskbar: true,
    title: 'Mocha',
    // NSPanel can float above other apps' fullscreen Spaces. macOS only.
    ...(platform === 'darwin' ? { type: 'panel' } : {}),
  };
}
