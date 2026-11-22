/**
 * Which exam documents a "<n> KB" tool page should list. Pure (no imports), so it is unit-tested
 * and shared by the server-side link builder in src/server/content/tool-copy.ts.
 *
 * A page that makes a file of at most T KB suits a document whose limit is:
 *  - T itself, or a "less than T KB" rule stored as T − 1 (RRB's 399 KB for "less than 400 KB"),
 *  - up to just under 25% above T (a 250 KB file is a sensible pick for a 300 KB limit, but a
 *    400 KB page should not list the 500 KB IBPS certificate),
 *  - and whose minimum, if any, is not above T.
 * Documents whose size is still `toVerify` are never listed.
 */

/** A file made for T KB is listed for limits below T × LIMIT_SLACK. */
export const LIMIT_SLACK = 1.25;

export interface LimitDoc {
  minKB: number | null;
  maxKB: number | null;
  toVerify?: boolean | undefined;
}

export function limitMatchesTarget(targetKB: number, doc: LimitDoc): boolean {
  if (doc.toVerify || doc.maxKB === null || !(targetKB > 0)) return false;
  if (doc.minKB !== null && doc.minKB > targetKB) return false;
  return doc.maxKB >= targetKB - 1 && doc.maxKB < targetKB * LIMIT_SLACK;
}
