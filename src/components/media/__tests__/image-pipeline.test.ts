import { join } from 'node:path';
import { describe, expect, it } from 'vitest';
import manifestJson from '@/content/images/manifest.json';
import { ImageManifestSchema, type GeneratedImages } from '../image-schema';
// Pure helpers shared by scripts/images/{generate,optimize,check}.mjs.
import {
  backoffMs,
  buildGenerationRequest,
  checkImages,
  heightFor,
  isRetryableStatus,
  mapPool,
  parseArgs,
  renditionName,
  renditionPattern,
  selectSlots,
  stableStringify,
} from '../../../../scripts/images/lib.mjs';

const manifest = ImageManifestSchema.parse(manifestJson);

describe('generate helpers', () => {
  it('parses flags and rejects unknown ones', () => {
    expect(parseArgs(['--only', 'a,b', '--only=c', '--force', '--dry-run', '--quality', 'low'])).toEqual({
      only: ['a', 'b', 'c'],
      force: true,
      dryRun: true,
      quality: 'low',
    });
    expect(() => parseArgs(['--dryrun'])).toThrow(/Unknown argument/);
    expect(() => parseArgs(['--only'])).toThrow(/needs a value/);
    expect(() => parseArgs(['--quality', 'ultra'])).toThrow();
    expect(() => parseArgs(['--force'], ['only'])).toThrow(/Unknown argument/);
  });

  it('selects slots by id and refuses unknown ids', () => {
    expect(selectSlots(manifest, ['home-hero']).map((s) => s.id)).toEqual(['home-hero']);
    expect(selectSlots(manifest, []).length).toBe(manifest.slots.length);
    expect(() => selectSlots(manifest, ['nope'])).toThrow(/Unknown slot/);
  });

  it('builds an OpenAI Images request from the slot', () => {
    const slot = manifest.slots.find((s) => s.id === 'exam-neet-ug-photo-correct')!;
    const body = buildGenerationRequest(manifest, slot, { model: 'gpt-image-1' });
    expect(body).toMatchObject({ model: 'gpt-image-1', n: 1, size: '1024x1536', quality: 'medium', background: 'opaque', output_format: 'png' });
    expect(body.prompt).toContain(slot.generation.prompt);
    expect(body.prompt).toContain(manifest.style.avoid);
    expect(buildGenerationRequest(manifest, slot, { quality: 'low' }).quality).toBe('low');
    expect(JSON.stringify(body)).not.toMatch(/sk-|api[_-]?key/i);
  });

  it('retries only transient statuses with bounded backoff', () => {
    expect([429, 500, 503, 408].every(isRetryableStatus)).toBe(true);
    expect([400, 401, 403, 404].some(isRetryableStatus)).toBe(false);
    expect(backoffMs(0, null, { random: () => 0 })).toBe(2000);
    expect(backoffMs(2, null, { random: () => 0 })).toBe(8000);
    expect(backoffMs(20, null, { random: () => 1 })).toBe(75000);
    expect(backoffMs(0, '7')).toBe(7000);
    expect(backoffMs(0, '999')).toBe(60000);
  });

  it('runs at most `limit` tasks at once and keeps result order', async () => {
    let inFlight = 0;
    let peak = 0;
    const results = await mapPool([30, 10, 20, 5], 2, async (ms) => {
      inFlight++;
      peak = Math.max(peak, inFlight);
      await new Promise((r) => setTimeout(r, ms));
      inFlight--;
      if (ms === 20) throw new Error('boom');
      return ms;
    });
    expect(peak).toBe(2);
    expect(results.map((r) => r.status)).toEqual(['fulfilled', 'fulfilled', 'rejected', 'fulfilled']);
  });
});

describe('optimize helpers', () => {
  it('names renditions so one id never matches another id that shares its prefix', () => {
    const name = renditionName('exam-neet-ug-photo-correct', 480, 'abcdef12', 'avif');
    expect(name).toBe('exam-neet-ug-photo-correct-480-abcdef12.avif');
    expect(renditionPattern('exam-neet-ug-photo-correct').test(name)).toBe(true);
    expect(renditionPattern('exam-neet-ug-photo').test(name)).toBe(false);
  });

  it('computes heights from the aspect and writes stable JSON', () => {
    expect(heightFor(960, '3:2')).toBe(640);
    expect(heightFor(360, '3:4')).toBe(480);
    expect(stableStringify({ b: 1, a: { d: [2, 1], c: 0 } })).toBe('{\n  "a": {\n    "c": 0,\n    "d": [\n      2,\n      1\n    ]\n  },\n  "b": 1\n}\n');
  });
});

describe('checkImages', () => {
  const noFiles = { exists: () => false, listPublicImg: () => [] as string[] };
  const empty: GeneratedImages = { version: 1, images: {} };
  // Fixture independent of how many slots are approved in the committed manifest.
  const planned = { ...manifest, slots: manifest.slots.map((s) => ({ ...s, status: 'planned' as const })) };

  it('passes a manifest of planned slots with zero generated images', () => {
    const { errors } = checkImages({ manifest: planned, generated: empty, fs: noFiles, routes: null, publicImgDir: '/p' });
    expect(errors).toEqual([]);
  });

  it('flags an approved slot without source or optimized files, and orphan files', () => {
    const approved = {
      ...planned,
      slots: planned.slots.map((s) => (s.id === 'home-hero' ? { ...s, status: 'approved' as const } : s)),
    };
    const fs = { exists: () => false, listPublicImg: () => ['old-slot-480-abcdef12.webp'] };
    const { errors } = checkImages({ manifest: approved, generated: empty, fs, routes: null, publicImgDir: '/p' });
    expect(errors.join('\n')).toMatch(/home-hero: approved but source PNG is missing/);
    expect(errors.join('\n')).toMatch(/home-hero: approved but not optimized/);
    expect(errors.join('\n')).toMatch(/old-slot-480-abcdef12\.webp is not referenced/);
  });

  it('accepts a consistent published entry and catches a missing file', () => {
    const approved = {
      ...planned,
      slots: planned.slots.map((s) => (s.id === 'home-hero' ? { ...s, status: 'approved' as const } : s)),
    };
    const files = (ext: string) => [
      { src: `/img/home-hero-480-abcdef12.${ext}`, width: 480, height: 320 },
      { src: `/img/home-hero-960-abcdef12.${ext}`, width: 960, height: 640 },
    ];
    const generated: GeneratedImages = {
      version: 1,
      images: {
        'home-hero': {
          width: 960,
          height: 640,
          hash: 'abcdef12',
          blurDataURL: 'data:image/webp;base64,AAAA',
          avif: files('avif'),
          webp: files('webp'),
        },
      },
    };
    const names = [...files('avif'), ...files('webp')].map((f) => f.src.slice(5));
    const present = new Set([...names.map((n) => join('/p', n))]);
    const fs = { exists: (p: string) => present.has(p) || p.endsWith('home-hero.png'), listPublicImg: () => names };
    expect(checkImages({ manifest: approved, generated, fs, routes: null, publicImgDir: '/p' }).errors).toEqual([]);

    present.delete(join('/p', names[0]!));
    const { errors } = checkImages({ manifest: approved, generated, fs, routes: null, publicImgDir: '/p' });
    expect(errors).toEqual([`home-hero: missing file public/img/${names[0]}`]);
  });

  it('warns about routes that do not exist yet', () => {
    const { warnings } = checkImages({ manifest: planned, generated: empty, fs: noFiles, routes: new Set(['/']), publicImgDir: '/p' });
    expect(warnings.some((w) => w.includes('/exam/gate'))).toBe(true);
  });
});
