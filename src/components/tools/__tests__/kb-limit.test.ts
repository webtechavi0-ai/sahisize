import { describe, expect, it } from 'vitest';
import { limitMatchesTarget } from '../kb-limit';

const doc = (maxKB: number | null, minKB: number | null = null, toVerify?: boolean) => ({ maxKB, minKB, toVerify });

describe('limitMatchesTarget', () => {
  it('matches an equal limit', () => {
    expect(limitMatchesTarget(300, doc(300, 50))).toBe(true);
    expect(limitMatchesTarget(500, doc(500))).toBe(true);
  });

  it('matches a "less than T KB" rule stored as T − 1', () => {
    expect(limitMatchesTarget(400, doc(399))).toBe(true);
  });

  it('rejects limits 25% or more above the target', () => {
    expect(limitMatchesTarget(400, doc(500))).toBe(false);
    expect(limitMatchesTarget(50, doc(300, 50))).toBe(false);
    expect(limitMatchesTarget(200, doc(300, 50))).toBe(false);
  });

  it('accepts limits a little above the target', () => {
    expect(limitMatchesTarget(250, doc(300, 50))).toBe(true);
  });

  it('rejects limits below the target', () => {
    expect(limitMatchesTarget(500, doc(399))).toBe(false);
    expect(limitMatchesTarget(300, doc(200, 20))).toBe(false);
  });

  it('rejects a minimum above the target', () => {
    expect(limitMatchesTarget(50, doc(60, 55))).toBe(false);
  });

  it('never lists unverified or unknown sizes', () => {
    expect(limitMatchesTarget(200, doc(200, 20, true))).toBe(false);
    expect(limitMatchesTarget(200, doc(null))).toBe(false);
    expect(limitMatchesTarget(0, doc(0))).toBe(false);
  });
});
