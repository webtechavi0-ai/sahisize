/**
 * Pure text templates for exam hubs (/exam/<slug>, /hi/exam/<slug>): title candidates, H1,
 * and the application-window status. docs/seo/keyword-map.md §4 and §9:
 *   primary keyword "<short> photo size"; live-photo exams say so in the H1;
 *   no "— Resize Free" tail; the signature-size keyword stays on /exam/<slug>/signature.
 * No server-only, no '@/' runtime imports: unit-tested in ./__tests__/exam-template.test.ts.
 */
import type { Lang } from '@/i18n/config';
import type { ApplyWindow } from '@/lib/presets/types';

export interface ExamHeadingInput {
  /** Short Latin name: "SSC CGL", "RRB NTPC", "CSIR NET". */
  short: string;
  /** Preset cycle: "2026", "December 2026", "02/2027". */
  cycle: string;
  /** photoUploadReplacedByLive: the photo is captured in the form, never uploaded. */
  live: boolean;
  /** The exam has an uploaded photo document (or a live photo). */
  hasPhoto: boolean;
  hasSignature: boolean;
  hasThumb: boolean;
  /** Fallback document phrase when there is no photo + signature pair ("Signature & Certificate"). */
  docsPhrase: string;
}

const MONTHS_EN = [
  'January',
  'February',
  'March',
  'April',
  'May',
  'June',
  'July',
  'August',
  'September',
  'October',
  'November',
  'December',
] as const;
const MONTHS_HI = [
  'जनवरी',
  'फ़रवरी',
  'मार्च',
  'अप्रैल',
  'मई',
  'जून',
  'जुलाई',
  'अगस्त',
  'सितंबर',
  'अक्टूबर',
  'नवंबर',
  'दिसंबर',
] as const;

/** "December 2026" -> "Dec 2026" (titles are short); other cycles unchanged. */
export function titleCycle(cycle: string): string {
  return MONTHS_EN.reduce((s, m) => s.replace(new RegExp(`\\b${m}\\b`, 'g'), m.slice(0, 3)), cycle);
}

/** "December 2026" -> "दिसंबर 2026" for Hindi H1s; other cycles unchanged. */
export function hindiCycle(cycle: string): string {
  return MONTHS_EN.reduce((s, m, i) => s.replace(new RegExp(`\\b${m}\\b`, 'g'), MONTHS_HI[i]!), cycle);
}

/** Full month name for a 1–12 month number. */
export function monthName(m: number, lang: Lang): string {
  return (lang === 'hi' ? MONTHS_HI : MONTHS_EN)[m - 1] ?? '';
}

function pairOk(x: ExamHeadingInput): boolean {
  return x.hasPhoto && x.hasSignature;
}

/**
 * Title cores, best first. fitTitle() takes the first with " | SahiSize" when it fits,
 * then the first that fits without the brand.
 *   upload/live: "SSC CGL Photo Size 2026 & Signature Size"
 *   with thumb:  "IBPS PO Photo Size 2026, Signature & Thumb"
 */
export function examTitleCandidates(x: ExamHeadingInput, lang: Lang): string[] {
  const s = x.short;
  if (lang === 'hi') {
    const c = titleCycle(x.cycle);
    if (!pairOk(x)) return [`${s} ${x.docsPhrase} साइज़ ${c}`, `${s} ${x.docsPhrase} साइज़`];
    return [
      ...(x.hasThumb ? [`${s} फोटो साइज़ ${c}, सिग्नेचर और अंगूठा`] : []),
      `${s} फोटो साइज़ ${c} और सिग्नेचर साइज़`,
      `${s} फोटो साइज़ ${c} और सिग्नेचर`,
      `${s} फोटो साइज़ ${c}`,
    ];
  }
  const c = titleCycle(x.cycle);
  if (!pairOk(x)) return [`${s} ${x.docsPhrase} Size ${c}`, `${s} ${x.docsPhrase} Size`];
  return [
    ...(x.hasThumb ? [`${s} Photo Size ${c}, Signature & Thumb`] : []),
    `${s} Photo Size ${c} & Signature Size`,
    `${s} Photo Size ${c} & Signature`,
    `${s} Photo Size ${c}`,
  ];
}

