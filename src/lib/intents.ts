/**
 * Search intents: the words people type when they don't know the exact exam name
 * ("bank clerk form", "railway form", "police bharti", "पुलिस", "photo 20kb", "pdf").
 *
 * parseQuery() splits a query into
 *   - exam intents (groups and exact slugs: "bank" -> banking, "railway" -> RRB, "police" -> police)
 *   - a document word ("photo", "signature", "thumb"...) used to link exam document pages
 *   - tool categories ("pdf" -> PDF tools, "20kb" -> the 20 KB page, "signature" -> signature tool)
 *   - the rest: the words that are left for name matching ("bank po" -> "po").
 * Noise words ("form", "bharti", "online", "2026", "ka", "के") are dropped from the rest.
 *
 * Pure and client-safe (the search island imports it). Unit tests: tests/unit/ui/intents.test.ts.
 */
import type { ExamGroup } from '@/content/presets/schema';
import { damerau, normalize } from '@/lib/search';

/** Tool categories, also the sections of the /tools page. */
export type ToolCat = 'kb' | 'size' | 'signature' | 'documents' | 'pdf' | 'govtId';
export type DocWord = 'photo' | 'signature' | 'thumb' | 'declaration' | 'certificate';

export interface Intent {
  /** Lower-case words or phrases (Latin or Devanagari). Phrases match as a whole. */
  words: readonly string[];
  groups?: readonly ExamGroup[];
  slugs?: readonly string[];
  tools?: readonly ToolCat[];
  doc?: DocWord;
}

export const INTENTS: readonly Intent[] = [
  // Exam families by everyday word
  { words: ['bank', 'banking', 'banks', 'बैंक', 'बैंकिंग'], groups: ['banking'] },
  {
    words: ['railway', 'railways', 'rail', 'rly', 'रेलवे', 'रेल'],
    groups: ['railway'],
  },
  {
    words: ['police', 'constable', 'sipahi', 'daroga', 'पुलिस', 'कांस्टेबल', 'सिपाही', 'आरक्षक', 'दरोगा'],
    groups: ['police'],
    slugs: ['ssc-gd', 'ssc-cpo'],
  },
  {
    words: ['teacher', 'teachers', 'teaching', 'tet', 'shikshak', 'adhyapak', 'शिक्षक', 'टीचर', 'अध्यापक', 'टीईटी'],
    groups: ['teaching'],
    slugs: ['dsssb'],
  },
  {
    words: ['army', 'navy', 'air force', 'airforce', 'defence', 'defense', 'fauj', 'sena', 'सेना', 'फौज', 'आर्मी'],
    groups: ['defence'],
    slugs: ['nda', 'cds'],
  },
  { words: ['medical', 'doctor', 'mbbs', 'मेडिकल'], slugs: ['neet-ug'] },
  { words: ['engineering', 'iit', 'इंजीनियरिंग'], slugs: ['jee-main'] },
  { words: ['college', 'university', 'graduation', 'कॉलेज'], slugs: ['cuet-ug'] },
  { words: ['ias', 'ips', 'civil services', 'आईएएस'], slugs: ['upsc-cse'] },
  { words: ['post office', 'dak', 'डाक', 'पोस्ट ऑफिस'], slugs: ['india-post-gds'] },
  { words: ['psc', 'pcs', 'state psc', 'लोक सेवा आयोग'], groups: ['state-psc'] },
  { words: ['professor', 'lecturer', 'jrf'], slugs: ['ugc-net', 'csir-net'] },

  // Documents (also pick the matching tools)
  {
    words: ['photo', 'photos', 'photograph', 'pic', 'picture', 'image', 'img', 'foto', 'फोटो', 'फ़ोटो', 'तस्वीर', 'फोटोग्राफ'],
    doc: 'photo',
  },
  {
    words: ['signature', 'sign', 'sig', 'signatur', 'hastakshar', 'sign photo', 'हस्ताक्षर', 'सिग्नेचर', 'साइन'],
    doc: 'signature',
    tools: ['signature'],
  },
  {
    words: ['thumb', 'thumb impression', 'angutha', 'anguttha', 'अंगूठा', 'अंगूठे', 'अंगूठे का निशान'],
    doc: 'thumb',
    tools: ['documents'],
  },
  {
    words: ['declaration', 'handwritten declaration', 'ghoshna', 'घोषणा', 'डिक्लेरेशन'],
    doc: 'declaration',
    tools: ['documents'],
  },
  { words: ['certificate', 'certificates', 'marksheet', 'सर्टिफिकेट', 'प्रमाण पत्र'], doc: 'certificate', tools: ['pdf'] },

  // Tools
  { words: ['kb', 'compress', 'reduce', 'chota', 'chhota', 'kam', 'mb', 'केबी', 'छोटा', 'कम'], tools: ['kb'] },
  { words: ['pdf', 'पीडीएफ'], tools: ['pdf'] },
  { words: ['resize', 'cm', 'mm', 'px', 'pixel', 'pixels', 'dimension', 'रीसाइज़', 'रीसाइज'], tools: ['size'] },
  { words: ['govt id', 'id card', 'id proof', 'pan card', 'aadhaar', 'आईडी'], tools: ['govtId'] },
];

