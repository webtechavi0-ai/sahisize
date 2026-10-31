/**
 * Exam search (SPEC K1, PLAN 3.10). Pure and small: normalise, score, group by body.
 *
 * Scoring, best of all candidate strings of an entry (English name, Hindi name, aliases,
 * slug, "body + name"):
 *   prefix of the compact string (no spaces/punctuation)  -> 100 (+10 exact)
 *   every query token is a prefix of a candidate token     -> 80
 *   trigram Jaccard >= 0.35 on compact strings             -> 40 + 40·j
 *   every query token within Damerau-Levenshtein of a token (0 for ≤3 chars,
 *   1 for ≤5, else 2)                                       -> 30 + 10·coverage
 */
import type { SearchEntry } from '@/content/presets';

export type { SearchEntry } from '@/content/presets';

export interface SearchHit {
  entry: SearchEntry;
  score: number;
}

export interface SearchGroup {
  body: string;
  hits: SearchHit[];
}

/** Lowercase, fold Devanagari nukta/chandrabindu, turn punctuation into spaces. */
export function normalize(s: string): string {
  return s
    .toLowerCase()
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '') // Latin accents
    .replace(/़/g, '') // nukta
    .replace(/ँ/g, 'ं') // chandrabindu -> anusvara
    .normalize('NFC')
    .replace(/[^\p{L}\p{M}\p{N}]+/gu, ' ')
    .trim();
}

export function tokens(s: string): string[] {
  const n = normalize(s);
  return n ? n.split(' ') : [];
}

export function compact(s: string): string {
  return normalize(s).replace(/ /g, '');
}

function trigrams(s: string): Set<string> {
  const p = `  ${s} `;
  const out = new Set<string>();
  for (let i = 0; i + 3 <= p.length; i++) out.add(p.slice(i, i + 3));
  return out;
}

export function trigramJaccard(a: string, b: string): number {
  const A = trigrams(a);
  const B = trigrams(b);
  let inter = 0;
  for (const g of A) if (B.has(g)) inter++;
  const union = A.size + B.size - inter;
  return union === 0 ? 0 : inter / union;
}

/** Optimal string alignment distance (Damerau-Levenshtein with adjacent transpositions). */
export function damerau(a: string, b: string, max = Infinity): number {
  const la = a.length;
  const lb = b.length;
  if (Math.abs(la - lb) > max) return max + 1;
  let prev2: number[] = [];
  let prev = Array.from({ length: lb + 1 }, (_, j) => j);
  for (let i = 1; i <= la; i++) {
    const cur = [i];
    let rowMin = i;
    for (let j = 1; j <= lb; j++) {
      const cost = a[i - 1] === b[j - 1] ? 0 : 1;
      let v = Math.min(prev[j]! + 1, cur[j - 1]! + 1, prev[j - 1]! + cost);
      if (i > 1 && j > 1 && a[i - 1] === b[j - 2] && a[i - 2] === b[j - 1]) {
        v = Math.min(v, prev2[j - 2]! + 1);
      }
      cur[j] = v;
      if (v < rowMin) rowMin = v;
    }
    if (rowMin > max) return max + 1;
    prev2 = prev;
    prev = cur;
  }
  return prev[lb]!;
}

function allowedTypos(token: string): number {
  const n = [...token].length;
  if (n <= 3) return 0;
  if (n <= 5) return 1;
  return 2;
}

/** Anything with names and aliases can be scored (exam entries and other-document entries). */
export interface Scorable {
  en: string;
  hi: string;
  aliases: readonly string[];
  slug?: string;
  body?: string;
}

function candidates(e: Scorable): string[] {
  const out = [e.en, e.hi, ...e.aliases];
  if (e.slug) out.push(e.slug.replace(/-/g, ' '));
  if (e.body) out.push(`${e.body} ${e.en}`);
  return out;
}

/** Score one entry for a query. 0 = no match. */
export function scoreEntry(query: string, e: Scorable): number {
  const qc = compact(query);
  const qt = tokens(query);
  if (!qc) return 0;
  let best = 0;
  for (const cand of candidates(e)) {
    const cc = compact(cand);
    const ct = tokens(cand);
    if (!cc) continue;
    if (cc.startsWith(qc)) {
      best = Math.max(best, cc === qc ? 110 : 100);
      continue;
    }
    if (qt.length && qt.every((q) => ct.some((c) => c.startsWith(q)))) {
      best = Math.max(best, 80);
      continue;
    }
    const j = trigramJaccard(qc, cc);
    if (j >= 0.35) best = Math.max(best, 40 + 40 * j);
    if (
      qt.length &&
      qt.every((q) =>
        ct.some((c) => {
          const max = allowedTypos(q);
          return c.startsWith(q) || (max > 0 && damerau(q, c, max) <= max);
        }),
      )
    ) {
      best = Math.max(best, 30 + 10 * Math.min(1, qt.length / ct.length));
    }
  }
  return best;
}

/** Ranked hits, best first; ties broken by shorter English name. */
export function search(query: string, index: readonly SearchEntry[], limit = 12): SearchHit[] {
  const hits: SearchHit[] = [];
  for (const entry of index) {
    const score = scoreEntry(query, entry);
    if (score > 0) hits.push({ entry, score });
  }
  hits.sort(
    (a, b) =>
      b.score - a.score ||
      Number(b.entry.published) - Number(a.entry.published) ||
      a.entry.en.length - b.entry.en.length ||
      a.entry.en.localeCompare(b.entry.en),
  );
  return hits.slice(0, limit);
}

/**
 * "Other documents" search (PAN, passport size, Aadhaar note...). Same scoring as exams,
 * returned separately so the UI shows them in their own group, never inside exam groups.
 */
export function searchOther<T extends Scorable>(
  query: string,
  entries: readonly T[],
  limit = 4,
): { entry: T; score: number }[] {
  const hits: { entry: T; score: number }[] = [];
  for (const entry of entries) {
    const score = scoreEntry(query, entry);
    if (score > 0) hits.push({ entry, score });
  }
  hits.sort((a, b) => b.score - a.score);
  return hits.slice(0, limit);
}
