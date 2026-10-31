/**
 * Domain enumerations shared by the preset schema, the engine and the UI.
 */

/** Document types an exam can ask for. */
export const DOC_TYPES = ['photo', 'signature', 'thumb', 'declaration', 'certificate', 'other'] as const;
export type DocType = (typeof DOC_TYPES)[number];

/** Exam groups (search intents, monetization rules, /exams chips). */
export const EXAM_GROUPS = [
  'banking',
  'ssc',
  'railway',
  'nta',
  'upsc',
  'teaching',
  'police',
  'state-psc',
  'defence',
  'other',
] as const;
export type ExamGroup = (typeof EXAM_GROUPS)[number];

/** Researcher confidence in a preset's values. 'L' presets are never published. */
export const CONFIDENCE_LEVELS = ['H', 'M', 'L', 'H/M', 'M/L'] as const;
export type Confidence = (typeof CONFIDENCE_LEVELS)[number];

/** Output encodings. `pdf` only for `doc: 'certificate'`. */
export const OUTPUT_FORMATS = ['jpg', 'png', 'pdf'] as const;
export type OutputFormat = (typeof OUTPUT_FORMATS)[number];

export const PHYSICAL_UNITS = ['cm', 'mm', 'in'] as const;
export type PhysicalUnit = (typeof PHYSICAL_UNITS)[number];

/** Default DPI used when deriving px from a physical size. */
export const DEFAULT_DERIVE_DPI = 200;

/** 1 KB = 1024 bytes everywhere in the product. */
export const KB = 1024;
