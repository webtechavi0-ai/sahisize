/**
 * Internal links on Hindi pages (SEO): point at the /hi/ counterpart of a route when that
 * page exists, else keep the English URL. `localizePath` (src/i18n) prefixes blindly;
 * this checks that the Hindi route is actually built.
 *
 *   localHref('/exam/ibps-po', 'hi')   -> '/hi/exam/ibps-po'   (in hi-top-exams)
 *   localHref('/exam/ibps-so', 'hi')   -> '/exam/ibps-so'      (no Hindi page)
 *   localHref('/report', 'hi')         -> '/report'            (English only)
 *   localHref('/tools/resize-image#x', 'hi') -> '/hi/tools/resize-image#x'
 *
 * Build-time only (reads src/pages/hi and src/content/guides/hi from disk, like
 * hindiToolPages in ./hreflang). Not for islands.
 */
import type * as NodeFs from 'node:fs';
import type * as NodePath from 'node:path';
import type { Lang } from '@/config/site';
import { getKitDocuments, getPreset } from '@/content/presets';
import { hindiExamSlugs, hindiToolPath } from './hreflang';

function node(): { fs: typeof NodeFs; path: typeof NodePath } | null {
  try {
    const fs = globalThis.process?.getBuiltinModule?.('node:fs') as typeof NodeFs | undefined;
    const path = globalThis.process?.getBuiltinModule?.('node:path') as typeof NodePath | undefined;
    return fs && path ? { fs, path } : null;
  } catch {
    return null;
  }
}

/** A static (non-[param]) page file under src/pages/hi for this English path. */
function hasStaticHiPage(enPath: string): boolean {
  const n = node();
  if (!n) return false;
  const base = n.path.join(process.cwd(), 'src/pages/hi', enPath === '/' ? '' : enPath);
  return (
    (enPath !== '/' && n.fs.existsSync(`${base}.astro`)) || n.fs.existsSync(n.path.join(base, 'index.astro'))
  );
}

let hiGuides: Set<string> | null = null;
/** Slugs of published Hindi guides (src/content/guides/hi/*.mdx without `draft: true`). */
export function hindiGuideSlugs(): Set<string> {
  if (hiGuides) return hiGuides;
  const out = new Set<string>();
  const n = node();
  if (n) {
    const dir = n.path.join(process.cwd(), 'src/content/guides/hi');
    if (n.fs.existsSync(dir)) {
      for (const f of n.fs.readdirSync(dir)) {
        if (!f.endsWith('.mdx')) continue;
        const src = n.fs.readFileSync(n.path.join(dir, f), 'utf8');
        const fm = /^---\n([\s\S]*?)\n---/.exec(src)?.[1] ?? '';
        if (/^draft:\s*true\s*$/m.test(fm)) continue;
        const slug = /^slug:\s*['"]?([a-z0-9-]+)['"]?\s*$/m.exec(fm)?.[1];
        if (slug) out.add(slug);
      }
    }
  }
  hiGuides = out;
  return out;
}

/** The Hindi path for an English site path when that Hindi page exists, else null. */
export function hindiPathFor(enPath: string): string | null {
  const p = enPath.replace(/(.)\/$/, '$1') || '/';
  if (p === '/hi' || p.startsWith('/hi/')) return p;
  let m: RegExpExecArray | null;
  if ((m = /^\/exam\/([a-z0-9-]+)$/.exec(p))) return hindiExamSlugs().includes(m[1]!) ? `/hi${p}` : null;
  if ((m = /^\/kit\/([a-z0-9-]+)$/.exec(p))) {
    const preset = getPreset(m[1]!);
    const ok = !!preset && hindiExamSlugs().includes(m[1]!) && getKitDocuments(preset).length > 0;
    return ok ? `/hi${p}` : null;
  }
  if ((m = /^\/guides\/([a-z0-9-]+)$/.exec(p))) return hindiGuideSlugs().has(m[1]!) ? `/hi${p}` : null;
  if (p === '/tools' || p.startsWith('/tools/')) return hindiToolPath(p);
  if (hasStaticHiPage(p)) return p === '/' ? '/hi' : `/hi${p}`;
  return null;
}

/**
 * The href to use on a page in `lang` for an English site path. On Hindi pages: the /hi/
 * counterpart when it exists, else the English path. On English pages: unchanged.
 * Query strings and #hashes are kept.
 */
export function localHref(enPath: string, lang: Lang): string {
  if (lang !== 'hi') return enPath;
  const m = /^([^?#]*)(.*)$/.exec(enPath)!;
  const hi = hindiPathFor(m[1] || '/');
  return (hi ?? m[1]) + (m[2] ?? '');
}

/** True when `href` on a Hindi page is an English URL whose /hi/ page exists. */
export function isMissedHindiLink(href: string): boolean {
  const path = href.split(/[?#]/)[0] ?? '';
  if (!path.startsWith('/') || path === '/hi' || path.startsWith('/hi/')) return false;
  return hindiPathFor(path) !== null;
}
