/**
 * Upload control (SPEC K3, 5.3): "Take photo" (camera via `capture`), "Choose from
 * gallery", and a drag-and-drop zone on wider screens. Accepts JPG, PNG, WebP,
 * HEIC/HEIF and (optionally) PDF up to 25 MB. Prewarms the engine on pointerenter/focus.
 * Reusable by tool islands (F).
 */
import { useRef, useState } from 'preact/hooks';
import type { JSX } from 'preact';
import {
  ACCEPTED_IMAGE_EXT,
  ACCEPTED_IMAGE_TYPES,
  ACCEPTED_PDF_TYPES,
  MAX_UPLOAD_BYTES,
} from '@/config/site';
import { Camera, ImageIcon, Upload } from '@/components/ui/Icon';
import { buttonClass } from '@/components/ui/Button';
import { formatMB, type T } from '@/lib/format';
import { TrustLine } from './TrustLine';
import { prewarmEngine } from './engine';

export type UploadErrorCode = 'TOO_LARGE_INPUT' | 'UNSUPPORTED_TYPE';

export interface UploadError {
  code: UploadErrorCode;
  details: Record<string, string | number>;
}

export function acceptAttr(allowPdf: boolean): string {
  const list: string[] = [...ACCEPTED_IMAGE_TYPES, ...ACCEPTED_IMAGE_EXT];
  if (allowPdf) list.push(...ACCEPTED_PDF_TYPES, '.pdf');
  return list.join(',');
}

export function isPdf(file: Blob & { name?: string }): boolean {
  return file.type === 'application/pdf' || /\.pdf$/i.test(file.name ?? '');
}

/** Type and size guard. Uses the extension when the browser gives no MIME (common for HEIC). */
export function validateFile(file: File, allowPdf = true): UploadError | null {
  if (file.size > MAX_UPLOAD_BYTES) {
    return {
      code: 'TOO_LARGE_INPUT',
      details: { sizeMB: formatMB(file.size), maxMB: MAX_UPLOAD_BYTES / (1024 * 1024) },
    };
  }
  const type = file.type.toLowerCase();
  const ext = `.${file.name.split('.').pop()?.toLowerCase() ?? ''}`;
  const imageOk =
    (ACCEPTED_IMAGE_TYPES as readonly string[]).includes(type) ||
    (ACCEPTED_IMAGE_EXT as readonly string[]).includes(ext);
  const pdfOk = allowPdf && isPdf(file);
  if (!imageOk && !pdfOk) {
    return { code: 'UNSUPPORTED_TYPE', details: { type: type || ext } };
  }
  return null;
}

export interface UploaderProps {
  t: T;
  onFiles: (files: File[]) => void;
  /** Accept PDFs (certificate step; page 1 for image documents). Default true. */
  allowPdf?: boolean;
  multiple?: boolean;
  /** Camera for "Take photo": 'user' (front) or 'environment' (back). false hides the button. */
  capture?: 'user' | 'environment' | false;
  /** Short tip for this document, shown above the buttons. */
  tip?: string;
  /** Called for rejected files (for analytics `error`). */
  onReject?: (err: UploadError) => void;
  busy?: boolean;
  /** Trust line under the control (SPEC 5.3). Default true. */
  showTrust?: boolean;
}

export function Uploader({
  t,
  onFiles,
  allowPdf = true,
  multiple = false,
  capture = 'environment',
  tip,
  onReject,
  busy = false,
  showTrust = true,
}: UploaderProps) {
  const camRef = useRef<HTMLInputElement>(null);
  const galRef = useRef<HTMLInputElement>(null);
  const [error, setError] = useState<string | null>(null);
  const [drag, setDrag] = useState(false);

  const take = (list: FileList | null | undefined) => {
    if (!list || !list.length) return;
    const ok: File[] = [];
    let firstErr: UploadError | null = null;
    for (const f of Array.from(list)) {
      const err = validateFile(f, allowPdf);
      if (err) {
        firstErr ??= err;
        onReject?.(err);
      } else ok.push(f);
      if (!multiple && (ok.length || firstErr)) break;
    }
    setError(firstErr ? t(`common.errors.${firstErr.code}`, firstErr.details) : null);
    if (ok.length) onFiles(multiple ? ok : ok.slice(0, 1));
  };

  const onChange = (e: JSX.TargetedEvent<HTMLInputElement>) => {
    take(e.currentTarget.files);
    e.currentTarget.value = ''; // allow picking the same file again
  };

  const onDrop = (e: DragEvent) => {
    e.preventDefault();
    setDrag(false);
    if (!busy) take(e.dataTransfer?.files);
  };

  return (
    <div
      class="space-y-3"
      onPointerEnter={prewarmEngine}
      onFocusCapture={prewarmEngine}
      onDragOver={(e) => {
        e.preventDefault();
        if (!drag) setDrag(true);
      }}
      onDragLeave={() => setDrag(false)}
      onDrop={onDrop}
    >
      {tip && <p class="rounded-card bg-bg p-3 text-sm">{tip}</p>}
      <div class="grid grid-cols-1 gap-3 sm:grid-cols-2">
        {capture !== false && (
          <button
            type="button"
            class={buttonClass('primary', true, 'min-h-[56px] text-lg')}
            disabled={busy}
            onClick={() => camRef.current?.click()}
          >
            <Camera size={22} aria-hidden="true" />
            {t('common.actions.takePhoto')}
          </button>
        )}
        <button
          type="button"
          class={buttonClass(
            capture === false ? 'primary' : 'secondary',
            true,
            'min-h-[56px] text-lg',
          )}
          disabled={busy}
          onClick={() => galRef.current?.click()}
        >
          <ImageIcon size={22} aria-hidden="true" />
          {t('common.actions.chooseFromGallery')}
        </button>
      </div>
      <div
        class={`hidden min-h-[96px] flex-col items-center justify-center gap-1 rounded-card border-2 border-dashed p-4 text-center text-sm sm:flex ${
          drag ? 'border-primary bg-bg text-primary' : 'border-border-strong text-muted'
        }`}
        aria-hidden="true"
      >
        <Upload size={22} />
        <span>{drag ? t('ui.uploader.dropActive') : t('ui.uploader.drop')}</span>
      </div>
      <p class="text-sm text-muted">
        {t(allowPdf ? 'ui.uploader.acceptedPdf' : 'ui.uploader.accepted')}
      </p>
      {error && (
        <p role="alert" class="rounded-card border border-error p-3 text-sm text-error-text">
          {error}
        </p>
      )}
      {showTrust && <TrustLine text={t('common.trustLine')} />}
      <input
        ref={camRef}
        type="file"
        accept="image/*"
        capture={capture || undefined}
        class="sr-only"
        tabIndex={-1}
        aria-hidden="true"
        onChange={onChange}
      />
      <input
        ref={galRef}
        type="file"
        accept={acceptAttr(allowPdf)}
        multiple={multiple}
        class="sr-only"
        tabIndex={-1}
        aria-hidden="true"
        data-testid="gallery-input"
        onChange={onChange}
      />
    </div>
  );
}
