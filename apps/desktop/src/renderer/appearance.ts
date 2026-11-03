import { frameSource, type SkinFrame } from '@mocha/core';
import { drawPlaceholderMocha, type PixelPainter } from './placeholder-sprite.ts';
import { drawPupil } from './pupil.ts';
import { drawShadow, shadowRows } from './shadow.ts';
import type { LoadedSkin, SkinImage } from './skin-loader.ts';

export interface Pose {
  /** The frame to draw, chosen by the pet animator. */
  frame: SkinFrame;
  /** Whether the cursor is over Mocha. */
  hovered: boolean;
}

/** What drawing needs from a canvas context, generic over the image type. */
export interface SpritePainter<I> extends PixelPainter {
  drawImage(
    image: I,
    sx: number,
    sy: number,
    sw: number,
    sh: number,
    dx: number,
    dy: number,
    dw: number,
    dh: number,
  ): void;
}

/**
 * Strategy for drawing Mocha. The game loop only calls draw(); whether the
 * pixels come from a skin or from the built-in placeholder is decided once,
 * when the skin loads.
 */
export interface Appearance<I> {
  draw(painter: SpritePainter<I>, pose: Pose): void;
}

/** Draws frames from a validated skin's sprite sheet. */
export function skinAppearance<I extends SkinImage>(skin: LoadedSkin<I>): Appearance<I> {
  const { frameSize, animations } = skin.manifest;
  // The ground is where the feet rest in the first idle frame.
  const groundY = animations.idle.frames[0].anchors?.feet?.y;
  return {
    draw(painter, { frame, hovered }) {
      // Behind the sprite, so the feet stand on it.
      const feet = frame.anchors?.feet;
      if (feet && groundY !== undefined) drawShadow(painter, shadowRows(feet, groundY));
      const source = frameSource(frameSize, frame.index, skin.image.width);
      painter.drawImage(
        skin.image,
        source.x,
        source.y,
        source.width,
        source.height,
        0,
        0,
        source.width,
        source.height,
      );
      // Frames without an eye anchor have the eye closed: no pupil.
      if (frame.anchors?.eye) drawPupil(painter, frame.anchors.eye, hovered);
    },
  };
}

/**
 * Last resort when no skin can be loaded: the blocky placeholder drawn in
 * code. Its frames (PLACEHOLDER_ANIMATIONS) use the index as the bob offset.
 */
export function placeholderAppearance<I>(): Appearance<I> {
  return {
    draw(painter, { frame, hovered }) {
      drawPlaceholderMocha(painter, { offsetY: frame.index % 2, hovered });
    },
  };
}
