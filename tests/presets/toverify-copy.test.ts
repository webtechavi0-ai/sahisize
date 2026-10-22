/**
 * Review 3 #4: copy must not state, as fact, a KB number that only comes from a toVerify
 * document. Scans guides, tool copy, exam copy, UI strings and preset FAQ/tips.
 *
 * A text unit (paragraph, table row, string) is flagged when it
 *  - names an exam (or belongs to that exam's page), and
 *  - names a toVerify document of that exam (doc words, or the specific label words such as
 *    "photo ID" or "10th"), and
 *  - states one of that document's KB numbers, and
 *  - no verified document of the same exam, named in the same unit, has that number, and
 *  - it does not hedge ("check the notice", "not confirmed", "पक्का नहीं" …).
 * Also flagged anywhere: a KB range that exists only in toVerify documents (e.g. "10–30 KB").
 */
import { existsSync, readdirSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';

const ROOT = fileURLToPath(new URL('../../', import.meta.url));
const PRESETS = join(ROOT, 'src/content/presets');

interface Doc {
  doc: string;
  slug?: string;
  label: { en: string; hi?: string };
  minKB: number | null;
  maxKB: number | null;
  toVerify?: boolean;
  format?: string;
  rules?: { en: string; hi?: string }[];
  sizeNote?: { en: string; hi?: string };
}
interface Preset {
  slug: string;
  name: { en: string; hi: string };
  aliases: string[];
  documents: Doc[];
  faq?: { q: { en: string; hi?: string }; a: { en: string; hi?: string } }[];
  rejectionTips?: { error: string; fix: { en: string; hi?: string } }[];
}

const presets: Preset[] = readdirSync(PRESETS)
  .filter((f) => f.endsWith('.json') && f !== 'season.json')
  .map((f) => JSON.parse(readFileSync(join(PRESETS, f), 'utf8')));

// ---------------------------------------------------------------------------
// Matching
// ---------------------------------------------------------------------------

const TYPE_WORDS: Record<string, RegExp> = {
  photo: /photo|फोटो|तस्वीर/giu,
  signature: /sign|हस्ताक्षर|साइन|सिग्नेचर/giu,
  thumb: /thumb|अंगूठ/giu,
  certificate: /certificate|\bpdfs?\b|सर्टिफिकेट|प्रमाण/giu,
  declaration: /declaration|घोषणा|डिक्लेरेशन|handwriting|लिखावट/giu,
  other: /(?!)/gu,
};

/** Label words that single out one document of an exam: [label test, words in copy]. */
const SPECIFIC: [RegExp, RegExp][] = [
  [/photo id/i, /photo[ -]?id|id card|id proof|identity|पहचान/giu],
  [/aadhaar/i, /aadhaar|आधार/giu],
  [/address/i, /address|पते का|पता/giu],
  [/parent|guardian/i, /parent|guardian|अभिभावक|माता|पिता/giu],
  [/signed application/i, /signed (application )?form/giu],
  [/class 10/i, /10th|class 10|sslc|10वीं|certificate|सर्टिफिकेट/giu],
];

function specific(d: Doc): RegExp | null {
  return SPECIFIC.find(([l]) => l.test(d.label.en))?.[1] ?? null;
}
/** Words that name a document: its specific label words (plus PDF words for a PDF upload), else its type words. */
function words(d: Doc): RegExp {
  const own = specific(d);
  if (!own) return TYPE_WORDS[d.doc] ?? TYPE_WORDS.other!;
  return d.format === 'pdf'
    ? new RegExp(`${own.source}|${TYPE_WORDS.certificate!.source}`, 'giu')
    : own;
}
const test = (re: RegExp, s: string) => {
  re.lastIndex = 0;
  return re.test(s);
};

/** Wording that marks a number as unconfirmed or second-hand (Q15 "check the notice"). */
const HEDGE =
  /verify|not (yet )?confirmed|unconfirmed|not in the (notice|bulletin)|check the (notice|form|official|portal|size|field)|confirm (it|this|the size)|disputed|(some )?guides (say|list|mention|describe)|secondary sources|resizer sites|sources disagree|check the \w+ notice|guides for the|पक्का नहीं|पुष्टि नहीं|नोटिस (में )?(देख|जाँच|मिला)|नोटिस में नहीं|फॉर्म में (देख|जाँच)|मिला लें|पक्का हो|सोर्स अलग|रीसाइज़र साइट|नोटिस नहीं देखा|गाइड .{0,60}बताते/iu;

function kbNumbers(s: string): Set<number> {
  const out = new Set<number>();
  const range = /(\d+(?:\.\d+)?)\s*(?:–|-|to|से|and|और)\s*(\d+(?:\.\d+)?)\s*KB/giu;
  for (const m of s.matchAll(range)) {
    out.add(Number(m[1]));
    out.add(Number(m[2]));
  }
  for (const m of s.matchAll(/(\d+(?:\.\d+)?)\s*KB/giu)) out.add(Number(m[1]));
  return out;
}

function kbRanges(s: string): Set<string> {
  const out = new Set<string>();
  for (const m of s.matchAll(/(\d+)\s*(?:–|-|to|से)\s*(\d+)\s*KB/giu)) out.add(`${m[1]}-${m[2]}`);
  return out;
}

const esc = (s: string) => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

/** Ways copy names an exam: full name, name without "(…)", first two words, aliases. */
function examPattern(p: Preset): RegExp {
  const base = p.name.en.replace(/\s*\(.*?\)\s*/g, ' ').trim();
  const two = base.split(/\s+/).slice(0, 2).join(' ');
  const names = new Set(
    [p.name.en, p.name.hi, base, two, ...p.aliases]
      .map((n) => n.trim().toLowerCase())
      .filter((n) => n.length >= 4 && !/^\d/.test(n)),
  );
  return new RegExp(
    `(^|[^\\p{L}\\p{N}])(${[...names].map(esc).join('|')})(?=$|[^\\p{L}\\p{N}])`,
    'iu',
  );
}

interface Unit {
  where: string;
  text: string;
  /** Exam whose page this text is on (exam copy, preset FAQ), if any. */
  exam?: string;
  /** Surrounding paragraph: an exam named there counts for this sentence. */
  context?: string;
}

/** Judge sentence by sentence (a "photo" elsewhere in the paragraph must not excuse a claim). */
function sentences(u: Unit): Unit[] {
  const parts = u.text.split(/(?<=[.।?!])\s+(?=\S)/u);
  return parts.length < 2
    ? [u]
    : parts.map((text, i) => ({ ...u, where: `${u.where}.${i}`, text, context: u.text }));
}

const ANY_EXAM = presets.map(examPattern);
const tvPresets = presets
  .filter((p) => p.documents.some((d) => d.toVerify && (d.minKB !== null || d.maxKB !== null)))
  .map((p) => ({ p, re: examPattern(p) }));

export function claims(u: Unit): string[] {
  if (u.context === undefined && sentences(u).length > 1) return sentences(u).flatMap(claims);
  if (HEDGE.test(u.context ?? u.text)) return [];
  const nums = kbNumbers(u.text);
  if (!nums.size) return [];
  // The paragraph's exams count only when the sentence names none of its own.
  const examText =
    u.context !== undefined && !ANY_EXAM.some((r) => r.test(u.text)) ? u.context : u.text;
  const out: string[] = [];
  for (const { p, re } of tvPresets) {
    if (u.exam !== p.slug && !re.test(examText)) continue;
    for (const d of p.documents.filter((x) => x.toVerify)) {
      if (!test(words(d), u.text)) continue;
      // Verified documents are judged on the text without the words that name this one.
      const own = specific(d);
      const rest = own ? u.text.replace(own, ' ') : u.text;
      for (const n of [d.minKB, d.maxKB]) {
        if (n === null || !nums.has(n)) continue;
        const excused = p.documents.some(
          (v) => !v.toVerify && (v.minKB === n || v.maxKB === n) && test(words(v), rest),
        );
        if (!excused)
          out.push(
            `${u.where}: ${p.slug} ${d.label.en} ${n} KB (toVerify) in "${u.text.slice(0, 160)}"`,
          );
      }
    }
  }
  return out;
}

// toVerify-only ranges ("10–30 KB"): no verified document anywhere has them.
const rangeKey = (d: Doc) =>
  d.minKB !== null && d.maxKB !== null ? `${d.minKB}-${d.maxKB}` : null;
const verifiedRanges = new Set(
  presets.flatMap((p) => p.documents.filter((d) => !d.toVerify).map(rangeKey)),
);
const tvOnlyRanges = new Set(
  presets
    .flatMap((p) => p.documents.filter((d) => d.toVerify).map(rangeKey))
    .filter((k): k is string => !!k && !verifiedRanges.has(k)),
);
/** Generic copy that happens to use a toVerify-only range (not an exam claim). */
const RANGE_ALLOW: RegExp[] = [/^What if my form says \d+–\d+ KB\?$/];

export function rangeClaims(u: Unit): string[] {
  if (HEDGE.test(u.text) || RANGE_ALLOW.some((r) => r.test(u.text))) return [];
  return [...kbRanges(u.text)]
    .filter((k) => tvOnlyRanges.has(k))
    .map(
      (k) =>
        `${u.where}: range ${k} KB exists only in toVerify documents: "${u.text.slice(0, 160)}"`,
    );
}

// ---------------------------------------------------------------------------
// Copy sources
// ---------------------------------------------------------------------------

function mdUnits(dir: string, examFromFile: boolean): Unit[] {
  const out: Unit[] = [];
  for (const lang of ['en', 'hi']) {
    const d = join(ROOT, dir, lang);
    if (!existsSync(d)) continue;
    for (const f of readdirSync(d).filter((x) => /\.mdx?$/.test(x))) {
      const exam = examFromFile ? f.replace(/\.mdx?$/, '') : undefined;
      readFileSync(join(d, f), 'utf8')
        .split(/\n\s*\n|\n(?=\s*[|*-]|\s*\d+\.)/)
        .forEach(
          (text, i) => text.trim() && out.push({ where: `${dir}/${lang}/${f}#${i}`, text, exam }),
        );
    }
  }
  return out;
}

function tsUnits(dir: string): Unit[] {
  const out: Unit[] = [];
  const d = join(ROOT, dir);
  for (const f of readdirSync(d).filter((x) => x.endsWith('.ts'))) {
    const src = readFileSync(join(d, f), 'utf8');
    for (const m of src.matchAll(
      /'((?:[^'\\\n]|\\.)*)'|"((?:[^"\\\n]|\\.)*)"|`((?:[^`\\]|\\.)*)`/g,
    )) {
      const text = m[1] ?? m[2] ?? m[3] ?? '';
      if (text.length > 12) out.push({ where: `${dir}/${f}@${m.index}`, text });
    }
  }
  return out;
}

