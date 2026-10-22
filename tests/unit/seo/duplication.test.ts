/**
 * Near-duplicate document pages. Sister exams (same family, same group, or `related`)
 * often share every spec, so /exam/<a>/<doc> and /exam/<b>/<doc> used to be 66–91%
 * identical. Each page now carries per-exam content (src/seo/doc-insights.ts).
 *
 *  1. Unit tests of the pure helpers (always run).
 *  2. Built pages: word 3-shingle Jaccard of the <main> text of every sister pair must be
 *     <= MAX_JACCARD (runs when dist/ exists; CI builds after unit tests).
 */
import { existsSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';
import { docSlug, getKitDocuments, getPreset, getPublishedPresets } from '@/content/presets';
import {
  compareWithSisters,
  copyExcerpts,
  docFaqs,
  docMatcher,
  docTips,
  inlineMarkdown,
  jaccard,
  markdownBlocks,
  seasonText,
  shingles,
  sistersOf,
} from '@/seo/doc-insights';
import { familyMembers, familyOf } from '@/seo/families';

const ROOT = fileURLToPath(new URL('../../../', import.meta.url));
const DIST = join(ROOT, 'dist');
const MAX_JACCARD = 0.5;

const must = (slug: string) => {
  const p = getPreset(slug);
  if (!p) throw new Error(slug);
  return p;
};
const sisters = (slug: string) => {
  const p = must(slug);
  const f = familyOf(p);
  return sistersOf(p, getPublishedPresets(), f ? familyMembers(f) : []);
};
const doc = (slug: string, d: string) => must(slug).documents.find((x) => docSlug(x) === d)!;

describe('doc-insights helpers', () => {
  it('groups sisters with the same size and names the differences', () => {
    const c = compareWithSisters(must('ibps-po'), doc('ibps-po', 'signature'), sisters('ibps-po'));
    const same = c.find((x) => x.kind === 'same')!;
    expect(same.text).toMatch(
      /use the same signature size as IBPS PO \(140×60 px · 10–20 KB · JPG\)/,
    );
    expect(same.exams.length).toBeGreaterThan(1);
    const ssc = compareWithSisters(must('ssc-gd'), doc('ssc-gd', 'signature'), sisters('ssc-gd'));
    expect(ssc.some((x) => x.kind === 'differs' && /Unlike SSC CPO/.test(x.text))).toBe(true);
  });

  it('never states a toVerify size, in comparisons or summaries', () => {
    // Any published toVerify document with a KB limit whose sisters have the same document
    // (was the IBPS RRB 10th certificate until Phase 4 confirmed it from the notice).
    const pick = getPublishedPresets()
      .flatMap((p) =>
        p.documents
          .filter((d) => d.toVerify && d.maxKB !== null)
          .map((d) => ({ p, d, s: sisters(p.slug) })),
      )
      .find(({ p, d, s }) =>
        s.some((x) => x.slug !== p.slug && x.documents.some((o) => docSlug(o) === docSlug(d))),
      );
    expect(pick).toBeDefined();
    const { p, d, s } = pick!;
    const text = compareWithSisters(p, d, s)
      .map((x) => x.text)
      .join(' ');
    expect(text).not.toMatch(new RegExp(`\\b${d.maxKB}\\b`));
    expect(text).toMatch(/to verify|not (all )?confirmed/);
  });

  it('compares declaration wording (SBI adds the date of birth)', () => {
    const c = compareWithSisters(
      must('ibps-clerk'),
      doc('ibps-clerk', 'declaration'),
      sisters('ibps-clerk'),
    );
    expect(c.some((x) => x.kind === 'wording' && /SBI Clerk.*date of birth/.test(x.text))).toBe(
      true,
    );
  });

  it('keeps only FAQs a sister exam does not repeat', () => {
    const faqs = docFaqs(must('rrb-ntpc'), doc('rrb-ntpc', 'signature'), sisters('rrb-ntpc'));
    expect(faqs.some((f) => /last date/i.test(f.q))).toBe(true);
    expect(faqs.some((f) => /blue ink/i.test(f.q))).toBe(false);
  });

  it('the photo matcher ignores how other documents are photographed', () => {
    const re = docMatcher(doc('ibps-po', 'photo'));
    expect(re.test('Take the photo against a light wall.')).toBe(true);
    expect(re.test('Recent colour photographs only.')).toBe(true);
    expect(re.test('Scan or photograph your 10th certificate first.')).toBe(false);
    expect(re.test('Usually a dark or blurry phone photo of the paper.')).toBe(false);
  });

  it('filters rejection tips to the document', () => {
    const tips = docTips(must('ibps-po'), doc('ibps-po', 'declaration'));
    expect(tips.length).toBeGreaterThan(0);
    expect(tips.every((t) => /declaration/i.test(t.error + t.fix.en))).toBe(true);
  });

  it('reads Markdown blocks and picks excerpts about the document', () => {
    const md =
      'Intro about the exam and its long cycle text here today.\n\n### Signature\n\n- Sign in black ink on plain white paper, always in running handwriting, never capitals.\n- JPG.\n\n| a | b |\n';
    expect(markdownBlocks(md).map((b) => b.heading)).toEqual(['', 'Signature', 'Signature']);
    const ex = copyExcerpts(md, doc('ibps-po', 'signature'));
    expect(ex).toHaveLength(2);
    expect(ex[1]).toMatch(/black ink/);
    // A block a sister's copy repeats is dropped.
    expect(copyExcerpts(md, doc('ibps-po', 'signature'), 5, [md])).toHaveLength(1);
  });

  it('renders inline Markdown safely', () => {
    expect(inlineMarkdown('**a** <b> [x](/tools/y) [z](https://e.com)')).toBe(
      '<strong>a</strong> &lt;b&gt; <a href="/tools/y">x</a> z',
    );
  });

  it('season text', () => {
    expect(seasonText({ seasonMonths: [7, 8] })).toBe('July–August');
    expect(seasonText({ seasonMonths: [9] })).toBe('September');
    expect(seasonText({ seasonMonths: [1, 8] })).toBe('January or August');
    expect(seasonText({ seasonMonths: [] })).toBeNull();
  });

  it('jaccard', () => {
    expect(jaccard(shingles('a b c d'), shingles('a b c d'))).toBe(1);
    expect(jaccard(shingles('a b c d'), shingles('w x y z'))).toBe(0);
  });
});

// ---------------------------------------------------------------------------
// Built pages
// ---------------------------------------------------------------------------

function mainText(html: string): string {
  const m = html.match(/<main[\s\S]*?<\/main>/)?.[0] ?? html;
  return m
    .replace(/<script[\s\S]*?<\/script>/g, ' ')
    .replace(/<style[\s\S]*?<\/style>/g, ' ')
    .replace(/<[^>]+>/g, ' ')
    .replace(/&[#\w]+;/g, ' ');
}

/** Pairs of published exams that are sisters: same group, or one lists the other as related. */
function sisterPairs() {
  const pub = getPublishedPresets();
  const out: [string, string][] = [];
  for (const a of pub)
    for (const b of pub) {
      if (a.slug >= b.slug) continue;
      if (a.group === b.group || a.related.includes(b.slug) || b.related.includes(a.slug))
        out.push([a.slug, b.slug]);
    }
  return out;
}

describe.skipIf(!existsSync(join(DIST, 'exam')))('built document pages (dist/)', () => {
  it(`sister document pages overlap <= ${MAX_JACCARD} (3-shingle Jaccard of <main>)`, () => {
    const bad: string[] = [];
    let pairs = 0;
    for (const [a, b] of sisterPairs()) {
      for (const d of getKitDocuments(must(a))) {
        const s = docSlug(d);
        const fa = join(DIST, 'exam', a, `${s}.html`);
        const fb = join(DIST, 'exam', b, `${s}.html`);
        if (!existsSync(fa) || !existsSync(fb)) continue;
        pairs++;
        const j = jaccard(
          shingles(mainText(readFileSync(fa, 'utf8'))),
          shingles(mainText(readFileSync(fb, 'utf8'))),
        );
        if (j > MAX_JACCARD) bad.push(`${a}/${s} ~ ${b}/${s}: ${j.toFixed(3)}`);
      }
    }
    expect(pairs).toBeGreaterThan(200);
    expect(bad).toEqual([]);
  });
});
