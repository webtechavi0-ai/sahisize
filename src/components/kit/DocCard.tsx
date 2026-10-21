/**
 * Checklist card (SPEC K2, 6.4): icon, name, rule summary in plain words, status.
 * The whole card is one button (>= 48 px).
 */
import type { Lang } from '@/config/site';
import { Check, ChevronRight } from '@/components/ui/Icon';
import { formatKB, loc, ruleSummary, type T } from '@/lib/format';
import type { DocStatus } from '@/lib/kit-store';
import type { KitDoc } from './kit-types';
import { DocIcon } from './DocIcon';

interface Props {
  t: T;
  lang: Lang;
  doc: KitDoc;
  status: DocStatus;
  /** Output size when done. */
  sizeBytes?: number;
  stale?: boolean;
  onOpen: () => void;
}

export function DocCard({ t, lang, doc, status, sizeBytes, stale, onOpen }: Props) {
  const name = loc(doc.spec.label, lang);
  const statusText =
    status === 'done'
      ? t('common.status.done')
      : status === 'in-progress'
        ? t('common.status.inProgress')
        : t('common.status.todo');
  return (
    <button
      type="button"
      onClick={onOpen}
      class="card flex min-h-[72px] w-full items-center gap-3 p-4 text-left hover:border-border-strong"
      data-doc={doc.key}
    >
      <span
        class={`flex h-tap w-tap shrink-0 items-center justify-center rounded-full ${
          status === 'done' ? 'bg-success/15 text-success-text' : 'bg-bg text-primary'
        }`}
      >
        {status === 'done' ? (
          <Check size={24} aria-hidden="true" />
        ) : (
          <DocIcon doc={doc.spec.doc} />
        )}
      </span>
      <span class="min-w-0 flex-1">
        <span class="block font-semibold">
          {name}
          {doc.optional && (
            <span class="ml-2 text-sm font-normal text-muted">({t('kit.checklist.optional')})</span>
          )}
        </span>
        <span class="block text-sm text-muted">{ruleSummary(t, doc.spec)}</span>
        {doc.optional && doc.appliesTo && (
          <span class="block text-sm text-muted">{loc(doc.appliesTo, lang)}</span>
        )}
        {stale && <span class="block text-sm text-error-text">{t('kit.checklist.staleDoc')}</span>}
      </span>
      <span class="flex shrink-0 flex-col items-end gap-1 text-sm">
        <span class={status === 'done' ? 'font-semibold text-success-text' : 'text-muted'}>
          {statusText}
        </span>
        {status === 'done' && sizeBytes !== undefined && (
          <span class="tabular-nums text-muted">{formatKB(sizeBytes)}</span>
        )}
      </span>
      <ChevronRight size={20} aria-hidden="true" class="shrink-0 text-muted" />
    </button>
  );
}
