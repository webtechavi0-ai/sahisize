import { isEngineError, type EngineErrorCode } from '@/engine/types';
import type { T } from '@/lib/format';

/** Plain-words message with the numbers (SPEC 6.1) for any thrown value. */
export function errorMessage(t: T, err: unknown): string {
  if (isEngineError(err)) return t(`common.errors.${err.code}`, err.details);
  return t('common.errors.UNKNOWN');
}

export function errorCode(err: unknown): EngineErrorCode | 'UNKNOWN' {
  return isEngineError(err) ? err.code : 'UNKNOWN';
}
