import { describe, expect, it } from 'vitest';
import { checkSize, formatKB, formatRange, KB_MARGIN_MIN, targetWindow } from './kb';

describe('targetWindow', () => {
  it('targets the window that passes both readings with a margin', () => {
    const w = targetWindow(20, 50);
    expect(w.hardLo).toBe(20 * 1024);
    expect(w.hardHi).toBe(50 * 1000);
    expect(w.dual).toBe(true);
    const range = 50_000 - 20_480;
    expect(w.margin).toBe(Math.max(KB_MARGIN_MIN, Math.round(range * 0.03)));
    expect(w.lo).toBe(20_480 + w.margin);
    expect(w.hi).toBe(50_000 - w.margin);
    expect(w.mid).toBe(Math.round((w.lo + w.hi) / 2));
  });

  it('keeps no low margin without a minimum', () => {
    const w = targetWindow(null, 100);
    expect(w.lo).toBe(0);
    expect(w.hi).toBe(100_000 - 3000);
  });

  it('shrinks the margin to a quarter of a narrow range', () => {
    const w = targetWindow(10, 12); // 10240..12000
    expect(w.margin).toBe(Math.floor((12_000 - 10_240) / 4));
    expect(w.lo).toBeLessThan(w.hi);
  });

  it('falls back to the 1024 reading when no size passes both', () => {
    const w = targetWindow(49, 50); // 50176 > 50000
    expect(w.dual).toBe(false);
    expect(w.hardHi).toBe(50 * 1024);
    expect(w.hardLo).toBe(49 * 1024);
  });
});

describe('checkSize / format', () => {
  it('checks both readings', () => {
    expect(checkSize(50 * 1000, 20, 50)).toEqual({ pass1024: true, pass1000: true });
    expect(checkSize(50 * 1024, 20, 50)).toEqual({ pass1024: true, pass1000: false });
    expect(checkSize(20 * 1000, 20, 50)).toEqual({ pass1024: false, pass1000: true });
  });
  it('formats', () => {
    expect(formatKB(35021)).toBe('34.2 KB');
    expect(formatKB(150 * 1024)).toBe('150 KB');
    expect(formatKB(50_000, 1000)).toBe('50.0 KB');
    expect(formatRange(20, 50)).toBe('20–50 KB');
    expect(formatRange(null, 50)).toBe('≤ 50 KB');
  });
});
