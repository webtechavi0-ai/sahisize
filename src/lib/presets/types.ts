/**
 * Exam preset domain types (the shape of src/content/presets/*.json after validation).
 * Hand-written so client code can use them without zod; the schema in
 * src/server/content/schemas/preset.ts is type-checked against these.
 */
import type {
  Confidence,
  DocType,
  ExamGroup,
  OutputFormat,
  PhysicalUnit,
  PrintPhotoSlug,
} from '@/config/exams';

export type { Confidence, DocType, ExamGroup, OutputFormat, PhysicalUnit, PrintPhotoSlug } from '@/config/exams';

export interface LocalizedText {
  en: string;
  hi: string;
}

export interface PhysicalSize {
  width: number;
  height: number;
  unit: PhysicalUnit;
}

/**
 * One document as the engine consumes it.
 * Pixel modes: fixed (widthPx & heightPx), range (min/max*Px, widthPx/heightPx null), or
 * KB-only (no pixels). `maxKB: null` only with `toVerify` on the preset document.
 */
export interface DocSpecData {
  doc: DocType;
  label: LocalizedText;
  widthPx: number | null;
  heightPx: number | null;
  minWidthPx?: number;
  maxWidthPx?: number;
  minHeightPx?: number;
  maxHeightPx?: number;
  /** 1 KB = 1024 B. null = no minimum. */
  minKB: number | null;
  maxKB: number | null;
  format: OutputFormat;
  /** Explicit crop aspect (w/h) when there are no fixed pixels. */
  aspect?: number;
  /** DPI written to the JFIF header; null = 200 if `physical`, else encoder default. */
  dpi: number | null;
  fileName: string;
  maxFileNameChars?: number;
  rules: LocalizedText[];
  needsNameDateStrip?: boolean;
  cleanup?: 'signature' | 'thumb' | null;
  physical?: PhysicalSize;
  /** widthPx/heightPx were derived from `physical` at `dpi` (default 200). */
  pxDerived?: boolean;
}

/** A preset document: DocSpec plus UI-only fields (never sent to the engine). */
export interface PresetDocument extends DocSpecData {
  /** Route/storage key when an exam has two docs of the same type ("signature-hindi"). */
  slug?: string;
  /** "≈472×157 px, derived from 6.0×2.0 cm at 200 DPI" or "Notice says X, portal accepts Y". */
  sizeNote?: LocalizedText;
  disputed?: boolean;
  /** Value not yet confirmed from the official notice: never stated as a fact. */
  toVerify?: boolean;
  variant?: 'dual-language' | 'triple' | null;
  captureTip?: LocalizedText;
  /** Only some candidates need it. */
  optional?: boolean;
  appliesTo?: LocalizedText;
}

/**
 * A photo the notice asks candidates to print and bring (e.g. NEET's 4×6 inch postcard photo on
 * the admit-card proforma). Never uploaded, so it has no KB or pixel limits and is not in the kit.
 */
export interface PrintPhoto {
  slug: PrintPhotoSlug;
  label: LocalizedText;
  /** Printed size from the notice. */
  physical: PhysicalSize;
  /** What the notice says to do with it ("Pasted on the proforma at the exam centre"). */
  use: LocalizedText;
  /** How many prints the notice advises keeping. */
  count?: LocalizedText;
  rules: LocalizedText[];
  /** Page of the preset's notification (sourceUrl) that states it. */
  sourcePage: number | null;
}

export interface RejectionTip {
  /** Real portal error message, verbatim. */
  error: string;
  fix: LocalizedText;
}

export interface FaqItem {
  q: LocalizedText;
  a: LocalizedText;
}

export interface ExtraSource {
  label: string;
  url: string;
}

/**
 * Application window from the cited notice (YYYY-MM-DD). Drives the "Form open / Closed"
 * status pill and the generated last-date FAQ, so no page shows a past deadline as current.
 */
export interface ApplyWindow {
  opens: string;
  closes: string;
  /** Late submission (with late fee) ends. */
  lateUntil?: string;
  /** Correction / edit window ends. */
  correctionUntil?: string;
  /** Where the dates come from, e.g. "CEN 06/2026, page 2". */
  source: string;
}

export interface ExamPreset {
  slug: string;
  name: LocalizedText;
  aliases: string[];
  /** Conducting body in text only ("IBPS"); never logos. */
  body: string;
  group: ExamGroup;
  cycle: string;
  notification: string;
  sourceUrl: string;
  sourcePage: number | null;
  extraSources?: ExtraSource[];
  /** YYYY-MM-DD */
  lastChecked: string;
  checkedBy: string;
  /** A live photo is captured in the form in addition to any upload. */
  liveCaptureAlso: boolean;
  /** Photo is captured live INSTEAD of uploaded (SSC/RRB): no photo document. */
  photoUploadReplacedByLive: boolean;
  seasonMonths: number[];
  documents: PresetDocument[];
  declarationText?: { en: string; hi?: string; toVerify?: boolean };
  rejectionTips: RejectionTip[];
  faq: FaqItem[];
  related: string[];
  published: boolean;
  confidence: Confidence;
  liveCaptureTips?: LocalizedText[];
  applyWindow?: ApplyWindow;
  /** Printed (not uploaded) photos the notice asks for; each gets its own page. */
  printPhotos?: PrintPhoto[];
}

export interface Season {
  /** Popular-exams grid order. Unknown or hidden slugs are skipped. */
  order: string[];
  updated: string;
}
