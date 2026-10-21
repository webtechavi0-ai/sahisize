/**
 * Exam search (SPEC K1, 6.1, 6.2). ARIA combobox over the slim search index, typo
 * tolerant, Hindi/English, grouped by conducting body. Hidden exams show "coming soon".
 * Without JS it is a plain GET form to the exams page (`?q=`).
 *
 * Mount (Workstream C):
 *   <ExamSearch client:idle index={getSearchIndex()} lang={lang}
 *               dict={getNamespace(lang, 'common', 'ui')} variant="hero"
 *               hiSlugs={hiTopExams} examsHref={localizePath('/exams', lang)} />
 * `variant="header"` collapses to an icon button under 640 px (SPEC 6.1).
 */
import { useEffect, useId, useMemo, useRef, useState } from 'preact/hooks';
import type { Lang } from '@/config/site';
import { createT, plural, type Dict } from '@/i18n/core';
import { track } from '@/lib/analytics';
import { groupByBody, search, type SearchEntry } from '@/lib/search';
import { Search, X } from '@/components/ui/Icon';

export interface ExamSearchProps {
  index: SearchEntry[];
  lang: Lang;
  /** getNamespace(lang, 'common', 'ui') */
  dict: Dict;
  variant?: 'header' | 'hero';
  /** Slugs that have a Hindi exam page (/hi/exam/[slug]); others link to English. */
  hiSlugs?: string[];
  /** No-JS fallback form action. Default '/exams'. */
  examsHref?: string;
}

export function examHref(slug: string, lang: Lang, hiSlugs: readonly string[] = []): string {
  return lang === 'hi' && hiSlugs.includes(slug) ? `/hi/exam/${slug}` : `/exam/${slug}`;
}

