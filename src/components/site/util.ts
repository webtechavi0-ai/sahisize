/** Small helpers shared by site components (build-time only). */
import type { ExamGroup } from '@/content/presets/schema';

/** "state-psc" -> "statePsc" (i18n keys are lowerCamel, KEYS.md rule 2). */
export function camel(s: string): string {
  return s.replace(/-([a-z0-9])/g, (_, c: string) => c.toUpperCase());
}

export const GROUP_ORDER: readonly ExamGroup[] = [
  'banking',
  'ssc',
  'railway',
  'nta',
  'upsc',
  'teaching',
  'police',
  'state-psc',
  'defence',
  'other',
];

export function groupKey(g: ExamGroup): string {
  return `site.groups.${camel(g)}`;
}

export function toolNameKey(slug: string): string {
  return `site.toolNames.${camel(slug)}`;
}
