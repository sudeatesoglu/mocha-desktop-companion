import { checkSkinImage, parseSkinManifest, type SkinManifest } from '@mocha/core';

/** Anything with pixel dimensions: an HTMLImageElement in the app, a stub in tests. */
export interface SkinImage {
  readonly width: number;
  readonly height: number;
}

export interface LoadedSkin<I extends SkinImage = SkinImage> {
  manifest: SkinManifest;
  image: I;
}

export type SkinLoadResult<I extends SkinImage> =
  | { ok: true; skin: LoadedSkin<I> }
  | { ok: false; errors: string[] };

/**
 * Validates a skin in two stages: the manifest (before touching any file),
 * then the sprite sheet against it (after it loaded). Never throws: a broken
 * skin is reported as errors so the caller can fall back.
 */
export async function loadSkin<I extends SkinImage>(
  manifestJson: unknown,
  loadImage: (fileName: string) => Promise<I>,
  requiredFrameSize?: SkinImage,
): Promise<SkinLoadResult<I>> {
  const parsed = parseSkinManifest(manifestJson);
  if (!parsed.ok) return { ok: false, errors: parsed.errors };

  // The overlay window has a fixed size, so frames must match it exactly.
  const { width, height } = parsed.value.frameSize;
  if (
    requiredFrameSize &&
    (width !== requiredFrameSize.width || height !== requiredFrameSize.height)
  ) {
    return {
      ok: false,
      errors: [
        `frameSize: must be ${requiredFrameSize.width}x${requiredFrameSize.height}, got ${width}x${height}`,
      ],
    };
  }

  let image: I;
  try {
    image = await loadImage(parsed.value.image);
  } catch (error) {
    const reason = error instanceof Error ? error.message : String(error);
    return { ok: false, errors: [`image: could not load "${parsed.value.image}" (${reason})`] };
  }

  const imageErrors = checkSkinImage(parsed.value, image);
  if (imageErrors.length > 0) return { ok: false, errors: imageErrors };
  return { ok: true, skin: { manifest: parsed.value, image } };
}
