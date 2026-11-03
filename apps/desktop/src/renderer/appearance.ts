import { frameSource, type Gaze, type SkinFrame } from '@mocha/core';
import { drawPlaceholderMocha, type PixelPainter, PUPIL_POSITION } from './placeholder-sprite.ts';
import { drawPupil } from './pupil.ts';
import { drawShadow, shadowRows } from './shadow.ts';
import type { LoadedSkin, SkinImage } from './skin-loader.ts';

export interface Pose {
  /** The frame to draw, chosen by the pet animator. */
  frame: SkinFrame;
  /** Whether the cursor is over Mocha. */
  hovered: boolean;
  /** Where the pupil looks. */
  gaze: Gaze;
}

export interface Point {
  x: number;
  y: number;
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
  /** Center of the open eye in sprite pixels, or undefined when the eye is closed. */
  eyeCenter(frame: SkinFrame): Point | undefined;
}

/** The pupil is 2x2; its center is one pixel right of and below its top-left anchor. */
const centerOf = (pupil: Point): Point => ({ x: pupil.x + 1, y: pupil.y + 1 });

/** Draws frames from a validated skin's sprite sheet. */
export function skinAppearance<I extends SkinImage>(skin: LoadedSkin<I>): Appearance<I> {
  const { frameSize, animations } = skin.manifest;
  // The ground is where the feet rest in the first idle frame.
  const groundY = animations.idle.frames[0].anchors?.feet?.y;
  return {
    eyeCenter(frame) {
      const eye = frame.anchors?.eye;
      return eye ? centerOf(eye) : undefined;
    },
    draw(painter, { frame, hovered, gaze }) {
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
      const eye = frame.anchors?.eye;
      if (eye) drawPupil(painter, { x: eye.x + gaze.x, y: eye.y + gaze.y }, hovered);
    },
  };
}

/**
 * Last resort when no skin can be loaded: the blocky placeholder drawn in
 * code. Its frames (PLACEHOLDER_ANIMATIONS) use the index as the bob offset.
 */
export function placeholderAppearance<I>(): Appearance<I> {
  return {
    eyeCenter(frame) {
      return centerOf({ x: PUPIL_POSITION.x, y: PUPIL_POSITION.y + (frame.index % 2) });
    },
    draw(painter, { frame, hovered, gaze }) {
      drawPlaceholderMocha(painter, { offsetY: frame.index % 2, hovered, gaze });
    },
  };
}
