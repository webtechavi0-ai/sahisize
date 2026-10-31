import 'server-only';
/**
 * Exam preset registry. Pages pass single presets (or slim derived data) to client
 * components as props; client code never imports this module.
 */
import type { ExamGroup } from '@/config/exams';
import { kitDocuments, pickPopular, toDocSpec, type ExamPreset, type PresetDocument, type Season } from '@/lib/presets';
import { content, showUnpublished } from './registry';
import { once } from './core/read';

export type { ExamPreset, PresetDocument, Season } from '@/lib/presets';

/** Every preset, published or not, sorted by slug. */
export function listPresets(): ExamPreset[] {
  return content().presets;
}

/** Presets that get pages, search entries and sitemap entries, sorted by slug. */
export function publishedPresets(): ExamPreset[] {
  return showUnpublished() ? content().presets : content().presets.filter((p) => p.published);
}

/** Lookup among ALL presets (check `.published` yourself, or use getPublishedPreset). */
export function getPreset(slug: string): ExamPreset | undefined {
  return content().presets.find((p) => p.slug === slug);
}

export function getPublishedPreset(slug: string): ExamPreset | undefined {
  return publishedPresets().find((p) => p.slug === slug);
}

/** Like getPublishedPreset but throws (use after generateStaticParams guarantees the slug). */
export function requirePreset(slug: string): ExamPreset {
  const p = getPublishedPreset(slug);
  if (!p) throw new Error(`Unknown or unpublished exam preset: ${slug}`);
  return p;
}

export function getSeason(): Season {
  return content().season;
}

/** Published presets in popular order: season.json order first, then the rest by English name. */
export const seasonOrder = once((): ExamPreset[] => {
  const bySlug = new Map(publishedPresets().map((p) => [p.slug, p]));
  const ordered: ExamPreset[] = [];
  for (const s of getSeason().order) {
    const p = bySlug.get(s);
    if (p) {
      ordered.push(p);
      bySlug.delete(s);
    }
  }
  return [...ordered, ...[...bySlug.values()].sort((a, b) => a.name.en.localeCompare(b.name.en))];
});

/** Popular grid: verified, current-cycle presets in season order. */
export function popularPresets(limit = 12, year = new Date().getUTCFullYear()): ExamPreset[] {
  return pickPopular(seasonOrder(), { year, limit });
}

/** generateStaticParams helper for /exam/[slug] and /kit/[slug]. */
export function examSlugs(): string[] {
  return publishedPresets().map((p) => p.slug);
}

/** [{slug, doc}] for /exam/[slug]/[doc]: published presets × kit documents. */
export function examDocParams(): { slug: string; doc: string }[] {
  return publishedPresets().flatMap((p) => kitDocuments(p).map((d) => ({ slug: p.slug, doc: d.slug ?? d.doc })));
}

export interface SourceEntry {
  slug: string;
  name: ExamPreset['name'];
  body: string;
  cycle: string;
  notification: string;
  sourceUrl: string;
  sourcePage: number | null;
  extraSources: { label: string; url: string }[];
  lastChecked: string;
  confidence: ExamPreset['confidence'];
}

/** Rows for /sources, published presets only, by body then name. */
export function getSources(): SourceEntry[] {
  return publishedPresets()
    .map((p) => ({
      slug: p.slug,
      name: p.name,
      body: p.body,
      cycle: p.cycle,
      notification: p.notification,
      sourceUrl: p.sourceUrl,
      sourcePage: p.sourcePage,
      extraSources: p.extraSources ?? [],
      lastChecked: p.lastChecked,
      confidence: p.confidence,
    }))
    .sort((a, b) => a.body.localeCompare(b.body) || a.name.en.localeCompare(b.name.en));
}

/** Slim exam search entry. Hidden exams are included with published:false for "coming soon" hints. */
export interface ExamSearchEntry {
  slug: string;
  en: string;
  hi: string;
  aliases: string[];
  body: string;
  group: ExamGroup;
  published: boolean;
  /** Document types in preset order. */
  docs: string[];
  /** Document slugs with their own /exam/{slug}/{doc} page. */
  pages: string[];
}

export function examSearchIndex(): ExamSearchEntry[] {
  const pub = new Set(publishedPresets().map((p) => p.slug));
  return listPresets().map((p) => ({
    slug: p.slug,
    en: p.name.en,
    hi: p.name.hi,
    aliases: p.aliases,
    body: p.body,
    group: p.group,
    published: pub.has(p.slug),
    docs: [...new Set(p.documents.map((d) => d.doc))],
    pages: pub.has(p.slug) ? kitDocuments(p).map((d) => d.slug ?? d.doc) : [],
  }));
}

// ---------------------------------------------------------------------------
// Preset lookups used by tool pages
// ---------------------------------------------------------------------------

export interface ExamDocRef {
  slug: string;
  /** Exam name in the page language. */
  exam: string;
  /** Document label in the page language. */
  doc: string;
  /** "20–50 KB" or "≤ 50 KB". */
  range: string;
}

function kbRange(min: number | null, max: number): string {
  return min ? `${min}–${max} KB` : `≤ ${max} KB`;
}

