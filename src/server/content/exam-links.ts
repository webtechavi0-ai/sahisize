import 'server-only';
/**
 * Internal links from exam pages to the tools relevant to each document.
 */
import { compressToKbPath, type ToolSlug } from '@/config/tools';
import type { Lang } from '@/i18n/config';
import type { ExamPreset, PresetDocument } from '@/lib/presets';
import { compressTargetFor } from '@/lib/tool-pages';
import { localHref } from './hindi';

export interface ToolLinkRef {
  slug: ToolSlug;
  /** English path. */
  path: string;
  /** For compress-to-N links. */
  kb?: number;
}

/** Tools relevant to a document type. */
export function toolsForDoc(d: Pick<PresetDocument, 'doc' | 'maxKB'>): ToolLinkRef[] {
  switch (d.doc) {
    case 'photo': {
      const kb = compressTargetFor(d.maxKB);
      return [
        ...(kb ? [{ slug: 'compress-image' as const, path: compressToKbPath(kb), kb }] : []),
        { slug: 'resize-image', path: '/tools/resize-image' },
      ];
    }
    case 'signature':
      return [{ slug: 'signature-resize', path: '/tools/signature-resize' }];
    case 'thumb':
      return [{ slug: 'thumb-impression', path: '/tools/thumb-impression' }];
    case 'declaration':
      return [{ slug: 'handwritten-declaration', path: '/tools/handwritten-declaration' }];
    case 'certificate':
      return [
        { slug: 'images-to-pdf', path: '/tools/images-to-pdf' },
        { slug: 'compress-pdf', path: '/tools/compress-pdf' },
      ];
    default:
      return [{ slug: 'compress-image', path: '/tools/compress-image' }];
  }
}

/** Unique tool links for a whole exam, in document order. */
export function toolsForExam(p: Pick<ExamPreset, 'documents'>): ToolLinkRef[] {
  const seen = new Set<string>();
  const out: ToolLinkRef[] = [];
  for (const d of p.documents)
    for (const t of toolsForDoc(d)) {
      if (seen.has(t.path)) continue;
      seen.add(t.path);
      out.push(t);
    }
  return out;
}

/** toolsForExam with hrefs localized for `lang`. */
export function localizedToolsForExam(p: Pick<ExamPreset, 'documents'>, lang: Lang): (ToolLinkRef & { href: string })[] {
  return toolsForExam(p).map((t) => ({ ...t, href: localHref(t.path, lang) }));
}