function jsonStrings(v: unknown, where: string, out: Unit[]): void {
  if (typeof v === 'string') out.push({ where, text: v });
  else if (Array.isArray(v)) v.forEach((x, i) => jsonStrings(x, `${where}[${i}]`, out));
  else if (v && typeof v === 'object')
    for (const [k, x] of Object.entries(v)) jsonStrings(x, `${where}.${k}`, out);
}

function i18nUnits(): Unit[] {
  const out: Unit[] = [];
  const files = [
    ...readdirSync(join(ROOT, 'src/i18n'))
      .filter((f) => f.endsWith('.json'))
      .map((f) => `src/i18n/${f}`),
    ...readdirSync(join(ROOT, 'src/i18n/ns')).map((f) => `src/i18n/ns/${f}`),
  ];
  for (const f of files) jsonStrings(JSON.parse(readFileSync(join(ROOT, f), 'utf8')), f, out);
  return out;
}

function presetUnits(): Unit[] {
  const out: Unit[] = [];
  for (const p of presets) {
    const add = (text: string | undefined, where: string) =>
      text && out.push({ where: `${p.slug}.${where}`, text, exam: p.slug });
    p.faq?.forEach((f, i) => {
      add(`${f.q.en} ${f.a.en}`, `faq[${i}].en`);
      add(`${f.q.hi ?? ''} ${f.a.hi ?? ''}`, `faq[${i}].hi`);
    });
    p.rejectionTips?.forEach((t, i) => {
      add(t.fix.en, `rejectionTips[${i}].en`);
      add(t.fix.hi, `rejectionTips[${i}].hi`);
    });
    // A verified document's notes must not borrow a toVerify document's numbers.
    p.documents.forEach((d, i) => {
      if (d.toVerify) return;
      add(d.sizeNote?.en, `documents[${i}].sizeNote.en`);
      add(d.sizeNote?.hi, `documents[${i}].sizeNote.hi`);
    });
  }
  return out;
}

