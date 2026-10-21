/**
 * hreflang pairs (SPEC 9.1, PLAN 3.11): en-IN <-> hi-IN, emitted ONLY when the
 * counterpart page exists. x-default always points at the English page.
 */
import { absoluteUrl } from '@/config/site';
import hiTopExams from '@/i18n/hi-top-exams.json';
import { getPublishedPresets } from '@/content/presets';
import type * as NodeFs from 'node:fs';
import type * as NodePath from 'node:path';

export interface Alternates {
  /** English path, e.g. "/exam/ibps-po". */
  en: string;
  /** Hindi path, e.g. "/hi/exam/ibps-po", or null when there is no Hindi page. */
  hi: string | null;
}

export interface HreflangLink {
  hreflang: 'en-IN' | 'hi-IN' | 'x-default';
  href: string;
}

export function hreflangLinks(alt: Alternates): HreflangLink[] {
  if (!alt.hi) return [];
  return [
    { hreflang: 'en-IN', href: absoluteUrl(alt.en) },
    { hreflang: 'hi-IN', href: absoluteUrl(alt.hi) },
    { hreflang: 'x-default', href: absoluteUrl(alt.en) },
  ];
}

/**
 * Exams that get a Hindi page: hi-top-exams.json filtered to existing published
 * presets, in that file's order.
 */
export function hindiExamSlugs(): string[] {
  const pub = new Set(getPublishedPresets().map((p) => p.slug));
  return (hiTopExams as string[]).filter((s) => pub.has(s));
}

export function hasHindiExam(slug: string): boolean {
  return hindiExamSlugs().includes(slug);
}

/**
 * Hindi tool pages are owned by Workstream F (src/pages/hi/tools/*.astro). We only
 * link to the ones that exist on disk at build time.
 */
let hiToolFiles: Set<string> | null = null;
export function hindiToolPages(): Set<string> {
  if (hiToolFiles) return hiToolFiles;
  const out = new Set<string>();
  try {
    // Build-time only (Node). Dynamic import keeps this out of any client bundle.
    const fs = globalThis.process?.getBuiltinModule?.('node:fs') as typeof NodeFs | undefined;
    const path = globalThis.process?.getBuiltinModule?.('node:path') as typeof NodePath | undefined;
    if (fs && path) {
      const dir = path.join(process.cwd(), 'src/pages/hi/tools');
      if (fs.existsSync(dir)) {
        for (const f of fs.readdirSync(dir)) {
          if (f.endsWith('.astro')) out.add(f.replace(/\.astro$/, ''));
        }
      }
    }
  } catch {
    /* not in Node: no Hindi tool pages known */
  }
  hiToolFiles = out;
  return out;
}

/** Hindi counterpart of an English tool path, or null. */
export function hindiToolPath(enPath: string): string | null {
  const name = enPath.replace(/^\/tools\/?/, '') || 'index';
  const files = hindiToolPages();
  if (files.has(name)) return `/hi${enPath === '/tools' ? '/tools' : enPath}`;
  if (/^compress-image-to-\d+kb$/.test(name) && files.has('compress-image-to-[n]kb'))
    return `/hi${enPath}`;
  return null;
}

/**
 * Hindi counterpart for the static English routes C owns. Exam, kit and guide pages
 * pass their own alternates (they know their slug sets).
 */
export function staticAlternates(enPath: string): Alternates {
  const withHindi = new Set(['/', '/exams', '/guides']);
  if (withHindi.has(enPath)) return { en: enPath, hi: enPath === '/' ? '/hi' : `/hi${enPath}` };
  if (enPath.startsWith('/tools')) return { en: enPath, hi: hindiToolPath(enPath) };
  return { en: enPath, hi: null };
}
