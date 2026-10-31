/**
 * Which presets are verified against an official source.
 * Official source = https URL on an exam-body or government host. Verified = official source
 * AND `checkedBy` does not say "unverified". Everything else is shown as
 * "Unverified — sizes from secondary sources".
 */
import type { ExamPreset } from './types';

/** Government / exam-body domain suffixes (the host itself or any subdomain). */
const OFFICIAL_SUFFIXES = ['gov.in', 'nic.in', 'ac.in'] as const;

/**
 * Exact hosts (and subdomains) of exam bodies outside the suffixes above. Add a host only
 * after confirming the exam body itself runs it; a multi-client vendor platform or a
 * re-hosted PDF does not count.
 */
export const OFFICIAL_HOST_ALLOWLIST: readonly string[] = [
  'ibps.in',
  'sbi.co.in',
  'sbi.bank.in',
  'rbi.org.in',
  'opportunities.rbi.org.in',
  'nabard.org',
  'indiapostgdsonline.gov.in',
  'agnipathvayu.cdac.in',
  // IAF CASB portal run by EdCIL (a GoI PSU) since agnipathvayu.cdac.in went offline.
  'iafrecruitment.edcil.co.in',
  // Board of School Education Haryana (HTET).
  'bseh.org.in',
  // Vendor host designated by BSEH itself as the HTET portal; other *.eapplynow.com hosts are not official.
  'htet.eapplynow.com',
];

function hostMatches(host: string, domain: string): boolean {
  return host === domain || host.endsWith(`.${domain}`);
}

/** True when `url` is an https URL on an exam-body or government host. */
export function isOfficialSourceUrl(url: string): boolean {
  let u: URL;
  try {
    u = new URL(url);
  } catch {
    return false;
  }
  if (u.protocol !== 'https:') return false;
  const host = u.hostname.toLowerCase().replace(/\.$/, '');
  if (!host) return false;
  if (OFFICIAL_SUFFIXES.some((d) => hostMatches(host, d))) return true;
  return OFFICIAL_HOST_ALLOWLIST.some((d) => hostMatches(host, d));
}

/** Official source AND not marked "unverified" by the researcher. */
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
 * Popular grid: `ordered` (season order) filtered to verified, current-cycle presets, up to
 * `limit` (default 12). Later entries backfill the slots of dropped ones.
 */
export function pickPopular<T extends Pick<ExamPreset, 'sourceUrl' | 'checkedBy' | 'cycle'>>(
  ordered: readonly T[],
  opts: { year: number; limit?: number },
): T[] {
  const limit = opts.limit ?? 12;
  return ordered.filter((p) => isVerifiedPreset(p) && isCurrentCycle(p, opts.year)).slice(0, limit);
}
