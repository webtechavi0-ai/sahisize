/**
 * Ordered list of input files for T6 (and T9): thumbnail, page number, size, remove.
 * Reorder by drag and drop (desktop), with the Up/Down buttons (touch), or from the
 * keyboard: focus a row's number (drag handle) and press Alt+ArrowUp / Alt+ArrowDown. Moves are announced.
 */
import { useEffect, useMemo, useRef, useState } from 'preact/hooks';
import { ChevronLeft, ChevronRight, FileText, Trash2 } from '@/components/ui/Icon';
import { formatKB, type T } from '@/lib/format';
import { moveItem } from './logic';

export interface ListItem {
  id: string;
  file: File;
}

function useThumbs(items: readonly ListItem[]) {
  const urls = useRef(new Map<string, string>());
  const [, force] = useState(0);
  useEffect(() => {
    const keep = new Set(items.map((i) => i.id));
    let changed = false;
    for (const [id, u] of urls.current) {
      if (!keep.has(id)) {
        URL.revokeObjectURL(u);
        urls.current.delete(id);
        changed = true;
      }
    }
    for (const it of items) {
      if (!urls.current.has(it.id) && /^image\/(jpeg|png|webp)$/.test(it.file.type) && typeof URL.createObjectURL === 'function') {
        urls.current.set(it.id, URL.createObjectURL(it.file));
        changed = true;
      }
    }
    if (changed) force((n) => n + 1);
  }, [items]);
  useEffect(
    () => () => {
      for (const u of urls.current.values()) URL.revokeObjectURL(u);
      urls.current.clear();
    },
    [],
  );
  return urls.current;
}

export function ImageList({
  t,
  items,
  onChange,
  label,
  disabled,
}: {
  t: T;
  items: readonly ListItem[];
  onChange: (next: ListItem[]) => void;
  label: string;
  disabled?: boolean;
}) {
  const thumbs = useThumbs(items);
  const [drag, setDrag] = useState<number | null>(null);
  const [msg, setMsg] = useState('');
  const rowRefs = useRef<(HTMLButtonElement | null)[]>([]);
  const ids = useMemo(() => items.map((i) => i.id).join(','), [items]);
  const pendingFocus = useRef<string | null>(null);

  useEffect(() => {
    if (!pendingFocus.current) return;
    const idx = items.findIndex((i) => i.id === pendingFocus.current);
    pendingFocus.current = null;
    rowRefs.current[idx]?.focus();
  }, [ids]);

  const move = (from: number, to: number, focus = false) => {
    if (disabled || to < 0 || to >= items.length || from === to) return;
    const it = items[from]!;
    if (focus) pendingFocus.current = it.id;
    onChange(moveItem(items, from, to));
    setMsg(t('tool.list.moved', { n: to + 1, total: items.length }));
  };

  return (
    <div>
      <p id="imagelist-help" class="text-sm text-muted">
        {t('tool.list.help')}
      </p>
      <ol class="mt-2 space-y-2" aria-label={label} aria-describedby="imagelist-help">
        {items.map((it, i) => {
          const url = thumbs.get(it.id);
          return (
            <li
              key={it.id}
              draggable={!disabled}
              onDragStart={(e) => {
                setDrag(i);
                e.dataTransfer?.setData('text/plain', String(i));
                if (e.dataTransfer) e.dataTransfer.effectAllowed = 'move';
              }}
              onDragOver={(e) => e.preventDefault()}
              onDrop={(e) => {
                e.preventDefault();
                const from = drag ?? Number(e.dataTransfer?.getData('text/plain'));
                if (Number.isInteger(from)) move(from, i);
                setDrag(null);
              }}
              onDragEnd={() => setDrag(null)}
              class={`flex items-center gap-3 rounded-card border bg-surface p-2 ${
                drag === i ? 'border-primary opacity-60' : 'border-border'
              } ${disabled ? '' : 'cursor-grab'}`}
            >
              <button
                type="button"
                data-handle
                ref={(el) => {
                  rowRefs.current[i] = el;
                }}
                class="inline-flex h-tap w-8 shrink-0 cursor-grab items-center justify-center rounded-card text-sm font-bold tabular-nums"
                aria-label={t('tool.list.row', { n: i + 1, total: items.length })}
                aria-describedby="imagelist-help"
                onKeyDown={(e) => {
                  if (!e.altKey) return;
                  if (e.key === 'ArrowUp') {
                    e.preventDefault();
                    move(i, i - 1, true);
                  } else if (e.key === 'ArrowDown') {
                    e.preventDefault();
                    move(i, i + 1, true);
                  }
                }}
              >
                {i + 1}
              </button>
              {url ? (
                <img src={url} alt="" width={48} height={48} class="h-12 w-12 shrink-0 rounded border border-border object-cover" />
              ) : (
                <span class="flex h-12 w-12 shrink-0 items-center justify-center rounded border border-border text-muted">
                  <FileText size={22} aria-hidden="true" />
                </span>
              )}
              <span class="min-w-0 flex-1 text-sm">
                <span class="block truncate font-semibold">{it.file.name || t('tool.list.file', { n: i + 1 })}</span>
                <span class="block tabular-nums text-muted">{formatKB(it.file.size)}</span>
              </span>
              <span class="flex shrink-0 gap-1">
                <button
                  type="button"
                  class="inline-flex h-tap w-tap items-center justify-center rounded-card border border-border-strong disabled:opacity-40"
                  aria-label={t('tool.list.up', { n: i + 1 })}
                  disabled={disabled || i === 0}
                  onClick={() => move(i, i - 1)}
                >
                  <ChevronLeft size={20} aria-hidden="true" class="rotate-90" />
                </button>
                <button
                  type="button"
                  class="inline-flex h-tap w-tap items-center justify-center rounded-card border border-border-strong disabled:opacity-40"
                  aria-label={t('tool.list.down', { n: i + 1 })}
                  disabled={disabled || i === items.length - 1}
                  onClick={() => move(i, i + 1)}
                >
                  <ChevronRight size={20} aria-hidden="true" class="rotate-90" />
                </button>
                <button
                  type="button"
                  class="inline-flex h-tap w-tap items-center justify-center rounded-card border border-error text-error-text disabled:opacity-40"
                  aria-label={t('tool.list.remove', { n: i + 1 })}
                  disabled={disabled}
                  onClick={() => {
                    onChange(items.filter((_, j) => j !== i));
                    setMsg(t('tool.list.removed', { n: i + 1 }));
                  }}
                >
                  <Trash2 size={18} aria-hidden="true" />
                </button>
              </span>
            </li>
          );
        })}
      </ol>
      <p class="sr-only" role="status" aria-live="polite">
        {msg}
      </p>
    </div>
  );
}