/**
 *   live:   "SSC CGL Photo Size 2026: Live Photo and Signature Size"
 *   upload: "IBPS PO Photo Size 2026, Signature and Thumb Size"
 */
export function examH1Text(x: ExamHeadingInput, lang: Lang): string {
  const s = x.short;
  if (lang === 'hi') {
    const c = hindiCycle(x.cycle);
    if (!pairOk(x)) return `${s} ${x.docsPhrase} साइज़ ${c}`;
    if (x.live)
      return x.hasThumb
        ? `${s} फोटो साइज़ ${c}: लाइव फोटो, सिग्नेचर और अंगूठा`
        : `${s} फोटो साइज़ ${c}: लाइव फोटो और सिग्नेचर साइज़`;
    return x.hasThumb ? `${s} फोटो साइज़ ${c}, सिग्नेचर और अंगूठा साइज़` : `${s} फोटो साइज़ ${c} और सिग्नेचर साइज़`;
  }
  const c = x.cycle;
  if (!pairOk(x)) return `${s} ${x.docsPhrase} Size ${c}`;
  if (x.live)
    return x.hasThumb
      ? `${s} Photo Size ${c}: Live Photo, Signature and Thumb`
      : `${s} Photo Size ${c}: Live Photo and Signature Size`;
  return x.hasThumb ? `${s} Photo Size ${c}, Signature and Thumb Size` : `${s} Photo Size ${c} and Signature Size`;
}

/** Spec H2 over the size table: "SSC CGL photo and signature size 2026". */
export function examSpecH2(x: Pick<ExamHeadingInput, 'short' | 'cycle'>): string {
  return `${x.short} photo and signature size ${x.cycle}`;
}

/** A closed window younger than this belongs to the current season. */
const SAME_SEASON_DAYS = 120;

export type WindowStatus =
  | { kind: 'upcoming'; opens: string; closes: string }
  | { kind: 'open'; opens: string; closes: string }
  | { kind: 'late'; closes: string; until: string }
  | { kind: 'correction'; closes: string; until: string }
  | { kind: 'closed'; closes: string; nextMonths: number[]; seasonNow: boolean };

/**
 * Where `today` (YYYY-MM-DD) falls in the window. All end dates are inclusive.
 * `nextMonths` is seasonMonths ordered from the month after the window closed.
 */
export function windowStatus(w: ApplyWindow, seasonMonths: readonly number[], today: string): WindowStatus {
  const d = today.slice(0, 10);
  if (d < w.opens) return { kind: 'upcoming', opens: w.opens, closes: w.closes };
  if (d <= w.closes) return { kind: 'open', opens: w.opens, closes: w.closes };
  if (w.lateUntil && d <= w.lateUntil) return { kind: 'late', closes: w.closes, until: w.lateUntil };
  if (w.correctionUntil && d <= w.correctionUntil) return { kind: 'correction', closes: w.closes, until: w.correctionUntil };
  // Next season months, counted from the month after the window closed.
  const closedMonth = Number(w.closes.slice(5, 7));
  const after = (m: number) => (m - closedMonth - 1 + 12) % 12;
  const nextMonths = [...new Set(seasonMonths)].filter((m) => m >= 1 && m <= 12).sort((a, b) => after(a) - after(b));
  // A new notice may be out only in season AND well after this window (not the same season).
  const daysSince = (Date.parse(d) - Date.parse(w.lateUntil ?? w.correctionUntil ?? w.closes)) / 86_400_000;
  const seasonNow = seasonMonths.includes(Number(d.slice(5, 7))) && daysSince > SAME_SEASON_DAYS;
  return { kind: 'closed', closes: w.closes, nextMonths, seasonNow };
}

/** "November and February" / "नवंबर और फ़रवरी" / "May, June and July". */
export function monthList(months: readonly number[], lang: Lang): string {
  const names = months.map((m) => monthName(m, lang)).filter(Boolean);
  if (names.length <= 1) return names.join('');
  const and = lang === 'hi' ? ' और ' : ' and ';
  return `${names.slice(0, -1).join(', ')}${and}${names[names.length - 1]}`;
}