const SOURCES: Record<string, () => Unit[]> = {
  guides: () => mdUnits('src/content/guides', false),
  'exam copy': () => mdUnits('src/content/exam-copy', true),
  'exam-family hub copy': () => mdUnits('src/content/hub-copy', false),
  'SEO copy (exam keyword copy, document-page sentences)': () => tsUnits('src/seo'),
  'tool copy': () => tsUnits('src/components/tools/copy'),
  'UI strings': i18nUnits,
  'preset FAQ and tips': presetUnits,
};

describe('copy does not state toVerify-only KB numbers as fact', () => {
  it('the matcher catches the review-3 examples and lets hedged or verified copy through', () => {
    expect(
      claims({ where: 't', text: 'SSC GD asks for a thumb impression of 10–30 KB.' }),
    ).toHaveLength(2);
    expect(claims({ where: 't', text: 'UPSC photo ID: 20–200 KB.' }).length).toBeGreaterThan(0);
    expect(claims({ where: 't', text: 'UPSC photo: 20–200 KB.' })).toEqual([]);
    expect(
      claims({ where: 't', text: 'UPSC forms take PDFs of 20–200 KB.' }).length,
    ).toBeGreaterThan(0);
    expect(
      claims({ where: 't', text: 'UPSC forms take 20–200 KB PDFs. Retake the photos if needed.' })
        .length,
    ).toBeGreaterThan(0);
    expect(
      claims({
        where: 't',
        text: 'UPSC wants a photo ID. For JEE Main the ID proof is a JPG of 10–200 KB.',
      }),
    ).toEqual([]);
    expect(
      claims({ where: 't', text: 'IBPS RRB wants the 10th certificate as a PDF up to 500 KB.' })
        .length,
    ).toBeGreaterThan(0);
    expect(
      claims({
        where: 't',
        text: 'IBPS RRB: 10th certificate up to 500 KB (copied from IBPS PO; check the notice).',
      }),
    ).toEqual([]);
    expect(claims({ where: 't', text: 'IBPS RRB photo 20–50 KB, signature 10–20 KB.' })).toEqual(
      [],
    );
    expect(
      rangeClaims({ where: 't', text: 'Many forms want 10–30 KB for the thumb.' }),
    ).toHaveLength(1);
  });

  for (const [name, load] of Object.entries(SOURCES)) {
    it(name, () => {
      const units = load();
      expect(units.length).toBeGreaterThan(0);
      expect(units.flatMap((u) => [...claims(u), ...rangeClaims(u)])).toEqual([]);
    });
  }
});
