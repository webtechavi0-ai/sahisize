/**
 * Client filter for /exams: text query (from ?q= or the input) plus a group chip.
 * Matching is forgiving: lowercase, punctuation/space-insensitive, every query token
 * must appear in the card's search text (names en/hi, body, aliases, slug).
 * Everyday words work too (lib/intents): "bank po" keeps the banking POs, "police bharti"
 * the police exams, "रेलवे" the RRB exams; noise words ("form", "bharti") are ignored.
 */
import { parseQuery } from '@/lib/intents';

export function normalize(s: string): string {
  return s
    .toLowerCase()
    .normalize('NFC')
    .replace(/[़ँ]/g, '') // Devanagari nukta, chandrabindu
    .replace(/[^\p{L}\p{N}\s]/gu, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

export function matches(haystack: string, query: string): boolean {
  const q = normalize(query);
  if (!q) return true;
  const h = normalize(haystack);
  const compact = h.replace(/\s/g, '');
  return q.split(' ').every((tok) => h.includes(tok) || compact.includes(tok));
}

/** Every query word starts a word of the haystack ("po" matches "PO", not "sPOrts"). */
function wordsMatch(haystack: string, query: string): boolean {
  const words = normalize(haystack).split(' ');
  return normalize(query)
    .split(' ')
    .every((q) => words.some((w) => w.startsWith(q)));
}

/** Card match with intents: group/slug words narrow, the remaining words must match. */
export function cardMatches(card: { search: string; group: string; slug: string }, query: string): boolean {
  if (!normalize(query)) return true;
  if (matches(card.search, query)) return true;
  const p = parseQuery(query);
  if (p.examIntent) {
    const inIntent = p.groups.has(card.group as never) || p.slugs.has(card.slug);
    return inIntent && (!p.rest || wordsMatch(card.search, p.rest));
  }
  return !!p.rest && p.rest !== normalize(query) && matches(card.search, p.rest);
}

export function initExamFilter(): void {
  const root = document.querySelector<HTMLElement>('[data-exam-filter]');
  if (!root) return;
  const input = root.querySelector<HTMLInputElement>('input[name="q"]');
  const form = root.querySelector<HTMLFormElement>('form');
  const chips = [...root.querySelectorAll<HTMLButtonElement>('[data-group-chip]')];
  const cards = [...document.querySelectorAll<HTMLElement>('[data-exam-card]')];
  const sections = [...document.querySelectorAll<HTMLElement>('[data-group-section]')];
  const none = document.querySelector<HTMLElement>('[data-no-results]');
  const count = root.querySelector<HTMLElement>('[data-exam-count]');
  let group = '';

  const params = new URLSearchParams(location.search);
  if (input && params.get('q')) input.value = params.get('q')!;

  function apply(): void {
    const q = input?.value ?? '';
    let shown = 0;
    for (const c of cards) {
      const ok =
        (!group || c.dataset.group === group) &&
        cardMatches({ search: c.dataset.search ?? '', group: c.dataset.group ?? '', slug: c.dataset.examCard ?? '' }, q);
      c.hidden = !ok;
      if (ok) shown++;
    }
    for (const s of sections) s.hidden = !s.querySelector('[data-exam-card]:not([hidden])');
    if (none) none.hidden = shown > 0;
    if (count) count.textContent = String(shown);
  }

  input?.addEventListener('input', apply);
  form?.addEventListener('submit', (e) => {
    e.preventDefault();
    apply();
    const url = new URL(location.href);
    if (input?.value) url.searchParams.set('q', input.value);
    else url.searchParams.delete('q');
    history.replaceState(null, '', url);
  });
  for (const chip of chips) {
    chip.addEventListener('click', () => {
      group = chip.dataset.groupChip ?? '';
      for (const c of chips) c.setAttribute('aria-pressed', String(c === chip));
      apply();
    });
  }
  apply();
}
