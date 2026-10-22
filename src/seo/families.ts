/**
 * Exam-family hubs (/exams/<family>, docs/seo/keyword-map.md "Exams"): people search by
 * family first ("ssc signature resize"), so each hub sits above its member exam pages.
 * A family is a rule over presets; members are the published presets that match.
 * SBI has only two published exams, so it gets no hub of its own; the IBPS hub links them.
 */
import { getPublishedPresets, type ExamPreset } from '@/content/presets';

export type FamilySlug = 'ssc' | 'rrb' | 'ibps';

export interface ExamFamily {
  slug: FamilySlug;
  /** Short name used in links and breadcrumbs: "SSC", "RRB", "IBPS". */
  name: string;
  /** "All SSC exams" link text. */
  linkText: string;
  match: (p: Pick<ExamPreset, 'group' | 'body'>) => boolean;
  /** Primary keyword from the keyword map (used by tests). */
  keyword: string;
}

export const FAMILIES: readonly ExamFamily[] = [
  {
    slug: 'ssc',
    name: 'SSC',
    linkText: 'All SSC exams',
    match: (p) => p.group === 'ssc',
    keyword: 'ssc signature resize',
  },
  {
    slug: 'rrb',
    name: 'RRB',
    linkText: 'All RRB exams',
    match: (p) => p.group === 'railway' && p.body === 'RRB',
    keyword: 'rrb signature size',
  },
  {
    slug: 'ibps',
    name: 'IBPS',
    linkText: 'All IBPS exams',
    match: (p) => p.body === 'IBPS',
    keyword: 'ibps photo resizer',
  },
];

/** A hub is built only when the family has at least this many published exams. */
export const MIN_FAMILY_SIZE = 3;

export function familyMembers(f: ExamFamily): ExamPreset[] {
  return getPublishedPresets()
    .filter(f.match)
    .sort((a, b) => a.name.en.localeCompare(b.name.en));
}

/** Families that get a hub page. */
export function hubFamilies(): ExamFamily[] {
  return FAMILIES.filter((f) => familyMembers(f).length >= MIN_FAMILY_SIZE);
}

export function familyOf(p: Pick<ExamPreset, 'group' | 'body'>): ExamFamily | undefined {
  return hubFamilies().find((f) => f.match(p));
}

export function hubPath(f: Pick<ExamFamily, 'slug'>): string {
  return `/exams/${f.slug}`;
}
