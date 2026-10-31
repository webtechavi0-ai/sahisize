/**
 * Text normalisation and fuzzy-match primitives for search (Latin and Devanagari).
 * Pure and client-safe.
 */

/** Lowercase, drop Latin accents, fold Devanagari nukta/chandrabindu, punctuation -> spaces. */
export function normalize(s: string): string {
  return s
    .toLowerCase()
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
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

/** Normalised with spaces removed ("IBPS-PO" -> "ibpspo"). */
export function compact(s: string): string {
  return normalize(s).replace(/ /g, '');
}

function trigrams(s: string): Set<string> {
  const p = `  ${s} `;
  const out = new Set<string>();
  for (let i = 0; i + 3 <= p.length; i++) out.add(p.slice(i, i + 3));
  return out;
}

/** Jaccard similarity of padded character trigrams. */
export function trigramJaccard(a: string, b: string): number {
  const A = trigrams(a);
  const B = trigrams(b);
  let inter = 0;
  for (const g of A) if (B.has(g)) inter++;
  const union = A.size + B.size - inter;
  return union === 0 ? 0 : inter / union;
}

/**
 * Optimal string alignment distance (Damerau-Levenshtein with adjacent transpositions).
 * Returns `max + 1` early once the distance is known to exceed `max`.
 */
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

/** Typos tolerated for a query token: 0 up to 3 letters, 1 up to 5, else 2. */
export function allowedTypos(token: string): number {
  const n = [...token].length;
  if (n <= 3) return 0;
  if (n <= 5) return 1;
  return 2;
}