export default function ExamSearch({
  index,
  lang,
  dict,
  variant = 'hero',
  hiSlugs = [],
  examsHref = '/exams',
}: ExamSearchProps) {
  const t = useMemo(() => createT(dict), [dict]);
  const id = useId();
  const [q, setQ] = useState('');
  const [open, setOpen] = useState(false);
  const [active, setActive] = useState(0);
  const [expanded, setExpanded] = useState(variant === 'hero');
  const inputRef = useRef<HTMLInputElement>(null);
  const rootRef = useRef<HTMLDivElement>(null);

  const hits = useMemo(() => (q.trim() ? search(q, index, 10) : []), [q, index]);
  const groups = useMemo(() => groupByBody(hits), [hits]);
  const flat = groups.flatMap((g) => g.hits);
  const label = (e: SearchEntry) => (lang === 'hi' ? e.hi : e.en);

  useEffect(() => {
    const onDoc = (e: MouseEvent) => {
      if (rootRef.current && !rootRef.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener('mousedown', onDoc);
    return () => document.removeEventListener('mousedown', onDoc);
  }, []);

  const choose = (e: SearchEntry | undefined) => {
    if (!e || !e.published) return;
    track('exam_selected', { exam: e.slug, source: 'search' });
    setOpen(false);
    window.location.assign(examHref(e.slug, lang, hiSlugs));
  };

  const onKeyDown = (e: KeyboardEvent) => {
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setOpen(true);
      setActive((a) => Math.min(flat.length - 1, a + 1));
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setActive((a) => Math.max(0, a - 1));
    } else if (e.key === 'Enter') {
      const hit = flat[active];
      if (open && hit) {
        e.preventDefault();
        choose(hit.entry);
      }
    } else if (e.key === 'Escape') {
      if (open) setOpen(false);
      else if (variant === 'header') setExpanded(false);
    }
  };

  const optId = (i: number) => `${id}-opt-${i}`;
  const showList = open && q.trim().length > 0;
  const hero = variant === 'hero';

  // Phone header: the expanded search covers the whole header row (full width).
  const overlay = !hero && expanded;
  return (
    <div
      ref={rootRef}
      class={`relative ${hero ? 'w-full' : ''} ${
        overlay
          ? 'max-sm:absolute max-sm:inset-0 max-sm:z-40 max-sm:flex max-sm:items-center max-sm:gap-1 max-sm:bg-card max-sm:px-4'
          : ''
      }`}
    >
      {!hero && (
        <button
          type="button"
          class={`inline-flex h-tap w-tap items-center justify-center rounded-card text-primary hover:bg-bg sm:hidden ${
            expanded ? 'hidden' : ''
          }`}
          aria-label={t('ui.search.open')}
          aria-expanded={expanded}
          onClick={() => {
            setExpanded(true);
            setTimeout(() => inputRef.current?.focus(), 0);
          }}
        >
          <Search size={22} aria-hidden="true" />
        </button>
      )}
      <form
        role="search"
        action={examsHref}
        method="get"
        class={`${hero || expanded ? 'flex' : 'hidden sm:flex'} ${overlay ? 'max-sm:min-w-0 max-sm:flex-1' : ''} items-center gap-2 rounded-xl border border-rule-strong bg-card px-3 focus-within:outline focus-within:outline-[3px] focus-within:outline-offset-2 focus-within:outline-ink ${hero ? 'shadow-lift' : ''}`}
        onSubmit={(e) => {
          const hit = flat[active] ?? flat[0];
          if (hit?.entry.published) {
            e.preventDefault();
            choose(hit.entry);
          }
        }}
      >
        <Search size={20} aria-hidden="true" class="shrink-0 text-muted" />
        <label for={`${id}-in`} class="sr-only">
          {t('ui.search.label')}
        </label>
        <input
          ref={inputRef}
          id={`${id}-in`}
          name="q"
          type="search"
          autocomplete="off"
          spellcheck={false}
          enterKeyHint="search"
          class={`min-w-0 flex-1 bg-transparent outline-none ${hero ? 'min-h-[56px] text-lg' : 'min-h-tap'}`}
          placeholder={t('ui.search.placeholder')}
          role="combobox"
          aria-autocomplete="list"
          aria-expanded={showList}
          aria-controls={`${id}-list`}
          aria-activedescendant={showList && flat[active] ? optId(active) : undefined}
          value={q}
          onInput={(e) => {
            setQ(e.currentTarget.value);
            setActive(0);
            setOpen(true);
          }}
          onFocus={() => setOpen(true)}
          onKeyDown={onKeyDown}
        />
        {q && (
          <button
            type="button"
            class="inline-flex h-tap w-tap shrink-0 items-center justify-center text-muted"
            aria-label={t('ui.search.clear')}
            onClick={() => {
              setQ('');
              inputRef.current?.focus();
            }}
          >
            <X size={18} aria-hidden="true" />
          </button>
        )}
      </form>
      {overlay && (
        <button
          type="button"
          class="inline-flex h-tap w-tap shrink-0 items-center justify-center rounded-xl text-ink hover:bg-paper sm:hidden"
          aria-label={t('common.actions.close')}
          onClick={() => {
            setOpen(false);
            setExpanded(false);
          }}
        >
          <X size={22} aria-hidden="true" />
        </button>
      )}
      <div
        class={`${showList ? '' : 'hidden'} absolute left-0 right-0 z-30 mt-1 max-h-[60vh] overflow-auto rounded-card border border-border bg-surface shadow-lg ${
          hero ? '' : 'sm:w-80'} ${overlay ? 'max-sm:top-full' : ''
        }`}
      >
        <ul id={`${id}-list`} role="listbox" aria-label={t('ui.search.label')}>
          {groups.map((g) => (
            <li key={g.body} role="presentation">
              <p
                class="px-3 pt-2 text-xs font-semibold uppercase tracking-wide text-muted"
                aria-hidden="true"
              >
                {g.body}
              </p>
              <ul role="group" aria-label={g.body}>
                {g.hits.map((h) => {
                  const i = flat.indexOf(h);
                  const e = h.entry;
                  return (
                    <li
                      key={e.slug}
                      id={optId(i)}
                      role="option"
                      aria-selected={i === active}
                      aria-disabled={!e.published || undefined}
                      class={`flex min-h-tap cursor-pointer items-center px-3 ${i === active ? 'bg-bg' : ''} ${
                        e.published ? '' : 'cursor-default text-muted'
                      }`}
                      onMouseEnter={() => setActive(i)}
                      onMouseDown={(ev) => {
                        ev.preventDefault();
                        choose(e);
                      }}
                    >
                      {e.published ? label(e) : t('ui.search.comingSoon', { exam: label(e) })}
                    </li>
                  );
                })}
              </ul>
            </li>
          ))}
        </ul>
        {hits.length === 0 && (
          <p class="p-3 text-sm text-muted">{t('ui.search.noResults', { q: q.trim() })}</p>
        )}
      </div>
      <p class="sr-only" role="status" aria-live="polite">
        {showList
          ? plural(t, 'ui.search.resultsCount', hits.filter((h) => h.entry.published).length)
          : ''}
      </p>
    </div>
  );
}
