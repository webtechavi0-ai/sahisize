/**
 * Site search: one query -> grouped results (Exams, Tools, Other documents, Guides).
 * Builds on lib/search (scoring, typo tolerance) and lib/intents (everyday words).
 * Pure and client-safe; the data comes from src/lib/nav-data.ts at build time.
 */
import type { SearchEntry } from '@/lib/search';
import { scoreEntry, searchOther } from '@/lib/search';
import { parseQuery, type DocWord, type ParsedQuery, type ToolCat } from '@/lib/intents';
import type { OtherDocSearchEntry } from '@/config/other-docs';

export interface ExamEntry extends SearchEntry {
  /** Document types the exam asks for, in preset order (photo, signature, thumb...). */
  docs?: string[];
  /** Document slugs that have their own /exam/<slug>/<doc> page (English only). */
  pages?: string[];
}

export interface ToolEntry {
  id: string;
  en: string;
  hi: string;
  aliases: string[];
  cat: ToolCat;
  /** English path, and the Hindi path when a Hindi page exists (else null). */
  href: { en: string; hi: string | null };
  /** Documents the tool is the answer for ("signature" -> signature resize). */
  docs?: DocWord[];
}

export interface GuideEntry {
  id: string;
  en: string;
  hi: string;
  aliases: string[];
  href: string;
}

export interface KbPages {
  /** /tools/compress-image-to-<n>kb */
  img: number[];
  /** /tools/compress-pdf-to-<n>kb */
  pdf: number[];
  /** /tools/jpg-to-pdf-under-<n>kb */
  jpgPdf: number[];
  /** English paths that have a /hi counterpart. */
  hi: string[];
}

export interface SiteSearchData {
  exams: ExamEntry[];
  tools: ToolEntry[];
  docs: OtherDocSearchEntry[];
  guides: GuideEntry[];
  kb: KbPages;
  /** Exam slugs in popularity order (season order): tie-breaks and "Popular". */
  rank: string[];
}

export type KbKind = 'img' | 'pdf' | 'jpgPdf';

export type Hit =
  | { kind: 'exam'; entry: ExamEntry; score: number; doc: string | null }
  | { kind: 'tool'; entry: ToolEntry; score: number }
  | { kind: 'kb'; n: number; type: KbKind; path: string; score: number }
  | { kind: 'doc'; entry: OtherDocSearchEntry; score: number }
  | { kind: 'guide'; entry: GuideEntry; score: number };

export type GroupKind = 'exam' | 'tool' | 'doc' | 'guide';

export interface ResultGroup {
  kind: GroupKind;
  hits: Hit[];
}

export const LIMITS: Record<GroupKind, number> = { exam: 6, tool: 4, doc: 3, guide: 2 };

export function kbPath(type: KbKind, n: number): string {
  if (type === 'pdf') return `/tools/compress-pdf-to-${n}kb`;
  if (type === 'jpgPdf') return `/tools/jpg-to-pdf-under-${n}kb`;
  return `/tools/compress-image-to-${n}kb`;
}

/** The page for "<n> KB": exact, else the largest target below n, else the smallest above. */
export function pickKb(n: number, targets: readonly number[]): number | null {
  if (!targets.length) return null;
  if (targets.includes(n)) return n;
  const below = targets.filter((x) => x < n);
  return below.length ? Math.max(...below) : Math.min(...targets);
}

function rankOf(rank: readonly string[], slug: string): number {
  const i = rank.indexOf(slug);
  return i < 0 ? 999 : i;
}

function examHits(p: ParsedQuery, data: SiteSearchData): Hit[] {
  const out: Hit[] = [];
  const full = p.toolQuery;
  const docFor = (e: ExamEntry) => (p.doc && e.pages?.includes(p.doc) ? p.doc : null);

  if (p.examIntent) {
    const inIntent = (e: ExamEntry) => p.groups.has(e.group) || p.slugs.has(e.slug);
    const scored = data.exams.map((e) => ({
      e,
      intent: inIntent(e),
      rest: p.rest ? scoreEntry(p.rest, e) : 0,
      full: full ? scoreEntry(full, e) : 0,
    }));
    const restMatched = !!p.rest && scored.some((s) => s.intent && s.rest >= 60);
    for (const s of scored) {
      let score = 0;
      if (s.intent) {
        // Group members first; the extra slugs ("police" -> SSC GD, SSC CPO) just after.
        if (!p.rest) score = p.groups.has(s.e.group) ? 90 : 85;
        else if (restMatched) score = s.rest >= 60 ? 95 + s.rest / 10 : 0;
        else score = 60; // "bank xyz": show the bank exams anyway
      }
      if (s.full >= 80) score = Math.max(score, s.full); // "delhi police" -> SSC CPO
      // Coming-soon exams after the ones you can use today.
      if (score > 0 && !s.e.published) score -= 10;
      if (score > 0) out.push({ kind: 'exam', entry: s.e, score, doc: docFor(s.e) });
    }
  } else if (p.rest) {
    for (const e of data.exams) {
      const score = Math.max(scoreEntry(p.rest, e), full ? scoreEntry(full, e) : 0);
      if (score > 0) out.push({ kind: 'exam', entry: e, score, doc: docFor(e) });
    }
  } else if (p.doc && p.kb === null) {
    // Only a document word ("signature", "फोटो"): the popular exams' pages for that document.
    for (const slug of data.rank) {
      const e = data.exams.find((x) => x.slug === slug);
      if (e?.published && e.pages?.includes(p.doc)) out.push({ kind: 'exam', entry: e, score: 70, doc: p.doc });
      if (out.length >= 4) break;
    }
    return out;
  }
  const top = Math.max(0, ...out.map((h) => h.score));
  const floor = top >= 80 ? 70 : 0;
  return out
    .filter((h) => h.score >= floor)
    .sort((a, b) => {
      const ea = (a as { entry: ExamEntry }).entry;
      const eb = (b as { entry: ExamEntry }).entry;
      return (
        b.score - a.score ||
        Number(eb.published) - Number(ea.published) ||
        rankOf(data.rank, ea.slug) - rankOf(data.rank, eb.slug) ||
        ea.en.length - eb.en.length ||
        ea.en.localeCompare(eb.en)
      );
    });
}

