'use client';
/**
 * Upload control (SPEC K3, 5.3): "Take photo" (camera via `capture`), "Choose from
 * gallery", and a drag-and-drop zone on wider screens. Accepts JPG, PNG, WebP,
 * HEIC/HEIF and (optionally) PDF up to 25 MB. Prewarms the engine on pointerenter/focus.
 * Reusable by tool islands (F).
 */
import { useRef, useState } from 'react';
import type { ChangeEvent, DragEvent as ReactDragEvent } from 'react';
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

/** What the picker takes: images, PDFs only, or both. */
export type UploadAccept = 'image' | 'pdf' | 'image+pdf';

const acceptOf = (a: boolean | UploadAccept): UploadAccept =>
  typeof a === 'boolean' ? (a ? 'image+pdf' : 'image') : a;

/** `accept` attribute; takes the legacy allowPdf boolean or an UploadAccept. */
export function acceptAttr(accept: boolean | UploadAccept): string {
  const a = acceptOf(accept);
  const list: string[] = a === 'pdf' ? [] : [...ACCEPTED_IMAGE_TYPES, ...ACCEPTED_IMAGE_EXT];
  if (a !== 'image') list.push(...ACCEPTED_PDF_TYPES, '.pdf');
  return list.join(',');
}

export function isPdf(file: Blob & { name?: string }): boolean {
  return file.type === 'application/pdf' || /\.pdf$/i.test(file.name ?? '');
}

/** Type and size guard. Uses the extension when the browser gives no MIME (common for HEIC). */
export function validateFile(
  file: File,
  accept: boolean | UploadAccept = true,
): UploadError | null {
  const a = acceptOf(accept);
  if (file.size > MAX_UPLOAD_BYTES) {
    return {
      code: 'TOO_LARGE_INPUT',
      details: { sizeMB: formatMB(file.size), maxMB: MAX_UPLOAD_BYTES / (1024 * 1024) },
    };
  }
  const type = file.type.toLowerCase();
  const ext = `.${file.name.split('.').pop()?.toLowerCase() ?? ''}`;
  const imageOk =
    a !== 'pdf' &&
    ((ACCEPTED_IMAGE_TYPES as readonly string[]).includes(type) ||
      (ACCEPTED_IMAGE_EXT as readonly string[]).includes(ext));
  const pdfOk = a !== 'image' && isPdf(file);
  if (!imageOk && !pdfOk) {
    return { code: 'UNSUPPORTED_TYPE', details: { type: type || ext } };
  }
  return null;
}

/** Message for a rejected file; the unsupported-type text names only what is accepted. */
export function uploadErrorText(t: T, err: UploadError, accept: UploadAccept): string {
  if (err.code === 'UNSUPPORTED_TYPE') {
    return t(
      accept === 'pdf'
        ? 'ui.uploader.notPdf'
        : accept === 'image'
          ? 'ui.uploader.notImage'
          : 'ui.uploader.notImageOrPdf',
    );
  }
  return t(`common.errors.${err.code}`, err.details);
}

export interface UploaderProps {
  t: T;
  onFiles: (files: File[]) => void;
  /** Accept PDFs (certificate step; page 1 for image documents). Default true. */
  allowPdf?: boolean;
  /**
   * Override what is accepted ('image' | 'pdf' | 'image+pdf'); wins over `allowPdf`.
   * Narrows the gallery picker, the hint text and validation. 'pdf' hides "Take photo".
   */
  accept?: UploadAccept;
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
  /**
   * The first button is the screen's saffron primary action. Default true. Pass false when
   * the screen already has a primary action (e.g. "Make PDF" after pages are added).
   */
  primary?: boolean;
}

export function Uploader({
  t,
  onFiles,
  allowPdf = true,
  accept: acceptProp,
  multiple = false,
  capture = 'environment',
  tip,
  onReject,
  busy = false,
  showTrust = true,
  primary = true,
}: UploaderProps) {
  const accept: UploadAccept = acceptProp ?? acceptOf(allowPdf);
  const showCamera = capture !== false && accept !== 'pdf';
  const camRef = useRef<HTMLInputElement>(null);
  const galRef = useRef<HTMLInputElement>(null);
  const [error, setError] = useState<string | null>(null);
  const [drag, setDrag] = useState(false);

  const take = (list: FileList | null | undefined) => {
    if (!list || !list.length) return;
    const ok: File[] = [];
    let firstErr: UploadError | null = null;
    for (const f of Array.from(list)) {
      const err = validateFile(f, accept);
      if (err) {
        firstErr ??= err;
        onReject?.(err);
      } else ok.push(f);
      if (!multiple && (ok.length || firstErr)) break;
    }
    setError(firstErr ? uploadErrorText(t, firstErr, accept) : null);
    if (ok.length) onFiles(multiple ? ok : ok.slice(0, 1));
  };

  const onChange = (e: ChangeEvent<HTMLInputElement>) => {
    take(e.currentTarget.files);
    e.currentTarget.value = ''; // allow picking the same file again
  };

  const onDrop = (e: ReactDragEvent<HTMLElement>) => {
    e.preventDefault();
    setDrag(false);
    if (!busy) take(e.dataTransfer?.files);
  };

  return (
    <div
      className="space-y-3"
      onPointerEnter={prewarmEngine}
      onFocusCapture={prewarmEngine}
      onDragOver={(e) => {
        e.preventDefault();
        if (!drag) setDrag(true);
      }}
      onDragLeave={() => setDrag(false)}
      onDrop={onDrop}
    >
      {tip && <p className="rounded-card bg-bg p-3 text-sm">{tip}</p>}
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
        {showCamera && (
          <button
            type="button"
            className={buttonClass(primary ? 'primary' : 'secondary', true, 'min-h-[56px] text-lg')}
            disabled={busy}
            onClick={() => camRef.current?.click()}
          >
            <Camera size={22} aria-hidden="true" />
            {t('common.actions.takePhoto')}
          </button>
        )}
        <button
          type="button"
          className={buttonClass(
            showCamera || !primary ? 'secondary' : 'primary',
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
        className={`hidden min-h-[96px] flex-col items-center justify-center gap-1 rounded-card border-2 border-dashed p-4 text-center text-sm sm:flex ${
          drag ? 'border-primary bg-bg text-primary' : 'border-border-strong text-muted'
        }`}
        aria-hidden="true"
      >
        <Upload size={22} />
        <span>{drag ? t('ui.uploader.dropActive') : t('ui.uploader.drop')}</span>
      </div>
      <p className="text-sm text-muted">
        {t(
          accept === 'pdf'
            ? 'ui.uploader.acceptedPdfOnly'
            : accept === 'image+pdf'
              ? 'ui.uploader.acceptedPdf'
              : 'ui.uploader.accepted',
        )}
      </p>
      {error && (
        <p role="alert" className="rounded-card border border-error p-3 text-sm text-error-text">
          {error}
        </p>
      )}
      {showTrust && <TrustLine text={t('common.trustLine')} />}
      <input
        ref={camRef}
        type="file"
        accept="image/*"
        capture={capture || undefined}
        className="sr-only"
        tabIndex={-1}
        aria-hidden="true"
        onChange={onChange}
      />
      <input
        ref={galRef}
        type="file"
        accept={acceptAttr(accept)}
        multiple={multiple}
        className="sr-only"
        tabIndex={-1}
        aria-hidden="true"
        data-testid="gallery-input"
        onChange={onChange}
      />
    </div>
  );
}
