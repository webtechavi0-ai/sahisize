/**
 * Internal-link helpers for exam pages (SPEC 9.1): which tools are relevant to an
 * exam's documents, and localized exam/kit hrefs.
 */
import { COMPRESS_KB_TARGETS, compressToKbPath, type ToolSlug } from '@/config/tools';
import type { ExamPreset, PresetDocument } from '@/content/presets/schema';

/** Smallest compress-to-N page that is >= maxKB (e.g. 50 KB -> /tools/compress-image-to-50kb). */
export function compressPageFor(maxKB: number | null): string | null {
  if (maxKB === null) return null;
  const n = COMPRESS_KB_TARGETS.find((x) => x >= maxKB);
  return n ? compressToKbPath(n) : null;
}

export interface ToolLink {
  slug: ToolSlug;
  path: string;
  /** For compress-to-N links. */
  kb?: number;
}

/** Tools relevant to a document type. */
export function toolsForDoc(d: Pick<PresetDocument, 'doc' | 'maxKB' | 'format'>): ToolLink[] {
  const out: ToolLink[] = [];
  switch (d.doc) {
    case 'photo': {
      const c = compressPageFor(d.maxKB);
      if (c) out.push({ slug: 'compress-image', path: c, kb: Number(c.match(/(\d+)kb$/)![1]) });
      out.push({ slug: 'resize-image', path: '/tools/resize-image' });
      break;
    }
    case 'signature':
      out.push({ slug: 'signature-resize', path: '/tools/signature-resize' });
      break;
    case 'thumb':
      out.push({ slug: 'thumb-impression', path: '/tools/thumb-impression' });
      break;
    case 'declaration':
      out.push({ slug: 'handwritten-declaration', path: '/tools/handwritten-declaration' });
      break;
    case 'certificate':
      out.push({ slug: 'images-to-pdf', path: '/tools/images-to-pdf' });
      out.push({ slug: 'compress-pdf', path: '/tools/compress-pdf' });
      break;
    default:
      out.push({ slug: 'compress-image', path: '/tools/compress-image' });
  }
  return out;
}

/** Unique tool links for a whole exam, preserving document order. */
export function toolsForExam(p: Pick<ExamPreset, 'documents'>): ToolLink[] {
  const seen = new Set<string>();
  const out: ToolLink[] = [];
  for (const d of p.documents) {
    for (const t of toolsForDoc(d)) {
      if (seen.has(t.path)) continue;
      seen.add(t.path);
      out.push(t);
    }
  }
  return out;
}