/** Dropped before name matching. Generic words that every exam form query carries. */
export const NOISE_WORDS: ReadonlySet<string> = new Set([
  'form', 'forms', 'farm', 'bharti', 'bharati', 'bharthi', 'bhartee', 'vacancy', 'recruitment',
  'exam', 'exams', 'pariksha', 'online', 'apply', 'application', 'upload', 'size', 'sizes',
  'kaise', 'kare', 'karen', 'karna', 'kya', 'hai', 'ka', 'ki', 'ke', 'me', 'mein', 'ko', 'se',
  'for', 'the', 'of', 'to', 'in', 'and', 'a', 'my', 'new', 'latest', 'sarkari', 'naukri', 'job',
  'jobs', 'official', 'notification', 'free', 'tool', 'tools', 'online', 'website',
  'फॉर्म', 'फार्म', 'भर्ती', 'परीक्षा', 'का', 'की', 'के', 'में', 'को', 'से', 'साइज', 'साइज़', 'कैसे',
  'करें', 'है', 'नौकरी', 'सरकारी', 'ऑनलाइन', 'आवेदन',
  '2024', '2025', '2026', '2027', '2028',
]);

export interface ParsedQuery {
  /** Normalised query with "20kb" split into "20 kb". */
  normalized: string;
  groups: Set<ExamGroup>;
  slugs: Set<string>;
  tools: Set<ToolCat>;
  doc: DocWord | null;
  /** First "<n> kb" number in the query. */
  kb: number | null;
  /** True when "pdf" (or पीडीएफ) is in the query: KB numbers then mean PDF pages. */
  pdf: boolean;
  /** "jpg/image to pdf": KB numbers mean the images-to-PDF pages. */
  toPdf: boolean;
  /** Words left for exam-name matching (no intent, document or noise words). */
  rest: string;
  /** Query for tool/guide matching: noise words dropped, document and tool words kept. */
  toolQuery: string;
  /** True when at least one exam intent (group or slug) matched. */
  examIntent: boolean;
}

function tokenMatches(token: string, word: string): boolean {
  if (token === word) return true;
  const tl = [...token].length;
  const wl = [...word].length;
  // "railways" -> railway, "teachers" -> teacher (plural / suffix)
  if (wl >= 4 && token.startsWith(word) && tl - wl <= 2) return true;
  // partial typing: "railw" -> railway, "signa" -> signature (4+ letters)
  if (tl >= 4 && word.startsWith(token)) return true;
  // one typo for 5+ letter words: "railwy", "polise", "sigature"
  if (tl >= 5 && wl >= 5 && damerau(token, word, 1) <= 1) return true;
  // one transposition for 4 letters: "bnak"
  if (tl === 4 && wl === 4 && damerau(token, word, 1) <= 1 && [...token].sort().join('') === [...word].sort().join(''))
    return true;
  return false;
}

/** Normalise and split glued KB numbers: "photo20kb" -> "photo 20 kb". */
export function prepare(q: string): string {
  return normalize(q)
    .replace(/(\d+)\s*(kb|केबी)\b/g, ' $1 kb ')
    .replace(/(\d+)\s*(mb)\b/g, ' $1 mb ')
    .replace(/\s+/g, ' ')
    .trim();
}

export function parseQuery(query: string): ParsedQuery {
  const normalized = prepare(query);
  const toks = normalized ? normalized.split(' ') : [];
  const used = new Array<boolean>(toks.length).fill(false);
  const noise = new Array<boolean>(toks.length).fill(false);
  const out: ParsedQuery = {
    normalized,
    groups: new Set(),
    slugs: new Set(),
    tools: new Set(),
    doc: null,
    kb: null,
    pdf: false,
    toPdf: false,
    rest: '',
    toolQuery: '',
    examIntent: false,
  };

  const apply = (it: Intent) => {
    it.groups?.forEach((g) => out.groups.add(g));
    it.slugs?.forEach((s) => out.slugs.add(s));
    it.tools?.forEach((c) => out.tools.add(c));
    if (it.doc && !out.doc) out.doc = it.doc;
  };

  // Phrases first ("post office", "air force", "thumb impression"), then single words.
  for (const it of INTENTS) {
    for (const w of it.words) {
      const parts = normalize(w).split(' ');
      if (parts.length < 2) continue;
      for (let i = 0; i + parts.length <= toks.length; i++) {
        if (parts.every((p, k) => !used[i + k] && toks[i + k] === p)) {
          for (let k = 0; k < parts.length; k++) used[i + k] = true;
          apply(it);
        }
      }
    }
  }
  toks.forEach((tok, i) => {
    if (used[i]) return;
    if (/^\d+$/.test(tok) && toks[i + 1] === 'kb') {
      if (out.kb === null) out.kb = Number(tok);
      used[i] = true;
      return;
    }
    for (const it of INTENTS) {
      if (it.words.some((w) => !w.includes(' ') && tokenMatches(tok, normalize(w)))) {
        used[i] = true;
        apply(it);
        return;
      }
    }
    if (NOISE_WORDS.has(tok)) noise[i] = true;
  });

  out.pdf = toks.some((t) => t === 'pdf' || t === 'पीडीएफ');
  const pdfAt = toks.findIndex((t) => t === 'pdf' || t === 'पीडीएफ');
  out.toPdf =
    pdfAt > 0 &&
    toks.slice(0, pdfAt).some((t) => ['jpg', 'jpeg', 'image', 'images', 'photo', 'photos', 'to', 'फोटो'].includes(t)) &&
    toks.slice(0, pdfAt).includes('to');
  // "compress pdf", "pdf chota": the PDF tools, not the photo KB tools.
  if (out.pdf && out.kb === null) out.tools.delete('kb');
  if (out.kb !== null) out.tools.add(out.pdf ? 'pdf' : 'kb');
  out.examIntent = out.groups.size > 0 || out.slugs.size > 0;
  out.rest = toks.filter((_, i) => !used[i] && !noise[i]).join(' ');
  out.toolQuery = toks.filter((_, i) => !noise[i]).join(' ');
  return out;
}
