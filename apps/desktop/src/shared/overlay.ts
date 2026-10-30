/** Mocha's sprite is drawn at this resolution (pixels per side). */
export const SPRITE_SIZE = 48;

/** Integer upscaling keeps pixel art crisp: one sprite pixel = SCALE² screen pixels. */
export const OVERLAY_SCALE = 3;

/** Side length of the overlay window in screen pixels. */
export const OVERLAY_SIZE = SPRITE_SIZE * OVERLAY_SCALE;

/** Gap between the overlay and the screen edges on first launch. */
export const OVERLAY_MARGIN = 24;