function toolHits(p: ParsedQuery, data: SiteSearchData): Hit[] {
  const out: Hit[] = [];
  if (p.kb !== null) {
    const type: KbKind = p.toPdf ? 'jpgPdf' : p.pdf ? 'pdf' : 'img';
    const n = pickKb(p.kb, data.kb[type]);
    if (n !== null) out.push({ kind: 'kb', n, type, path: kbPath(type, n), score: n === p.kb ? 200 : 150 });
  }
  const fuzzy = new Set<ToolEntry>();
  for (const e of data.tools) {
    const text = p.toolQuery ? scoreEntry(p.toolQuery, e) : 0;
    let score = text;
    if (p.tools.has(e.cat)) score = Math.max(score, 55);
    if (p.doc && e.docs?.includes(p.doc)) score = Math.max(score, p.rest || p.examIntent ? 50 : 60);
    if (score > 0) out.push({ kind: 'tool', entry: e, score });
    if (score === text && text < 80) fuzzy.add(e);
  }
  const top = Math.max(0, ...out.map((h) => h.score));
  // A clear match ("compress pdf"): drop look-alikes that only matched on letters.
  return out
    .filter((h) => !(top >= 100 && h.kind === 'tool' && fuzzy.has(h.entry)))
    .sort((a, b) => b.score - a.score);
}

function docHits(p: ParsedQuery, data: SiteSearchData): Hit[] {
  const best = new Map<string, Hit & { kind: 'doc' }>();
  const add = (q: string) => {
    if (!q) return;
    for (const h of searchOther(q, data.docs, 6)) {
      const prev = best.get(h.entry.id);
      if (!prev || prev.score < h.score) best.set(h.entry.id, { kind: 'doc', entry: h.entry, score: h.score });
    }
  };
  add(p.normalized);
  add(p.toolQuery);
  if (p.tools.has('govtId') && best.size === 0) {
    for (const d of data.docs)
      if (['pan-photo', 'pan-signature', 'aadhaar'].includes(d.id)) best.set(d.id, { kind: 'doc', entry: d, score: 50 });
  }
  return [...best.values()].sort((a, b) => b.score - a.score);
}

function guideHits(p: ParsedQuery, data: SiteSearchData): Hit[] {
  const q = p.toolQuery;
  if (!q || q.replace(/ /g, '').length < 3) return [];
  const out: Hit[] = [];
  for (const g of data.guides) {
    const s = scoreEntry(q, g);
    // Guides are long titles: only clear word matches, and always ranked after the rest.
    if (s >= 80) out.push({ kind: 'guide', entry: g, score: Math.min(s, 75) - 10 });
  }
  return out.sort((a, b) => b.score - a.score);
}

/** Grouped results, best group first. Empty array = no match (show the empty state). */
export function siteSearch(query: string, data: SiteSearchData): ResultGroup[] {
  if (!query.trim()) return [];
  const p = parseQuery(query);
  const tools = toolHits(p, data);
  // A page that is a tool (passport size, stamp, custom size) is listed once, under Tools.
  const toolPaths = new Set(tools.map((h) => (h.kind === 'tool' ? h.entry.href.en : '')));
  const groups: ResultGroup[] = [
    { kind: 'exam' as const, hits: examHits(p, data) },
    { kind: 'tool' as const, hits: tools },
    { kind: 'doc' as const, hits: docHits(p, data).filter((h) => !(h.kind === 'doc' && toolPaths.has(h.entry.href.en))) },
    { kind: 'guide' as const, hits: guideHits(p, data) },
  ]
    .map((g) => {
      let limit = LIMITS[g.kind];
      // An exam name was typed ("neet photo"): keep the tool list short.
      if (g.kind === 'tool' && p.examIntent === false && p.rest && p.kb === null && !p.tools.size) limit = 2;
      return { ...g, hits: g.hits.slice(0, limit) };
    })
    .filter((g) => g.hits.length > 0);
  const best = (g: ResultGroup) => Math.max(...g.hits.map((h) => h.score));
  const order: GroupKind[] = ['exam', 'tool', 'doc', 'guide'];
  return groups.sort((a, b) => best(b) - best(a) || order.indexOf(a.kind) - order.indexOf(b.kind));
}

export { parseQuery };
