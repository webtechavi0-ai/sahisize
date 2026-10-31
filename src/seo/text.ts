/**
 * Title and description length rules. Pure.
 * Titles are at most TITLE_MAX characters (search engines truncate beyond ~60); when too
 * long, `fitTitle` drops the brand first, then tries shorter variants.
 * Descriptions are DESC_MIN–DESC_MAX characters.
 */
import { SITE_NAME } from '@/config/site';

export const TITLE_MAX = 60;
export const DESC_MIN = 120;
export const DESC_MAX = 155;

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
