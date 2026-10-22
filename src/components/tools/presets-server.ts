/**
 * SERVER-ONLY preset lookups for tool pages (published presets only). Never import from
 * island code: it bundles every preset.
 */
import { getKitDocuments, getSeasonOrder, toDocSpec } from '@/content/presets';
import type { DocType } from '@/engine/types';
import type { Lang } from '@/config/site';
import { hasHindiExam } from '@/seo/hreflang';
import type { SizeOption } from './logic';

export interface ExamDocRef {
  slug: string;
  exam: string;
  doc: string;
  range: string;
  href: string;
}

function range(min: number | null, max: number): string {
  return min ? `${min}–${max} KB` : `≤ ${max} KB`;
}

function examHref(slug: string, lang: Lang): string {
  return lang === 'hi' && hasHindiExam(slug) ? `/hi/exam/${slug}` : `/exam/${slug}`;
}

/** Image documents (not PDFs) whose max KB equals `n`, in season order. toVerify sizes are not facts: skipped. */
export function examsWithMaxKB(n: number, lang: Lang = 'en'): ExamDocRef[] {
  const out: ExamDocRef[] = [];
  for (const p of getSeasonOrder()) {
    for (const d of getKitDocuments(p)) {
      if (d.format === 'pdf' || d.maxKB !== n || d.toVerify) continue;
      out.push({
        slug: p.slug,
        exam: p.name[lang],
        doc: d.label[lang],
        range: range(d.minKB, d.maxKB),
        href: examHref(p.slug, lang),
      });
    }
  }
  return out;
}

/** Image documents whose rule is exactly `min`–`max` KB, in season order. toVerify sizes are skipped. */
export function examsWithRange(min: number, max: number, lang: Lang = 'en'): ExamDocRef[] {
  return examsWithMaxKB(max, lang).filter((r) => r.range === range(min, max));
}

/** "140–200 px", or "at least 140×60 px" for a minimum-only rule. */
function rangeDims(spec: ReturnType<typeof toDocSpec>, lang: Lang): string {
  if (spec.maxWidthPx === undefined && spec.maxHeightPx === undefined) {
    const box = `${spec.minWidthPx ?? 0}×${spec.minHeightPx ?? 0} px`;
    return lang === 'hi' ? `कम से कम ${box}` : `at least ${box}`;
  }
  return `${spec.minWidthPx ?? 0}–${spec.maxWidthPx ?? '…'} px`;
}

/** Distinct size rules for a document type with the exams that use them (most used first). toVerify sizes are skipped. */
export function sizeOptions(doc: DocType, lang: Lang = 'en', limit = 6): SizeOption[] {
  const groups = new Map<string, { opt: SizeOption; names: string[] }>();
  for (const p of getSeasonOrder()) {
    for (const d of getKitDocuments(p)) {
      if (d.doc !== doc || d.format === 'pdf' || d.toVerify) continue;
      const spec = toDocSpec(d);
      const dims =
        spec.widthPx !== null
          ? `${spec.widthPx}×${spec.heightPx} px`
          : spec.minWidthPx !== undefined
            ? rangeDims(spec, lang)
            : '';
      const key = [dims, spec.minKB, spec.maxKB, spec.dpi, spec.aspect ?? ''].join('|');
      const g = groups.get(key);
      if (g) {
        if (!g.names.includes(p.name[lang])) g.names.push(p.name[lang]);
        continue;
      }
      const label = [dims, range(spec.minKB, spec.maxKB!)].filter(Boolean).join(', ');
      groups.set(key, {
        opt: {
          id: key.replace(/[^\w]+/g, '-'),
          label,
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

/** Exams with a declaration text, for the declaration tool's exam picker. */
export function declarationExams(lang: Lang = 'en') {
  return getSeasonOrder()
    .filter((p) => p.declarationText)
    .map((p) => {
      const decl = getKitDocuments(p).find((d) => d.doc === 'declaration');
      return {
        slug: p.slug,
        name: p.name[lang],
        text: p.declarationText!.en,
        toVerify: !!p.declarationText!.toVerify,
        spec: decl ? { ...toDocSpec(decl), rules: [] } : null,
      };
    });
}
