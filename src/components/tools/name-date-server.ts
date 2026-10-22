/**
 * SERVER-ONLY: size rules for the name-and-date tool, from PUBLISHED presets whose photo
 * needs the name/date strip (K11). toVerify documents are skipped (not facts yet).
 * Never import from island code: it bundles every preset.
 */
import { getKitDocuments, getSeasonOrder, toDocSpec } from '@/content/presets';
import type { Lang } from '@/config/site';
import { hasHindiExam } from '@/seo/hreflang';
import type { SizeOption } from './logic';

export interface NameDateExam {
  slug: string;
  name: string;
  href: string;
  option: SizeOption;
}

export function nameDateExams(lang: Lang = 'en'): NameDateExam[] {
  const out: NameDateExam[] = [];
  for (const p of getSeasonOrder()) {
    for (const d of getKitDocuments(p)) {
      if (!d.needsNameDateStrip || d.toVerify || d.format === 'pdf' || d.maxKB === null) continue;
      const spec = toDocSpec(d);
      const dims = spec.widthPx !== null ? `${spec.widthPx}×${spec.heightPx} px, ` : '';
      const range = spec.minKB ? `${spec.minKB}–${spec.maxKB} KB` : `≤ ${spec.maxKB} KB`;
      out.push({
        slug: p.slug,
        name: p.name[lang],
        href: lang === 'hi' && hasHindiExam(p.slug) ? `/hi/exam/${p.slug}` : `/exam/${p.slug}`,
        option: {
          id: `${p.slug}-${d.slug ?? d.doc}`,
          label: `${p.name[lang]}: ${dims}${range}`,
          exams: d.label[lang],
          spec: { ...spec, rules: [] },
        },
      });
    }
  }
  return out;
}
