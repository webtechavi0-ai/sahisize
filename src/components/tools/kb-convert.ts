/**
 * Pure logic for /tools/photo-size-converter-in-kb: one target KB, and the file goes down
 * OR up to land in range. No new codec: the spec is the compress tool's (compressSpec, so
 * the window is [max(min, 90% of target), target]) and the engine's own fit() raises a file
 * that is under the floor (higher quality, then invisible grain, then COM padding) exactly
 * as /tools/increase-image-size-in-kb does. This file only picks the direction and options.
 */
import { KB, type FitOptions } from '@/engine/types';
import { compressFitOptions, lowerBoundKB } from './logic';
import { increaseFitOptions } from './increase';

/** Target chips for the converter: the KB sizes exam forms ask for most (plus custom). */
export const CONVERT_KB_PRESETS = [10, 20, 30, 50, 100, 200, 300, 500] as const;

export type KbDirection = 'reduce' | 'increase' | 'inRange';

/** Bottom of the result window: the user's minimum, or 90% of the target. */
export function convertFloorKB(targetKB: number, minKB: number | null): number {
  return Math.max(minKB ?? 0, lowerBoundKB(targetKB));
}

/**
 * Which way the file has to move. Above the target -> reduce; under the floor -> increase;
 * otherwise it is already in range (it is still re-saved, so the checks run on the result).
 */
export function kbDirection(fileBytes: number, targetKB: number, minKB: number | null): KbDirection {
  if (fileBytes > targetKB * KB) return 'reduce';
  if (fileBytes < convertFloorKB(targetKB, minKB) * KB) return 'increase';
  return 'inRange';
}

/**
 * Engine options per direction. Increasing never shrinks the pixels (same as the increase
 * tool's default). Reducing follows the "keep width and height" toggle, like the compress tool.
 */
export function convertFitOptions(dir: KbDirection, keepDims: boolean): FitOptions {
  return dir === 'increase' ? increaseFitOptions(true) : compressFitOptions(keepDims);
}

/** Downscale retries only make sense when the file has to get smaller. */
export function convertMayDownscale(dir: KbDirection, keepDims: boolean): boolean {
  return dir !== 'increase' && !keepDims;
}
