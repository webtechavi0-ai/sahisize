'use client';
import type { KeyboardEvent as ReactKeyboardEvent } from 'react';
/**
 * Site search (SPEC K1, 6.1, 6.2). ARIA combobox over exams, tools, other documents and
 * guides, grouped by kind. Understands everyday words ("bank", "railway", "पुलिस",
 * "photo 20kb", "pdf"; see lib/intents) and typos. Hidden exams show "coming soon".
 *
 * Phones (< 640 px): focusing the box (hero) or tapping the search icon (header) opens a
 * full-screen panel: input on top, results right under it so they stay above the on-screen
 * keyboard, a back arrow that closes it, and the browser Back button closes it too.
 * Focused and empty: recent picks and popular exams/tools. No match: Custom size and
 * "Tell us your exam".
 *
 * Without JS it is a plain GET form to the exams page (`?q=`), which filters the list.
 */
import { useEffect, useId, useMemo, useRef, useState } from 'react';
import type { Lang } from '@/config/site';
import { createT, plural, type Dict } from '@/i18n/core';
import { track } from '@/lib/analytics';
import type { SearchEntry } from '@/lib/search';
import { kbPath, siteSearch, type ExamEntry, type Hit, type SiteSearchData } from '@/lib/site-search';
import type { OtherDocSearchEntry } from '@/config/other-docs';
import {
  ArrowLeft,
  BookOpen,
  FileText,
  Fingerprint,
  GraduationCap,
  History,
  IdCard,
  MessageSquarePlus,
  PenLine,
  Ruler,
  Search,
  Shrink,
  TrendingUp,
  Wrench,
  X,
  type LucideIcon,
} from 'lucide-react';

export interface ExamSearchProps {
  /** Full site-search data (src/lib/nav-data.ts). */
  data?: SiteSearchData;
  /** Exams only (older mount and unit tests); used when `data` is absent. */
  index?: SearchEntry[];
  /** Non-exam entries (PAN, passport size, Aadhaar note...); used when `data` is absent. */
  docs?: OtherDocSearchEntry[];
  lang: Lang;
  /** getNamespace(lang, 'common', 'ui') */
  dict: Dict;
  variant?: 'header' | 'hero';
  /** Slugs that have a Hindi exam page (/hi/exam/[slug]); others link to English. */
  hiSlugs?: string[];
  /** No-JS fallback form action. Default '/exams'. */
  examsHref?: string;
  /** Popular exam slugs shown when the box is focused and empty. */
  popular?: string[];
  customHref?: string;
  reportHref?: string;
  /** Overrides the default "Search your exam" placeholder. */
  placeholder?: string;
}

type IconT = LucideIcon;

interface Opt {
  key: string;
  href: string;
  name: string;
  sub?: string;
  tag?: string;
  icon: IconT;
  disabled?: boolean;
  /** Analytics + recent list. */
  kind: 'exam' | 'tool' | 'doc' | 'guide' | 'action' | 'recent';
  slug?: string;
}

interface Section {
  id: string;
  title: string;
  icon: IconT;
  opts: Opt[];
  /** Extra line under the title (empty state). */
  note?: string;
}

interface Recent {
  key: string;
  href: string;
  name: string;
  sub?: string;
}

const RECENT_KEY = 'sahisize:recent-search';
const PHONE = '(max-width: 639px)';

export function examHref(slug: string, lang: Lang, hiSlugs: readonly string[] = []): string {
  return lang === 'hi' && hiSlugs.includes(slug) ? `/hi/exam/${slug}` : `/exam/${slug}`;
}

function readRecent(): Recent[] {
  try {
    const v = JSON.parse(localStorage.getItem(RECENT_KEY) ?? '[]');
    return Array.isArray(v) ? (v as Recent[]).filter((r) => r && r.href && r.name).slice(0, 4) : [];
  } catch {
    return [];
  }
}

function saveRecent(r: Recent): void {
  try {
    const list = [r, ...readRecent().filter((x) => x.href !== r.href)].slice(0, 4);
    localStorage.setItem(RECENT_KEY, JSON.stringify(list));
  } catch {
    /* private mode: no recent list */
  }
}

const TOOL_ICON: Record<string, IconT> = {
  kb: Shrink,
  size: Ruler,
  signature: PenLine,
  documents: Fingerprint,
  pdf: FileText,
  govtId: IdCard,
};

