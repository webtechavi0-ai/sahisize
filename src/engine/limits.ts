/**
 * Engine limits. Kept inside the engine (engine imports nothing from config/) and mirrored by
 * the upload UI copy. Change both together.
 */

/** Largest image upload accepted by decode() (25 MB). */
export const MAX_UPLOAD_BYTES = 25 * 1024 * 1024;

/** Largest PDF accepted by decodePdfPages() / compressPdf() (same as images). */
export const MAX_PDF_BYTES = 25 * 1024 * 1024;

/** Long-side cap applied right after decode. */
export const DEFAULT_MAX_SIDE = 4000;

/** Default per-round-trip timeout for worker calls. */
export const DEFAULT_CALL_TIMEOUT_MS = 180_000;

/** Rounded MB figures for TOO_LARGE_INPUT details. */
export function sizeDetails(bytes: number, max: number): { sizeMB: number; maxMB: number } {
  return { sizeMB: Math.round((bytes / 1048576) * 10) / 10, maxMB: Math.round(max / 1048576) };
}
