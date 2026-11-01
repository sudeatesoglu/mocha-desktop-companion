import { z } from 'zod';

/**
 * A skin is a sprite sheet (one PNG, frames in a grid) plus a manifest that
 * says which frames make up each animation. New skins are added as data,
 * without changing code (open/closed principle). Format: docs/skins.md.
 */

export const SKIN_SCHEMA_VERSION = 1;

/** Animations a skin can provide. Only `idle` is required; the rest fall back to it. */
export const ANIMATION_NAMES = ['idle', 'blink', 'look', 'hop', 'sleep'] as const;
export type AnimationName = (typeof ANIMATION_NAMES)[number];

const MAX_FRAME_SIDE = 256;
const MIN_FRAME_MS = 16; // one frame at 60 Hz; shorter frames would never be seen
const MAX_FRAME_MS = 60_000;

const pointSchema = z.strictObject({
  x: z.int().nonnegative(),
  y: z.int().nonnegative(),
});

/**
 * Points of interest inside a frame, in frame pixels:
 * - eye: top-left of the 2x2 pupil the app draws (frames without it have a closed eye)
 * - beak: tip of the beak (where food and speech start)
 * - head: top of the head (where hearts and "z"s appear)
 */
const anchorsSchema = z.strictObject({
  eye: pointSchema.optional(),
  beak: pointSchema.optional(),
  head: pointSchema.optional(),
});

const frameSchema = z.strictObject({
  /** Position in the sheet, counted row by row from the top-left cell. */
  index: z.int().nonnegative(),
  durationMs: z.int().min(MIN_FRAME_MS).max(MAX_FRAME_MS),
  anchors: anchorsSchema.optional(),
});

type Frame = z.infer<typeof frameSchema>;

const animationSchema = z.strictObject({
  loop: z.boolean(),
  frames: z
    .array(frameSchema)
    .min(1, 'an animation needs at least one frame')
    // Encode "at least one" in the type too, so code can use frames[0]
    // without a check. Safe: min(1) has already run.
    .transform((frames) => frames as [Frame, ...Frame[]]),
});

const manifestSchema = z
  .strictObject({
    schemaVersion: z.literal(SKIN_SCHEMA_VERSION),
    name: z.string().min(1).max(64),
    author: z.string().min(1).max(64).optional(),
    // A bare file name only: no folders, no URLs. The loader resolves it
    // inside the skin's own directory, so a skin cannot point elsewhere.
    image: z.string().regex(/^[\w-]+\.png$/, 'must be a file name like "sprite.png"'),
    frameSize: z.strictObject({
      width: z.int().min(1).max(MAX_FRAME_SIDE),
      height: z.int().min(1).max(MAX_FRAME_SIDE),
    }),
    animations: z.strictObject({
      idle: animationSchema,
      blink: animationSchema.optional(),
      look: animationSchema.optional(),
      hop: animationSchema.optional(),
      sleep: animationSchema.optional(),
    }),
  })
  .superRefine((manifest, context) => {
    const { width, height } = manifest.frameSize;
    for (const [name, animation] of Object.entries(manifest.animations)) {
      animation?.frames.forEach((frame, index) => {
        for (const [anchor, point] of Object.entries(frame.anchors ?? {})) {
          if (point && (point.x >= width || point.y >= height)) {
            context.addIssue({
              code: 'custom',
              message: `anchor must lie inside the ${width}x${height} frame`,
              path: ['animations', name, 'frames', index, 'anchors', anchor],
            });
          }
        }
      });
    }
  });

export type SkinManifest = z.infer<typeof manifestSchema>;
export type SkinAnimation = z.infer<typeof animationSchema>;
export type SkinFrame = z.infer<typeof frameSchema>;
export type SkinAnchors = z.infer<typeof anchorsSchema>;

export type ManifestResult = { ok: true; value: SkinManifest } | { ok: false; errors: string[] };

/**
 * Validates untrusted manifest JSON. Returns every problem at once, each as
 * "path: message", so a skin author can fix them all in one go.
 */
export function parseSkinManifest(input: unknown): ManifestResult {
  const result = manifestSchema.safeParse(input);
  if (result.success) return { ok: true, value: result.data };
  return {
    ok: false,
    errors: result.error.issues.map((issue) => {
      const path = issue.path.map(String).join('.') || '(root)';
      return `${path}: ${issue.message}`;
    }),
  };
}

export interface Size {
  width: number;
  height: number;
}

/**
 * Checks a valid manifest against the actual sprite sheet, which is only
 * known after the image has loaded. Returns problems as "path: message".
 */
export function checkSkinImage(manifest: SkinManifest, image: Size): string[] {
  const { width, height } = manifest.frameSize;
  if (image.width % width !== 0 || image.height % height !== 0) {
    return [
      `image: ${image.width}x${image.height} is not a multiple of the ${width}x${height} frame size`,
    ];
  }

  const cells = (image.width / width) * (image.height / height);
  const errors: string[] = [];
  for (const [name, animation] of Object.entries(manifest.animations)) {
    animation?.frames.forEach((frame, index) => {
      if (frame.index >= cells) {
        errors.push(
          `animations.${name}.frames.${index}.index: frame ${frame.index} is outside the ${cells}-frame sheet`,
        );
      }
    });
  }
  return errors;
}

/** Where frame `index` sits in a sheet that is `sheetWidth` pixels wide. */
export function frameSource(frameSize: Size, index: number, sheetWidth: number) {
  const columns = Math.floor(sheetWidth / frameSize.width);
  return {
    x: (index % columns) * frameSize.width,
    y: Math.floor(index / columns) * frameSize.height,
    width: frameSize.width,
    height: frameSize.height,
  };
}
