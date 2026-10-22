/**
 * Which presets count as verified for promotion (home "Popular exams right now").
 * A preset is verified when its `sourceUrl` is on an official domain of the conducting
 * body AND its `checkedBy` does not say "unverified". Copies of a notice on coaching or
 * news sites do not count, even when the copy is faithful.
 */
import type { ExamPreset } from './schema';

/** Host suffixes of official bodies (a host matches itself or any subdomain). */
export const OFFICIAL_HOST_SUFFIXES = [
  'gov.in',
  'nic.in',
  'ac.in',
  'ibps.in',
  'sbi.co.in',
  'sbi.bank.in',
  'rbi.org.in',
  'nabard.org',
  'nta.ac.in',
  'upsc.gov.in',
  'ssc.gov.in',
] as const;

/** Exact official hosts that the suffix rules do not cover. */
export const OFFICIAL_HOST_ALLOWLIST: readonly string[] = [];

function hostMatches(host: string, suffix: string): boolean {
  return host === suffix || host.endsWith(`.${suffix}`);
}

/** True when `url` is https/http on an official domain (rrb*.gov.in is covered by gov.in). */
export function isOfficialSourceUrl(url: string): boolean {
  let host: string;
  try {
    host = new URL(url).hostname.toLowerCase();
  } catch {
    return false;
  }
  if (OFFICIAL_HOST_ALLOWLIST.includes(host)) return true;
  if (/^rrb[a-z]*\.gov\.in$/.test(host)) return true;
  return OFFICIAL_HOST_SUFFIXES.some((s) => hostMatches(host, s));
}

export function isVerifiedPreset(p: Pick<ExamPreset, 'sourceUrl' | 'checkedBy'>): boolean {
  return isOfficialSourceUrl(p.sourceUrl) && !/unverified/i.test(p.checkedBy);
}

/** First 4-digit year in a cycle string ("2026", "December 2026", "02/2027"), or null. */
export function cycleYear(cycle: string): number | null {
  const m = /(?:^|\D)((?:19|20)\d{2})(?!\d)/.exec(cycle);
  return m ? Number(m[1]) : null;
}

/** False when the cycle names a year before `year` (no year in the cycle: kept). */
export function isCurrentCycle(p: Pick<ExamPreset, 'cycle'>, year: number): boolean {
  const y = cycleYear(p.cycle);
  return y === null || y >= year;
}

/**
 * Popular grid: `ordered` (season order) filtered to verified, current-cycle presets,
 * up to `limit`. Later entries backfill the slots of the ones dropped.
 */
export function pickPopular<T extends Pick<ExamPreset, 'sourceUrl' | 'checkedBy' | 'cycle'>>(
  ordered: readonly T[],
  opts: { year: number; limit?: number },
): T[] {
  const limit = opts.limit ?? 12;
  return ordered.filter((p) => isVerifiedPreset(p) && isCurrentCycle(p, opts.year)).slice(0, limit);
}
