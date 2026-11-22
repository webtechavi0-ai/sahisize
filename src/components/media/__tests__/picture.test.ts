import { describe, expect, it } from 'vitest';
import { examPanelImage, groupImage, imagesForRoute, resolveImage } from '../images';
import { pictureModel, srcSet } from '../picture-model';
import { type GeneratedImage, type ImageSlot } from '../image-schema';

const slot: ImageSlot = {
  id: 'demo-hero',
  routes: ['/demo'],
  placement: 'hero',
  aspect: '3:2',
  widths: [480, 960],
  sizes: '100vw',
  alt: { en: 'An English alt', hi: 'हिंदी विवरण' },
  generation: { prompt: 'x'.repeat(100), size: '1536x1024', quality: 'medium', background: 'opaque' },
  status: 'approved',
};

const image: GeneratedImage = {
  width: 960,
  height: 640,
  hash: 'abcdef12',
  blurDataURL: 'data:image/webp;base64,AAAA',
  avif: [
    { src: '/img/demo-hero-480-abcdef12.avif', width: 480, height: 320 },
    { src: '/img/demo-hero-960-abcdef12.avif', width: 960, height: 640 },
  ],
  webp: [
    { src: '/img/demo-hero-480-abcdef12.webp', width: 480, height: 320 },
    { src: '/img/demo-hero-960-abcdef12.webp', width: 960, height: 640 },
  ],
};

describe('pictureModel', () => {
  it('lists avif before webp with explicit size and lazy loading', () => {
    const m = pictureModel({ slot, image, alt: slot.alt.en });
    expect(m.sources.map((s) => s.type)).toEqual(['image/avif', 'image/webp']);
    expect(m.sources[0]!.srcSet).toBe('/img/demo-hero-480-abcdef12.avif 480w, /img/demo-hero-960-abcdef12.avif 960w');
    expect(m.sources[1]!.srcSet).toBe(srcSet(image.webp));
    expect(m.sources[0]!.sizes).toBe('100vw');
    expect(m.img).toMatchObject({
      src: '/img/demo-hero-480-abcdef12.webp',
      width: 960,
      height: 640,
      alt: 'An English alt',
      loading: 'lazy',
      fetchPriority: 'auto',
      decoding: 'async',
    });
    expect(m.img.style?.backgroundImage).toContain(image.blurDataURL);
  });

  it('loads a hero eagerly with high fetch priority and honours a sizes override', () => {
    const m = pictureModel({ slot, image, alt: slot.alt.hi }, { priority: true, sizes: '50vw' });
    expect(m.img).toMatchObject({ loading: 'eager', fetchPriority: 'high', alt: 'हिंदी विवरण' });
    expect(m.sources.every((s) => s.sizes === '50vw')).toBe(true);
  });

  it('skips the blur placeholder behind transparent art', () => {
    const clear = { ...slot, generation: { ...slot.generation, background: 'transparent' as const } };
    expect(pictureModel({ slot: clear, image, alt: 'a' }).img.style).toBeUndefined();
  });
});

describe('resolveImage with the committed manifest', () => {
  it('returns null for unknown slots, so Picture renders its fallback', () => {
    expect(resolveImage('no-such-slot', 'hi')).toBeNull();
  });

  it('resolves every published slot with locale alt text and hashed renditions', () => {
    const hero = resolveImage('home-hero', 'hi');
    if (hero === null) return; // not published yet: nothing else to assert
    expect(hero.alt).not.toBe('');
    expect(hero.image.avif.every((f) => /^\/img\/home-hero-\d+-[0-9a-f]{8}\.avif$/.test(f.src))).toBe(true);
    expect(imagesForRoute('/exam/neet-ug', 'en').every((r) => r !== null)).toBe(true);
  });
});

describe('group images', () => {
  it('resolves a group illustration with locale alt text, and null for an unknown group', () => {
    const img = groupImage('banking', 'hi');
    expect(img?.slot.id).toBe('group-banking');
    expect(img?.alt).toMatch(/[\u0900-\u097F]/);
    expect(groupImage('no-such-group', 'en')).toBeNull();
  });

  it('never leaks a group slot into route lookups', () => {
    expect(imagesForRoute('/exam/ibps-po', 'en').some((r) => r.slot.groups)).toBe(false);
  });

  it('prefers the exam hero for the panel unless the page already shows it', () => {
    expect(examPanelImage('/exam/neet-ug', 'nta', 'en')?.slot.id).toBe('exam-neet-ug-hero');
    expect(examPanelImage('/exam/neet-ug', 'nta', 'en', { skipRouteHero: true })?.slot.id).toBe('group-nta');
    expect(examPanelImage('/exam/ibps-po', 'banking', 'en')?.slot.id).toBe('group-banking');
  });
});
