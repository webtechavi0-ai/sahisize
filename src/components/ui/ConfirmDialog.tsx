import { useEffect, useId, useRef } from 'preact/hooks';
import { Button } from './Button';

interface Props {
  open: boolean;
  title: string;
  body: string;
  confirmLabel: string;
  cancelLabel: string;
  onConfirm: () => void;
  onCancel: () => void;
  danger?: boolean;
}

/**
 * The only modal in the product (SPEC 6.1: confirm "Start over?").
 * Focus moves to Cancel on open, Tab is trapped, Escape cancels, focus returns on close.
 */
export function ConfirmDialog({
  open,
  title,
  body,
  confirmLabel,
  cancelLabel,
  onConfirm,
  onCancel,
  danger = true,
}: Props) {
  const id = useId();
  const boxRef = useRef<HTMLDivElement>(null);
  const cancelRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const prev = document.activeElement as HTMLElement | null;
    cancelRef.current?.querySelector('button')?.focus();
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        e.preventDefault();
        onCancel();
      } else if (e.key === 'Tab' && boxRef.current) {
        const f = [...boxRef.current.querySelectorAll<HTMLElement>('button:not([disabled])')];
        if (!f.length) return;
        const first = f[0]!;
        const last = f[f.length - 1]!;
        if (e.shiftKey && document.activeElement === first) {
          e.preventDefault();
          last.focus();
        } else if (!e.shiftKey && document.activeElement === last) {
          e.preventDefault();
          first.focus();
        }
      }
    };
    document.addEventListener('keydown', onKey);
    return () => {
      document.removeEventListener('keydown', onKey);
      prev?.focus?.();
    };
  }, [open, onCancel]);

  if (!open) return null;
  return (
    <div class="fixed inset-0 z-50 flex items-end justify-center bg-scrim/60 p-4 sm:items-center">
      <div
        ref={boxRef}
        role="alertdialog"
        aria-modal="true"
        aria-labelledby={`${id}-t`}
        aria-describedby={`${id}-b`}
        class="card w-full max-w-sm p-5"
      >
        <h2 id={`${id}-t`} class="text-lg font-bold">
          {title}
        </h2>
        <p id={`${id}-b`} class="mt-2 text-muted">
          {body}
        </p>
        <div class="mt-5 flex flex-col-reverse gap-3 sm:flex-row sm:justify-end">
          <div ref={cancelRef} class="contents">
            <Button variant="secondary" onClick={onCancel}>
              {cancelLabel}
            </Button>
          </div>
          <Button variant={danger ? 'danger' : 'primary'} onClick={onConfirm}>
            {confirmLabel}
          </Button>
        </div>
      </div>
    </div>
  );
}
