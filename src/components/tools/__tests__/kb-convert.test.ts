import { describe, expect, it } from 'vitest';
import {
  convertFitOptions,
  convertFloorKB,
  convertMayDownscale,
  kbDirection,
} from '../kb-convert';

const kb = (n: number) => Math.round(n * 1024);

describe('convertFloorKB', () => {
  it('is 90% of the target without a minimum', () => {
    expect(convertFloorKB(20, null)).toBe(18);
    expect(convertFloorKB(100, null)).toBe(90);
  });

  it('uses the form minimum when it is higher', () => {
    expect(convertFloorKB(50, 20)).toBe(45);
    expect(convertFloorKB(50, 48)).toBe(48);
  });
});

describe('kbDirection', () => {
  it('reduces a file above the target', () => {
    expect(kbDirection(kb(2400), 50, null)).toBe('reduce');
    expect(kbDirection(kb(50) + 1, 50, null)).toBe('reduce');
  });

  it('increases a file under the floor', () => {
    expect(kbDirection(kb(8), 20, null)).toBe('increase');
    expect(kbDirection(kb(17.9), 20, null)).toBe('increase');
  });

  it('respects a user minimum above the 90% floor', () => {
    expect(kbDirection(kb(46), 50, 48)).toBe('increase');
  });

  it('leaves a file already in the window as in range', () => {
    expect(kbDirection(kb(19), 20, null)).toBe('inRange');
    expect(kbDirection(kb(50), 50, null)).toBe('inRange');
  });
});

describe('convertFitOptions', () => {
  it('never downscales when increasing', () => {
    expect(convertFitOptions('increase', false)).toEqual({ keepSourceDims: true, allowDownscale: false });
    expect(convertMayDownscale('increase', false)).toBe(false);
  });

  it('follows the keep-dimensions toggle when reducing', () => {
    expect(convertFitOptions('reduce', false).allowDownscale).toBe(true);
    expect(convertFitOptions('reduce', true).allowDownscale).toBe(false);
    expect(convertMayDownscale('reduce', false)).toBe(true);
    expect(convertMayDownscale('reduce', true)).toBe(false);
  });
});