export default function ExamSearch({
  data: dataProp,
  index = [],
  docs = [],
  lang,
  dict,
  variant = 'hero',
  hiSlugs = [],
  examsHref = '/exams',
  popular = [],
  customHref = '/tools/custom-preset',
  reportHref = '/report',
  placeholder,
}: ExamSearchProps) {
  const t = useMemo(() => createT(dict), [dict]);
  const data: SiteSearchData = useMemo(
    () =>
      dataProp ?? {
        exams: index,
        tools: [],
        docs,
        guides: [],
        kb: { img: [], pdf: [], jpgPdf: [], hi: [] },
        rank: [],
      },
    [dataProp, index, docs],
  );
  const id = useId();
  const [q, setQ] = useState('');
  const [open, setOpen] = useState(false);
  const [active, setActive] = useState(0);
  const [overlay, setOverlay] = useState(false);
  const [recent, setRecent] = useState<Recent[]>([]);
  const [vh, setVh] = useState<number | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const rootRef = useRef<HTMLDivElement>(null);
  const formRef = useRef<HTMLFormElement>(null);
  const pushed = useRef(false);
  const hero = variant === 'hero';

  const name = (e: { en: string; hi: string }) => (lang === 'hi' ? e.hi : e.en);
  const docLabel = (d: string) => t(`ui.search.doc.${d}`);
  const hiPath = (en: string, hasHi: boolean) => (lang === 'hi' && hasHi ? `/hi${en}` : en);

  const examOpt = (e: ExamEntry, doc: string | null): Opt => {
    const docs = (e.docs ?? []).map(docLabel);
    const docsText = docs.length ? docs.join(', ').replace(/^./, (c) => c.toUpperCase()) : '';
    const sub = doc ? t('ui.search.docPage', { doc: docLabel(doc) }) : [e.body, docsText].filter(Boolean).join(' · ');
    // Document pages are English only; on Hindi pages keep the Hindi exam page.
    const href = doc && lang === 'en' ? `/exam/${e.slug}/${doc}` : examHref(e.slug, lang, hiSlugs);
    return {
      key: `exam:${e.slug}:${doc ?? ''}`,
      href,
      name: doc && lang === 'en' ? `${name(e)} · ${docLabel(doc)}` : name(e),
      sub,
      tag: e.published ? undefined : t('ui.search.comingSoonTag'),
      icon: GraduationCap,
      disabled: !e.published,
      kind: 'exam',
      slug: e.slug,
    };
  };

  const hitOpt = (h: Hit): Opt => {
    switch (h.kind) {
      case 'exam':
        return examOpt(h.entry, h.doc);
      case 'kb': {
        const k = h.type === 'img' ? 'Img' : h.type === 'pdf' ? 'Pdf' : 'JpgPdf';
        const hasHi = data.kb.hi.includes(h.path);
        return {
          key: `kb:${h.path}`,
          href: hiPath(h.path, hasHi),
          name: t(`ui.search.kb${k}`, { n: h.n }),
          sub: t(`ui.search.kb${k}Desc`, { n: h.n }),
          tag: lang === 'hi' && !hasHi ? t('ui.search.english') : undefined,
          icon: h.type === 'img' ? Shrink : FileText,
          kind: 'tool',
        };
      }
      case 'tool': {
        const e = h.entry;
        const href = lang === 'hi' && e.href.hi ? e.href.hi : e.href.en;
        const camel = e.id.replace(/-([a-z0-9])/g, (_, c: string) => c.toUpperCase());
        return {
          key: `tool:${e.id}`,
          href,
          name: name(e),
          sub: t(`ui.search.toolDesc.${camel}`),
          tag: lang === 'hi' && !e.href.hi ? t('ui.search.english') : undefined,
          icon: TOOL_ICON[e.cat] ?? Wrench,
          kind: 'tool',
        };
      }
      case 'doc':
        return {
          key: `doc:${h.entry.id}`,
          href: h.entry.href[lang],
          name: name(h.entry),
          sub: h.entry.note?.[lang],
          icon: IdCard,
          kind: 'doc',
        };
      case 'guide':
        return {
          key: `guide:${h.entry.id}`,
          href: h.entry.href,
          name: h.entry.en,
          sub: t('ui.search.guideDesc'),
          icon: BookOpen,
          kind: 'guide',
        };
    }
  };

  const groupMeta: Record<string, { title: string; icon: IconT }> = {
    exam: { title: t('ui.search.exams'), icon: GraduationCap },
    tool: { title: t('ui.search.tools'), icon: Wrench },
    doc: { title: t('ui.search.otherDocs'), icon: IdCard },
    guide: { title: t('ui.search.guides'), icon: BookOpen },
  };

  const query = q.trim();
  const groups = useMemo(() => (query ? siteSearch(query, data) : []), [query, data]);

  const sections: Section[] = useMemo(() => {
    if (query) {
      if (groups.length) {
        return groups.map((g) => ({ id: g.kind, ...groupMeta[g.kind]!, opts: g.hits.map(hitOpt) }));
      }
      return [
        {
          id: 'none',
          title: t('ui.search.cantFind'),
          icon: Search,
          note: t('ui.search.noMatch', { q: query }),
          opts: [
            { key: 'act:custom', href: customHref, name: t('ui.search.useCustom'), sub: t('ui.search.useCustomDesc'), icon: Ruler, kind: 'action' },
            {
              key: 'act:report',
              href: `${reportHref}?exam=${encodeURIComponent(query)}`,
              name: t('ui.search.tellUs'),
              sub: t('ui.search.tellUsDesc'),
              icon: MessageSquarePlus,
              kind: 'action',
            },
          ],
        },
      ];
    }
    const out: Section[] = [];
    if (recent.length)
      out.push({
        id: 'recent',
        title: t('ui.search.recent'),
        icon: History,
        opts: recent.map((r) => ({ key: `recent:${r.href}`, href: r.href, name: r.name, sub: r.sub, icon: History, kind: 'recent' })),
      });
    const pop = popular
      .map((s) => data.exams.find((e) => e.slug === s))
      .filter((e): e is ExamEntry => !!e && e.published)
      .slice(0, recent.length ? 3 : 5)
      .map((e) => examOpt(e, null));
    if (pop.length) out.push({ id: 'popular', title: t('ui.search.popular'), icon: TrendingUp, opts: pop });
    const tools: Opt[] = [];
    if (data.kb.img.includes(20)) tools.push(hitOpt({ kind: 'kb', n: 20, type: 'img', path: kbPath('img', 20), score: 0 }));
    for (const tid of ['signature-resize', 'compress-pdf']) {
      const e = data.tools.find((x) => x.id === tid);
      if (e) tools.push(hitOpt({ kind: 'tool', entry: e, score: 0 }));
    }
    if (tools.length) out.push({ id: 'popular-tools', title: t('ui.search.popularTools'), icon: Wrench, opts: tools });
    return out;
  }, [query, groups, recent, popular, data, lang]);

  const flat = sections.flatMap((s) => s.opts);
  const emptyState = !!query && groups.length === 0;
  const showList = open && (sections.length > 0 || overlay);
  // No match: nothing is pre-selected, so Enter does not jump to "Custom size".
  useEffect(() => setActive(emptyState ? -1 : 0), [emptyState, query]);

  // Phone full-screen panel: lock page scroll, follow the visual viewport (keyboard),
  // and let the browser Back button close it.
  useEffect(() => {
    if (!overlay) return;
    const html = document.documentElement;
    const prev = html.style.overflow;
    html.style.overflow = 'hidden';
    const vv = window.visualViewport;
    const fit = () => setVh(vv ? Math.round(vv.height) : null);
    fit();
    vv?.addEventListener('resize', fit);
    const onPop = () => {
      pushed.current = false;
      closeOverlay(false);
    };
    window.addEventListener('popstate', onPop);
    return () => {
      html.style.overflow = prev;
      vv?.removeEventListener('resize', fit);
      window.removeEventListener('popstate', onPop);
    };
  }, [overlay]);

  useEffect(() => {
    const onDoc = (e: MouseEvent) => {
      if (rootRef.current && !rootRef.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener('mousedown', onDoc);
    return () => document.removeEventListener('mousedown', onDoc);
  }, []);

  const isPhone = () => typeof window !== 'undefined' && !!window.matchMedia?.(PHONE).matches;

  function openOverlay() {
    if (overlay || !isPhone()) return;
    setOverlay(true);
    try {
      history.pushState({ ...(history.state ?? {}), sahisizeSearch: true }, '');
      pushed.current = true;
    } catch {
      pushed.current = false;
    }
  }

  function closeOverlay(goBack = true) {
    setOpen(false);
    setOverlay(false);
    setVh(null);
    if (formRef.current) formRef.current.style.display = '';
    if (goBack && pushed.current) {
      pushed.current = false;
      history.back();
    }
  }

  const choose = (o: Opt | undefined) => {
    if (!o || o.disabled) return;
    if (o.kind === 'exam' && o.slug) track('exam_selected', { exam: o.slug, source: 'search' });
    if (o.kind !== 'action' && o.kind !== 'recent') saveRecent({ key: o.key, href: o.href, name: o.name, sub: o.sub });
    setOpen(false);
    window.location.assign(o.href);
  };

  const onFocus = () => {
    setRecent(readRecent());
    setOpen(true);
    if (hero) openOverlay();
  };

  const onKeyDown = (e: ReactKeyboardEvent<HTMLElement>) => {
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setOpen(true);
      setActive((a) => Math.min(flat.length - 1, a + 1));
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setActive((a) => Math.max(0, a - 1));
    } else if (e.key === 'Enter') {
      e.preventDefault();
      // Empty state: Enter keeps the suggestions on screen instead of a dead-end page.
      if (emptyState && active < 0) return;
      if (!query && !open) return;
      choose(flat[active] ?? flat[0]);
    } else if (e.key === 'Escape') {
      // Keep the typed text (Chrome clears type=search on Escape); just close the list.
      e.preventDefault();
      if (overlay) closeOverlay();
      else if (open) setOpen(false);
    }
  };

  const optId = (i: number) => `${id}-opt-${i}`;
  const activeOpt = showList && active >= 0 ? flat[active] : undefined;
  const panelStyle = overlay && vh ? { height: `${vh}px` } : undefined;
  const total = flat.length;
  let i = -1;

  return (
    <div
      ref={rootRef}
      data-site-search={variant}
      className={`relative ${hero ? 'w-full min-h-[60px]' : ''}`}
    >
      {!hero && (
        <button
          type="button"
          className="inline-flex h-tap w-tap items-center justify-center rounded-xl text-ink hover:bg-paper sm:hidden"
          aria-label={t('ui.search.open')}
          aria-expanded={overlay}
          onClick={() => {
            // Show and focus synchronously so phones open the keyboard (needs the tap).
            if (formRef.current) formRef.current.style.display = 'flex';
            inputRef.current?.focus();
            setRecent(readRecent());
            setOpen(true);
            if (!overlay) {
              setOverlay(true);
              try {
                history.pushState({ ...(history.state ?? {}), sahisizeSearch: true }, '');
                pushed.current = true;
              } catch {
                pushed.current = false;
              }
            }
          }}
        >
          <Search size={24} aria-hidden="true" />
        </button>
      )}
      <div
        role={overlay ? 'dialog' : undefined}
        aria-modal={overlay ? 'true' : undefined}
        aria-label={overlay ? t('ui.search.label') : undefined}
        style={panelStyle}
        className={
          overlay
            ? 'max-sm:fixed max-sm:inset-x-0 max-sm:top-0 max-sm:z-50 max-sm:flex max-sm:h-[100dvh] max-sm:flex-col max-sm:bg-paper'
            : ''
        }
      >
        <div className={overlay ? 'max-sm:flex max-sm:items-center max-sm:gap-1 max-sm:border-b max-sm:border-rule max-sm:bg-card max-sm:py-2 max-sm:pl-1 max-sm:pr-3' : ''}>
          {overlay && (
            <button
              type="button"
              className="inline-flex h-tap w-tap shrink-0 items-center justify-center rounded-xl text-ink hover:bg-paper sm:hidden"
              aria-label={t('ui.search.close')}
              data-search-close
              onClick={() => closeOverlay()}
            >
              <ArrowLeft size={24} aria-hidden="true" />
            </button>
          )}
          <form
            ref={formRef}
            role="search"
            action={examsHref}
            method="get"
            className={`${hero || overlay ? 'flex' : 'hidden sm:flex'} ${overlay ? 'max-sm:min-w-0 max-sm:flex-1' : ''} ${
              hero ? '' : 'sm:w-64 lg:w-72'
            } items-center gap-2 rounded-xl border-2 border-rule-strong bg-card pl-3 focus-within:border-ink focus-within:outline focus-within:outline-[3px] focus-within:outline-offset-2 focus-within:outline-saffron ${
              hero && !overlay ? 'shadow-lift' : ''
            }`}
            onSubmit={(e) => {
              // With JS, Enter is handled in onKeyDown; never leave for a dead-end page.
              e.preventDefault();
            }}
          >
            <Search size={20} aria-hidden="true" className="shrink-0 text-muted" />
            <label htmlFor={`${id}-in`} className="sr-only">
              {t('ui.search.label')}
            </label>
            <input
              ref={inputRef}
              id={`${id}-in`}
              name="q"
              type="search"
              autoComplete="off"
              spellCheck={false}
              enterKeyHint="search"
              className={`min-w-0 flex-1 bg-transparent text-text outline-none placeholder:text-muted [&::-webkit-search-cancel-button]:hidden ${
                hero ? 'min-h-[56px] text-lg' : 'min-h-tap'
              }`}
              placeholder={placeholder ?? t('ui.search.placeholder')}
              role="combobox"
              aria-autocomplete="list"
              aria-expanded={showList}
              aria-controls={`${id}-list`}
              aria-activedescendant={activeOpt ? optId(active) : undefined}
              aria-describedby={`${id}-hint`}
              value={q}
              onInput={(e) => {
                const v = e.currentTarget.value;
                setQ(v);
                setOpen(true);
              }}
              onFocus={onFocus}
              onClick={() => {
                setOpen(true);
                if (hero) openOverlay();
              }}
              onKeyDown={onKeyDown}
            />
            {q && (
              <button
                type="button"
                className="inline-flex h-tap w-tap shrink-0 items-center justify-center rounded-xl text-muted hover:text-ink"
                aria-label={t('ui.search.clear')}
                onClick={() => {
                  setQ('');
                  setActive(0);
                  setOpen(true);
                  inputRef.current?.focus();
                }}
              >
                <X size={20} aria-hidden="true" />
              </button>
            )}
          </form>
        </div>
        <p id={`${id}-hint`} className="sr-only">
          {t('ui.search.hint')}
        </p>
        <div
          data-search-panel
          className={`${showList ? '' : 'hidden'} ${
            overlay
              ? 'max-sm:static max-sm:mt-0 max-sm:max-h-none max-sm:flex-1 max-sm:overscroll-contain max-sm:rounded-none max-sm:border-0 max-sm:shadow-none'
              : ''
          } absolute left-0 right-0 z-40 mt-2 max-h-[min(70vh,560px)] overflow-auto rounded-card border border-rule bg-card shadow-lift ${
            hero ? '' : 'sm:left-auto sm:w-[26rem]'
          }`}
        >
          {overlay && !query && sections.length === 0 && (
            <p className="p-4 text-muted">{t('ui.search.hint')}</p>
          )}
          <ul id={`${id}-list`} role="listbox" aria-label={t('ui.search.label')} className="py-1">
            {sections.map((s, si) => (
              <li key={s.id} role="presentation" data-search-group={s.id === 'doc' ? 'other-docs' : s.id}>
                <p
                  className={`flex items-center gap-2 px-4 pb-1 pt-3 text-xs font-bold uppercase tracking-wide text-muted ${
                    si > 0 ? 'border-t border-rule' : ''
                  }`}
                  aria-hidden="true"
                >
                  <s.icon size={14} aria-hidden="true" />
                  {s.title}
                </p>
                {s.note && (
                  <p className="px-4 pb-1 text-sm text-text" aria-hidden="true">
                    {s.note}
                  </p>
                )}
                <ul role="group" aria-label={s.title}>
                  {s.opts.map((o) => {
                    i++;
                    const n = i;
                    const Ico = o.icon;
                    const on = n === active;
                    return (
                      <li
                        key={o.key}
                        id={optId(n)}
                        role="option"
                        aria-selected={on}
                        aria-disabled={o.disabled || undefined}
                        data-kind={o.kind}
                        data-other-doc={o.kind === 'doc' ? o.key.slice(4) : undefined}
                        className={`mx-1 flex min-h-[56px] items-center gap-3 rounded-xl px-3 py-2 ${
                          o.disabled ? 'cursor-default' : 'cursor-pointer'
                        } ${on ? 'bg-saffron-soft ring-2 ring-inset ring-ink/60' : ''}`}
                        onMouseEnter={() => setActive(n)}
                        onMouseDown={(ev) => {
                          ev.preventDefault();
                          choose(flat[n]);
                        }}
                      >
                        <span
                          className={`inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-lg ${
                            o.disabled ? 'bg-paper text-muted' : 'bg-paper text-ink'
                          }`}
                          aria-hidden="true"
                        >
                          <Ico size={18} aria-hidden="true" />
                        </span>
                        <span className="min-w-0 flex-1">
                          <span data-name className={`block font-semibold leading-snug ${o.disabled ? 'text-muted' : 'text-ink'}`}>
                            {o.name}
                          </span>
                          {o.sub && <span className="block text-sm leading-snug text-muted">{o.sub}</span>}
                        </span>
                        {o.tag && (
                          <span className="shrink-0 rounded-full border border-rule-strong px-2 py-0.5 text-xs font-semibold text-muted">
                            {o.tag}
                          </span>
                        )}
                      </li>
                    );
                  })}
                </ul>
              </li>
            ))}
          </ul>
        </div>
      </div>
      <p className="sr-only" role="status" aria-live="polite">
        {showList && query
          ? emptyState
            ? t('ui.search.noMatch', { q: query })
            : plural(t, 'ui.search.totalCount', total)
          : ''}
      </p>
    </div>
  );
}
