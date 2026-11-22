import { readFileSync, readdirSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';
import { EXAM_GROUPS } from '@/config/exams';
import manifestJson from '@/content/images/manifest.json';
import generatedJson from '@/content/images/generated.json';
import {
  GENERATION_SIZES,
  GeneratedImagesSchema,
  ImageManifestSchema,
  aspectRatio,
  composePrompt,
  type ImageManifest,
} from '../image-schema';

const manifest = ImageManifestSchema.parse(manifestJson);

const REQUIRED_SLOTS: Record<string, string> = {
  'home-hero': '/',
  'tool-photo-size-converter-in-kb-hero': '/tools/photo-size-converter-in-kb',
  'tool-compress-image-hero': '/tools/compress-image',
  'tool-compress-image-to-20kb-hero': '/tools/compress-image-to-20kb',
  'tool-compress-image-to-100kb-hero': '/tools/compress-image-to-100kb',
  'tool-compress-image-to-200kb-hero': '/tools/compress-image-to-200kb',
  'tool-increase-image-size-in-kb-hero': '/tools/increase-image-size-in-kb',
  'exams-net-hero': '/exams/net',
  'exams-ssc-hero': '/exams/ssc',
  'exam-neet-ug-hero': '/exam/neet-ug',
  'exam-neet-ug-photo-correct': '/exam/neet-ug',
  'exam-neet-ug-photo-rejected': '/exam/neet-ug',
  'exam-neet-ug-passport-vs-postcard': '/exam/neet-ug',
  'exam-gate-hero': '/exam/gate',
  'exam-rrb-ntpc-hero': '/exam/rrb-ntpc',
  'exam-csir-net-hero': '/exam/csir-net',
  'exam-jee-main-hero': '/exam/jee-main',
};

describe('image manifest', () => {
  it('validates against the schema', () => {
    expect(() => ImageManifestSchema.parse(manifestJson)).not.toThrow();
  });

  it('has every planned slot on its route', () => {
    for (const [id, route] of Object.entries(REQUIRED_SLOTS)) {
      const slot = manifest.slots.find((s) => s.id === id);
      expect(slot, id).toBeDefined();
      expect(slot!.routes).toContain(route);
    }
  });

  it('gives NEET UG a correct and a rejected example', () => {
    const placements = manifest.slots.filter((s) => s.routes.includes('/exam/neet-ug')).map((s) => s.placement);
    expect(placements).toEqual(expect.arrayContaining(['hero', 'example-correct', 'example-rejected']));
  });

  it('uses a distinct prompt and alt text per slot', () => {
    const prompts = manifest.slots.map((s) => s.generation.prompt);
    expect(new Set(prompts).size).toBe(prompts.length);
    const altsEn = manifest.slots.map((s) => s.alt.en);
    expect(new Set(altsEn).size).toBe(altsEn.length);
  });

  it('writes Hindi alt text in Devanagari and never starts alt text with "image of"', () => {
    for (const s of manifest.slots) {
      expect(s.alt.hi, s.id).toMatch(/[ऀ-ॿ]/);
      expect(s.alt.en.toLowerCase(), s.id).not.toMatch(/^(image|picture|photo) of/);
    }
  });

  it('can crop every rendition from the generated source', () => {
    for (const s of manifest.slots) {
      const [gw, gh] = s.generation.size.split('x').map(Number) as [number, number];
      const ratio = aspectRatio(s.aspect);
      const cropWidth = Math.min(gw, Math.round(gh * ratio));
      expect(s.widths.at(-1)!, s.id).toBeLessThanOrEqual(cropWidth);
      expect(GENERATION_SIZES).toContain(s.generation.size);
    }
  });

  it('wraps every prompt in the shared no-text / no-logo / no-real-people constraints', () => {
    const avoid = manifest.style.avoid.toLowerCase();
    for (const phrase of ['no text', 'logos', 'emblems', 'real or famous people', 'photorealistic']) {
      expect(avoid).toContain(phrase);
    }
    expect(manifest.style.base).toContain('#F8FAFF');
    expect(manifest.style.base).toContain('#4338CA');
    for (const s of manifest.slots) {
      const full = composePrompt(manifest.style, s);
      expect(full.startsWith(manifest.style.base)).toBe(true);
      expect(full.endsWith(manifest.style.avoid)).toBe(true);
    }
  });

  it('rejects duplicate ids and two heroes on one route', () => {
    const base = manifest as ImageManifest;
    const hero = base.slots.find((s) => s.id === 'home-hero')!;
    const dupId = { ...base, slots: [...base.slots, hero] };
    expect(ImageManifestSchema.safeParse(dupId).success).toBe(false);
    const twoHeroes = { ...base, slots: [...base.slots, { ...hero, id: 'home-hero-2' }] };
    const res = ImageManifestSchema.safeParse(twoHeroes);
    expect(res.success).toBe(false);
    expect(JSON.stringify(res.error?.issues)).toContain('already has hero');
  });

  it('rejects Hindi or trailing-slash routes', () => {
    const hero = manifest.slots[0]!;
    for (const route of ['/hi/exam/neet-ug', '/exam/neet-ug/', 'exam/neet-ug']) {
      const bad = { ...manifest, slots: [{ ...hero, routes: [route] }] };
      expect(ImageManifestSchema.safeParse(bad).success, route).toBe(false);
    }
  });
});

describe('exam-group illustrations', () => {
  const groupSlots = manifest.slots.filter((s) => s.groups);
  const presetDir = join(process.cwd(), 'src/content/presets');
  const presets = readdirSync(presetDir)
    .filter((f) => f.endsWith('.json'))
    .map((f) => JSON.parse(readFileSync(join(presetDir, f), 'utf8')) as { group?: string; published?: boolean });

  it('only names real exam groups, each in one slot, as a non-hero slot bound to no route', () => {
    const seen = new Set<string>();
    for (const s of groupSlots) {
      expect(s.placement, s.id).not.toBe('hero');
      expect(s.routes, s.id).toEqual([]);
      for (const g of s.groups!) {
        expect(EXAM_GROUPS as readonly string[], s.id).toContain(g);
        expect(seen.has(g), g).toBe(false);
        seen.add(g);
      }
    }
  });

  it('covers every group that has a published exam', () => {
    const covered = new Set(groupSlots.filter((s) => s.status === 'approved').flatMap((s) => s.groups!));
    const needed = new Set(presets.filter((p) => p.published && p.group).map((p) => p.group!));
    for (const g of needed) expect(covered.has(g), g).toBe(true);
  });

  it('rejects a slot with neither routes nor groups, a group hero and a group in two slots', () => {
    const base = manifest.slots.find((s) => s.groups)!;
    const noTarget = { ...manifest, slots: [...manifest.slots, { ...base, id: 'x-none', groups: undefined, routes: [] }] };
    expect(ImageManifestSchema.safeParse(noTarget).success).toBe(false);
    const hero = { ...manifest, slots: manifest.slots.map((s) => (s.id === base.id ? { ...s, placement: 'hero' as const } : s)) };
    expect(JSON.stringify(ImageManifestSchema.safeParse(hero).error?.issues)).toContain('cannot be a hero');
    const dup = { ...manifest, slots: [...manifest.slots, { ...base, id: 'x-dup' }] };
    expect(JSON.stringify(ImageManifestSchema.safeParse(dup).error?.issues)).toContain('already has slot');
  });
});

describe('generated image data', () => {
  it('validates (and is empty until images are approved and optimized)', () => {
    const parsed = GeneratedImagesSchema.parse(generatedJson);
    for (const id of Object.keys(parsed.images)) {
      expect(manifest.slots.find((s) => s.id === id)?.status, id).toBe('approved');
    }
  });
});