/** Image documents (not PDFs) whose max KB equals `n`, in season order. toVerify sizes are skipped. */
export function examsWithMaxKB(n: number, lang: 'en' | 'hi' = 'en'): ExamDocRef[] {
  const out: ExamDocRef[] = [];
  for (const p of seasonOrder()) {
    for (const d of kitDocuments(p)) {
      if (d.format === 'pdf' || d.maxKB !== n || d.toVerify) continue;
      out.push({ slug: p.slug, exam: p.name[lang], doc: d.label[lang], range: kbRange(d.minKB, d.maxKB) });
    }
  }
  return out;
}

/** Image documents whose rule is exactly `min`–`max` KB, in season order. */
export function examsWithRange(min: number, max: number, lang: 'en' | 'hi' = 'en'): ExamDocRef[] {
  return examsWithMaxKB(max, lang).filter((r) => r.range === kbRange(min, max));
}

export interface ExamSizeOption {
  id: string;
  /** "200×230 px, 20–50 KB". */
  label: string;
  /** "IBPS PO, SBI PO, SBI Clerk +3". */
  exams: string;
  spec: ReturnType<typeof toDocSpec>;
}

function rangeDims(spec: ReturnType<typeof toDocSpec>, lang: 'en' | 'hi'): string {
  if (spec.maxWidthPx === undefined && spec.maxHeightPx === undefined) {
    const box = `${spec.minWidthPx ?? 0}×${spec.minHeightPx ?? 0} px`;
    return lang === 'hi' ? `कम से कम ${box}` : `at least ${box}`;
  }
  return `${spec.minWidthPx ?? 0}–${spec.maxWidthPx ?? '…'} px`;
}

/** Distinct size rules for a document type with the exams that use them (most used first). */
export function sizeOptions(doc: PresetDocument['doc'], lang: 'en' | 'hi' = 'en', limit = 6): ExamSizeOption[] {
  const groups = new Map<string, { opt: ExamSizeOption; names: string[] }>();
  for (const p of seasonOrder()) {
    for (const d of kitDocuments(p)) {
      if (d.doc !== doc || d.format === 'pdf' || d.toVerify) continue;
      const spec = toDocSpec(d);
      const dims =
        spec.widthPx !== null ? `${spec.widthPx}×${spec.heightPx} px` : spec.minWidthPx !== undefined ? rangeDims(spec, lang) : '';
      const key = [dims, spec.minKB, spec.maxKB, spec.dpi, spec.aspect ?? ''].join('|');
      const g = groups.get(key);
      if (g) {
        if (!g.names.includes(p.name[lang])) g.names.push(p.name[lang]);
        continue;
      }
      groups.set(key, {
        opt: {
          id: key.replace(/[^\w]+/g, '-'),
          label: [dims, kbRange(spec.minKB, spec.maxKB!)].filter(Boolean).join(', '),
          exams: '',
          spec: { ...spec, label: { en: d.label.en, hi: d.label.hi }, rules: [] },
        },
        names: [p.name[lang]],
      });
    }
  }
  return [...groups.values()]
    .sort((a, b) => b.names.length - a.names.length)
    .slice(0, limit)
    .map(({ opt, names }) => ({
      ...opt,
      exams: names.length > 3 ? `${names.slice(0, 3).join(', ')} +${names.length - 3}` : names.join(', '),
    }));
}

export interface DeclarationExam {
  slug: string;
  name: string;
  text: string;
  toVerify: boolean;
  spec: ReturnType<typeof toDocSpec> | null;
}

/** Exams with a prescribed declaration text (declaration tool's exam picker). */
export function declarationExams(lang: 'en' | 'hi' = 'en'): DeclarationExam[] {
  return seasonOrder()
    .filter((p) => p.declarationText)
    .map((p) => {
      const decl = kitDocuments(p).find((d) => d.doc === 'declaration');
      return {
        slug: p.slug,
        name: p.name[lang],
        text: p.declarationText!.en,
        toVerify: !!p.declarationText!.toVerify,
        spec: decl ? { ...toDocSpec(decl), rules: [] } : null,
      };
    });
}

export interface NameDateExam {
  slug: string;
  name: string;
  option: ExamSizeOption;
}

/** Published presets whose photo needs the name-and-date strip (toVerify skipped). */
export function nameDateExams(lang: 'en' | 'hi' = 'en'): NameDateExam[] {
  const out: NameDateExam[] = [];
  for (const p of seasonOrder()) {
    for (const d of kitDocuments(p)) {
      if (!d.needsNameDateStrip || d.toVerify || d.format === 'pdf' || d.maxKB === null) continue;
      const spec = toDocSpec(d);
      const dims = spec.widthPx !== null ? `${spec.widthPx}×${spec.heightPx} px, ` : '';
      out.push({
        slug: p.slug,
        name: p.name[lang],
        option: {
          id: `${p.slug}-${d.slug ?? d.doc}`,
          label: `${p.name[lang]}: ${dims}${kbRange(spec.minKB, spec.maxKB!)}`,
          exams: d.label[lang],
          spec: { ...spec, rules: [] },
        },
      });
    }
  }
  return out;
}
