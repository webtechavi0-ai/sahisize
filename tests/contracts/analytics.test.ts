import { afterEach, describe, expect, it, vi } from 'vitest';
import { configureAnalytics, flattenProps, inputFormat, kbBucket, track } from '@/lib/analytics';

describe('analytics', () => {
  afterEach(() => configureAnalytics(null));

  it('is a no-op until configured', () => {
    expect(() => track('tool_used', { tool: 'compress-image', target: '20' })).not.toThrow();
  });

  it('sends flattened scalar props', () => {
    const send = vi.fn();
    configureAnalytics(send);
    track('fit_done', {
      exam: 'ibps-po',
      doc: 'signature',
      pass: true,
      stages: ['encode', 'grain', 'pad'],
      ms: 812,
    });
    expect(send).toHaveBeenCalledWith('fit_done', {
      exam: 'ibps-po',
      doc: 'signature',
      pass: true,
      stages: 'encode,grain,pad',
      ms: 812,
    });
  });

  it('never throws when the sender throws', () => {
    configureAnalytics(() => {
      throw new Error('boom');
    });
    expect(() => track('kit_started', { exam: 'ibps-po', docs: 4 })).not.toThrow();
  });

  it('buckets sizes and formats without names', () => {
    expect(kbBucket(62 * 1024)).toBe('50-100');
    expect(kbBucket(12 * 1024 * 1024)).toBe('>10MB');
    expect(inputFormat('image/heic')).toBe('heic');
    expect(inputFormat('', 'IMG_0001.JPG')).toBe('jpg');
    expect(flattenProps({ a: undefined, b: [1, 2] })).toEqual({ b: '1,2' });
  });
});
