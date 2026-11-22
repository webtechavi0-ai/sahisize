/**
 * SEO rules for English tool page copy (src/content/tools/en/*.json), from
 * docs/seo/keyword-map.md §0 and §6:
 *  - title (with " | SahiSize" when it fits) <= 60 characters, description 140–160;
 *  - each page's primary keyword, as an exact phrase, in the title, the H1 (the intro for
 *    JPG-to-PDF pages), the first 100 words of the intro and the description;
 *  - no FAQ question repeated on two tool pages, and owned queries kept off other pages;
 *  - every static link in the copy points at a route in docs/routes.txt.
 * Reads the JSON directly (no app imports), so it runs without the Next.js alias setup.
 */
import { readFileSync, readdirSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';

interface Faq {
  q: string;
  a: string;
}
interface Section {
  h2?: string;
  paras?: string[];
  links?: { href: string; label: string }[];
}
interface Copy {
  title: string;
  description: string;
  h1: string;
  intro: string;
  faq: Faq[];
  sections: Section[];
}

const ROOT = process.cwd();
const DIR = join(ROOT, 'src/content/tools/en');
const COPY: Record<string, Copy> = Object.fromEntries(
  readdirSync(DIR)
    .filter((f) => f.endsWith('.json'))
    .map((f) => [f.slice(0, -5), JSON.parse(readFileSync(join(DIR, f), 'utf8')) as Copy]),
);
const ROUTES = new Set(
  readFileSync(join(ROOT, 'docs/routes.txt'), 'utf8')
    .split('\n')
    .map((l) => l.trim())
    .filter((l) => l.startsWith('/')),
);

const len = (s: string) => [...s].length;
const BRAND = ' | SahiSize';
const core = (title: string) => title.replace(/\s*\|\s*SahiSize$/, '');

/** Case, "&"/"and", "×"/"x", "50 KB"/"50kb" and "to <number>" are treated as equal. */
function norm(s: string): string {
  return ` ${s} `
    .toLowerCase()
    .replace(/&/g, ' and ')
    .replace(/×/g, ' x ')
    .replace(/[“”"’'(),:;.!?·—–-]/g, (c) => (c === '.' ? '.' : ' '))
    .replace(/(\d)\s*kb\b/g, '$1kb')
    .replace(/\bto (?=\d)/g, '')
    .replace(/\.(?!\d)/g, ' ')
    .replace(/\s+/g, ' ');
}
const has = (text: string, phrase: string) => norm(text).includes(norm(phrase));
const first100 = (s: string) => s.split(/\s+/).slice(0, 100).join(' ');

/** Primary keyword per page (keyword-map.md §6). Pages with an unknown primary are left out. */
const PRIMARY: Record<string, string> = {
  ...Object.fromEntries(
    [5, 10, 15, 20, 25, 30, 35, 40, 45, 50, 60, 70, 80, 90, 100, 150, 200, 250, 300, 350, 400, 500].map((n) => [
      `compress-image-to-${n}kb`,
      `${n} kb photo size`,
    ]),
  ),
  // Semrush India, Nov 2026: "100 kb photo size jpg" (8,100/mo) shares the 100 KB page.
  'compress-image-to-100kb': '100 kb photo size jpg',
  'compress-image': 'photo size reducer in kb',
  'photo-size-converter-in-kb': 'photo size converter in kb',
  'compress-image-10kb-to-20kb': '10 kb to 20 kb photo size',
  'compress-image-20kb-to-50kb': 'photo convert into 20 kb to 50 kb jpg',
  'compress-image-50kb-to-100kb': 'photo compress 50 to 100 kb',
  'mb-to-kb-photo': 'photo mb to kb',
  'increase-image-size-in-kb': 'increase photo size in kb',
  'signature-resize': 'signature resize',
  'thumb-impression': 'thumb impression',
  'name-date-on-photo': 'name and date on photo',
  'photo-3-5x4-5-cm': '3.5 cm x 4.5 cm',
  'passport-size-photo': 'passport size photo maker',
  'postcard-size-photo': 'postcard size photo',
  'stamp-size-photo': 'stamp size photo',
  'resize-image-in-cm': 'resize image in cm',
  'resize-image-in-mm': 'resize image in mm',
  'compress-pdf': 'pdf resize in kb',
  'compress-pdf-to-50kb': 'pdf compressor 50 kb',
  'compress-pdf-to-100kb': 'compress pdf to 100kb',
  'compress-pdf-to-150kb': '150 kb pdf',
  'compress-pdf-to-200kb': '200 kb pdf',
  'compress-pdf-to-250kb': '250 kb pdf',
  'compress-pdf-to-300kb': 'compress pdf 300 kb',
  'compress-pdf-to-400kb': 'pdf compressor 400 kb',
  'compress-pdf-to-500kb': '500 kb pdf',
  ...Object.fromEntries([50, 100, 150, 200, 300, 400, 500].map((n) => [`jpg-to-pdf-under-${n}kb`, `jpg to pdf ${n} kb`])),
};

/** Queries owned by another page (map §1): they must not lead this page's title, H1, description or FAQ. */
const NOT_ON: Record<string, string[]> = {
  'jpg-to-pdf-under-200kb': ['200 kb pdf'],
  'passport-size-photo': ['3.5 cm x 4.5 cm', '3.5×4.5 cm', 'passport size photo in cm'],
  'postcard-size-photo': ['postcard size photo for neet', 'neet post card size photo'],
  'name-date-on-photo': ['jee main photo with name and date'],
  'compress-image-10kb-to-20kb': ['signature resize 10 to 20 kb', '10kb to 20kb signature size'],
  // The three any-KB pages split "reduce", "convert" and "increase" (keyword-map, Nov 2026).
  'compress-image': ['photo size converter in kb', 'increase photo size in kb'],
  'photo-size-converter-in-kb': ['photo size reducer in kb', 'increase photo size in kb', 'photo resizer in kb'],
  'increase-image-size-in-kb': ['photo size converter in kb', 'photo size reducer in kb'],
};

describe('tool copy (en): lengths', () => {
  it.each(Object.keys(COPY))('%s: title <= 60, description 140–160', (slug) => {
    const c = COPY[slug]!;
    const t = core(c.title);
    const branded = len(t + BRAND) <= 60 ? t + BRAND : t;
    expect(len(branded)).toBeLessThanOrEqual(60);
    expect(len(c.description)).toBeGreaterThanOrEqual(140);
    expect(len(c.description)).toBeLessThanOrEqual(160);
  });
});

describe('tool copy (en): primary keyword placement', () => {
  it.each(Object.keys(PRIMARY))('%s', (slug) => {
    const c = COPY[slug];
    expect(c, `missing copy for ${slug}`).toBeDefined();
    const kw = PRIMARY[slug]!;
    const where = {
      title: has(c!.title, kw),
      h1: slug.startsWith('jpg-to-pdf-under-') ? has(c!.intro, kw) : has(c!.h1, kw),
      first100: has(first100(`${c!.h1} ${c!.intro}`), kw),
      description: has(c!.description, kw),
    };
    expect(where).toEqual({ title: true, h1: true, first100: true, description: true });
  });
});

describe('tool copy (en): no cannibalisation', () => {
  /** "Is my photo uploaded?"-style questions explain the tool, they target no query. */
  const HOW_IT_WORKS = /\b(uploaded|server|internet|already small)\b/i;

  it('no FAQ question appears on two tool pages', () => {
    const seen = new Map<string, string>();
    const dupes: string[] = [];
    for (const [slug, c] of Object.entries(COPY)) {
      for (const f of c.faq) {
        if (HOW_IT_WORKS.test(f.q)) continue;
        const k = norm(f.q).trim();
        const prev = seen.get(k);
        if (prev && prev !== slug) dupes.push(`${f.q} (${prev}, ${slug})`);
        seen.set(k, slug);
      }
    }
    expect(dupes).toEqual([]);
  });

  it.each(Object.keys(NOT_ON))('%s keeps other pages’ queries out of its title, H1, description and FAQ', (slug) => {
    const c = COPY[slug]!;
    const fields = [c.title, c.h1, c.description, ...c.faq.map((f) => f.q)];
    for (const kw of NOT_ON[slug]!) {
      expect(fields.filter((f) => has(f, kw)), kw).toEqual([]);
    }
  });
});

describe('tool copy (en): links', () => {
  it('every static site link points at a known route', () => {
    const bad: string[] = [];
    for (const [slug, c] of Object.entries(COPY)) {
      for (const s of c.sections) {
        for (const l of s.links ?? []) {
          if (!l.href.startsWith('/')) continue;
          const path = l.href.split(/[?#]/)[0]!;
          if (!ROUTES.has(path)) bad.push(`${slug}: ${l.href}`);
        }
      }
    }
    expect(bad).toEqual([]);
  });
});
