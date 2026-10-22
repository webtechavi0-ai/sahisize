/**
 * Exam names for Hindi <title>s. Hindi users search exam names in Latin script
 * ("IBPS PO फोटो साइज"), so Hindi titles should use a short Latin name, while prose keeps
 * the Devanagari `name.hi`. This does not change any preset `name`.
 *
 * Default: `name.en` without its parenthetical ("SBI Clerk (Junior Associate)" ->
 * "SBI Clerk"). TITLE_NAME_OVERRIDES holds the few where the searched form differs.
 */
import type { ExamPreset } from '@/content/presets/schema';

export const TITLE_NAME_OVERRIDES: Readonly<Record<string, string>> = {
  'upsc-cse': 'UPSC CSE',
  'ssc-gd': 'SSC GD',
  'ssc-mts': 'SSC MTS',
  'bihar-police-constable': 'Bihar Police',
  nda: 'NDA',
  mppsc: 'MPPSC',
};

/** Short Latin-script exam name for titles, e.g. "IBPS PO", "SBI Clerk", "UPSC CSE". */
export function latinTitleName(p: Pick<ExamPreset, 'slug' | 'name'>): string {
  const override = TITLE_NAME_OVERRIDES[p.slug];
  if (override) return override;
  return p.name.en.replace(/\s*\([^)]*\)\s*/g, ' ').replace(/\s+/g, ' ').trim();
}
