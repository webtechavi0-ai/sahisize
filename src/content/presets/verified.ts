/**
 * Which presets are verified against an official source (Q31 production polish).
 *
 * Official source = an https URL whose host belongs to an exam body or a government
 * domain. Verified = official source AND `checkedBy` does not say "unverified".
 * Everything else (coaching sites, resizer tools, re-hosted copies of a notice) is
 * shown as "Unverified — sizes from secondary sources" on exam pages and /sources.
 *
 * Pure module (no preset registry import) so islands and scripts can use it too.
 */

/** Domain suffixes that are government or exam-body owned. A host matches the suffix
 * itself or any subdomain of it. */
const OFFICIAL_SUFFIXES = [
  'gov.in', // central and state government, incl. upsc.gov.in, ssc.gov.in, rrb*.gov.in, s3waas.gov.in (NIC hosting)
  'nic.in', // NIC-hosted sites, e.g. joinindianarmy.nic.in
  'ac.in', // academic / testing bodies, incl. nta.ac.in
] as const;

/**
 * Exact hosts (and their subdomains) of exam bodies outside the suffixes above.
 * Add a host only after confirming the exam body itself runs it; a vendor platform
 * that hosts many clients (e.g. *.eapplynow.com) or a re-hosted PDF does not count.
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
  // IAF CASB recruitment portal, run by EdCIL (a Government of India PSU) since the
  // agnipathvayu.cdac.in site went offline; exact host only.
  'iafrecruitment.edcil.co.in',
  // Other official exam bodies that appear (or have appeared) in the presets:
  'bseh.org.in', // Board of School Education Haryana (HTET)
  // Exact vendor host designated by the exam body itself: the BSEH HTET bulletin says
  // "APPLY ON-LINE BY ACCESSING BOARD'S WEBSITE www.bseh.org.in, https://htet.eapplynow.com"
  // and bseh.org.in/home links it as the "Online Portal for HTET". Other *.eapplynow.com
  // hosts are NOT official (hostMatches only accepts this host and its subdomains).
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

/** Minimal preset shape needed to decide verification. */
export interface VerifiablePreset {
  sourceUrl: string;
  checkedBy: string;
}

/** Official source AND not marked "unverified" by the researcher. */
export function isVerifiedPreset(p: VerifiablePreset): boolean {
  return isOfficialSourceUrl(p.sourceUrl) && !/unverified/i.test(p.checkedBy);
}
