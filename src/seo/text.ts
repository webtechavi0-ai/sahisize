/**
 * Title and description length rules. Pure.
 * Titles are at most TITLE_MAX characters (search engines truncate beyond ~60); when too
 * long, `fitTitle` drops the brand first, then tries shorter variants.
 * Descriptions are DESC_MIN–DESC_MAX characters.
 */
import { SITE_NAME } from '@/config/site';

export const TITLE_MAX = 60;
export const DESC_MIN = 140;
export const DESC_MAX = 160;

/** Length as a reader sees it (code points, so Devanagari is not double-counted). */
export function textLength(s: string): number {
  return [...s].length;
}

/** Cut at a word boundary to <= max chars, ending with "…". */
export function clampDescription(s: string, max = DESC_MAX): string {
  const clean = s.replace(/\s+/g, ' ').trim();
  if (textLength(clean) <= max) return clean;
  const cut = [...clean].slice(0, max - 1).join('');
  const sp = cut.lastIndexOf(' ');
  return `${(sp > 80 ? cut.slice(0, sp) : cut).replace(/[\s,;:–—-]+$/, '')}…`;
}

/** Required lead plus optional extra sentences, added in order while the text stays <= max. */
export function fitDescription(lead: string, extras: readonly string[], max = DESC_MAX): string {
  let out = lead.replace(/\s+/g, ' ').trim();
  if (textLength(out) > max) return clampDescription(out, max);
  for (const e of extras) {
    if (!e) continue;
    const next = `${out} ${e}`.trim();
    if (textLength(next) <= max) out = next;
  }
  return out;
}

/**
 * First candidate that fits: candidates[0] with " | SahiSize", then each candidate without
 * the brand. Falls back to a word-boundary cut of the last candidate.
 */
export function fitTitle(candidates: readonly string[], max = TITLE_MAX): string {
  const list = candidates.map((c) => c.replace(/\s+/g, ' ').trim()).filter(Boolean);
  if (!list.length) return SITE_NAME;
  const branded = `${list[0]} | ${SITE_NAME}`;
  if (textLength(branded) <= max) return branded;
  for (const c of list) if (textLength(c) <= max) return c;
  const last = [...list[list.length - 1]!].slice(0, max).join('');
  return last.slice(0, last.lastIndexOf(' ')).replace(/[\s,;:–—|-]+$/, '');
}

/** "X | SahiSize", unless the title already ends with the site name. */
export function withSiteName(title: string): string {
  return title.endsWith(SITE_NAME) ? title : `${title} | ${SITE_NAME}`;
}

/** Exam name without its bracketed part: "IBPS RRB PO (Officer Scale I)" -> "IBPS RRB PO". */
export function shortExamName(name: string): string {
  return name.replace(/\s*\([^)]*\)\s*/g, ' ').replace(/\s+/g, ' ').trim();
}

export type MetaLengthIssue = 'title-too-long' | 'description-too-short' | 'description-too-long';

/**
 * Length problems of one page's <title> and meta description against the site rules
 * (title <= TITLE_MAX, description DESC_MIN–DESC_MAX, all in code points). [] = OK.
 */
export function metaLengthIssues(m: { title: string; description: string }): MetaLengthIssue[] {
  const out: MetaLengthIssue[] = [];
  if (textLength(m.title) > TITLE_MAX) out.push('title-too-long');
  const d = textLength(m.description.replace(/\s+/g, ' ').trim());
  if (d < DESC_MIN) out.push('description-too-short');
  if (d > DESC_MAX) out.push('description-too-long');
  return out;
}

/**
 * First segment of a mixed-script title that is entirely Latin script, for OG cards
 * (satori has no Devanagari font). Segments split on " — ", " – ", ":" and "|".
 *   latinLead('Photo ko KB me kaise kare — फोटो का KB सही करें') -> 'Photo ko KB me kaise kare'
 *   latinLead('फोटो का साइज़') -> undefined
 */
export function latinLead(title: string): string | undefined {
  return title
    .split(/\s+[—–|]\s+|:\s+/)
    .map((s) => s.trim())
    .find((s) => s.length > 0 && /[A-Za-z]/.test(s) && /^[ -ɏ‐-‧]+$/.test(s));
}
