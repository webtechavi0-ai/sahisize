import 'server-only';
/**
 * Exam-family hubs (/exams/{family}): a family is a rule over presets (families.json);
 * members are the published presets that match. A hub is built only when the family has at
 * least `minFamilySize` published exams.
 */
import { familyPath } from '@/config/routes';
import type { Lang } from '@/i18n/config';
import type { ExamPreset } from '@/lib/presets';
import { once } from './core/read';
import { publishedPresets } from './presets';
import { content } from './registry';
import type { HubCopy } from './schemas/pages';

export type { HubCopy } from './schemas/pages';

export interface ExamFamily {
  slug: string;
  /** Short name for links and breadcrumbs: "SSC". */
  name: string;
  /** "All SSC exams". */
  linkText: string;
  /** Primary keyword of the hub. */
  keyword: string;
  path: string;
}

type FamilyDef = ExamFamily & { match: { group?: string; body?: string } };

const defs = once((): FamilyDef[] =>
  content().families.families.map((f) => ({ ...f, path: familyPath(f.slug) })),
);

function matches(f: FamilyDef, p: Pick<ExamPreset, 'group' | 'body'>): boolean {
  return (f.match.group === undefined || f.match.group === p.group) && (f.match.body === undefined || f.match.body === p.body);
}

const strip = ({ match: _m, ...f }: FamilyDef): ExamFamily => f;

/** Published members of a family, by English name. */
export function familyMembers(slug: string): ExamPreset[] {
  const f = defs().find((x) => x.slug === slug);
  if (!f) return [];
  return publishedPresets()
    .filter((p) => matches(f, p))
    .sort((a, b) => a.name.en.localeCompare(b.name.en));
}

/** Families that get a hub page. */
export const hubFamilies = once((): ExamFamily[] =>
  defs()
    .filter((f) => familyMembers(f.slug).length >= content().families.minFamilySize)
    .map(strip),
);

export function getFamily(slug: string): ExamFamily | undefined {
  return hubFamilies().find((f) => f.slug === slug);
}

/** The hub family of a preset, if it has one. */
export function familyOf(p: Pick<ExamPreset, 'group' | 'body'>): ExamFamily | undefined {
  const hubs = new Set(hubFamilies().map((f) => f.slug));
  const f = defs().find((x) => hubs.has(x.slug) && matches(x, p));
  return f ? strip(f) : undefined;
}

/** Hub copy for a family (English only today); null when missing. */
export function getHubCopy(family: string, lang: Lang): HubCopy | null {
  return content().hubCopy[lang].get(family) ?? null;
}
