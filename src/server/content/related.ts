import 'server-only';
/**
 * Related exams for an exam page (the "Related exams" cards and the side rail's chips):
 * the preset's `related` list (published only), topped up with same-group exams so every page
 * links to at least 3 others. Max 6.
 */
import type { ExamPreset } from '@/lib/presets';
import { publishedPresets } from './presets';

export function relatedExamsFor(p: ExamPreset, max = 6): ExamPreset[] {
  const published = publishedPresets();
  const bySlug = new Map(published.map((x) => [x.slug, x]));
  const related = p.related.map((s) => bySlug.get(s)).filter((x): x is ExamPreset => !!x && x.slug !== p.slug);
  if (related.length < 3) {
    for (const x of published) {
      if (related.length >= 4) break;
      if (x.slug !== p.slug && x.group === p.group && !related.includes(x)) related.push(x);
    }
  }
  return related.slice(0, max);
}
