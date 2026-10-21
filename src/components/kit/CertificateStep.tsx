/**
 * K14 certificate step: collect images and/or PDFs (pages in order) to combine into one
 * PDF under the preset KB cap. The parent runs imagesToPdf and the pass check.
 */
import type { Lang } from '@/config/site';
import { Trash2 } from '@/components/ui/Icon';
import { Button } from '@/components/ui/Button';
import { formatKB, kbRangeText, loc, type T } from '@/lib/format';
import type { KitDoc } from './kit-types';
import { Uploader, type UploadError } from './Uploader';

interface Props {
  t: T;
  lang: Lang;
  doc: KitDoc;
  files: Blob[];
  onAdd: (files: File[]) => void;
  onRemove: (index: number) => void;
  onReject?: (err: UploadError) => void;
  busy?: boolean;
}

export const MAX_CERT_FILES = 20;

export function CertificateStep({ t, lang, doc, files, onAdd, onRemove, onReject, busy }: Props) {
  return (
    <div class="space-y-4">
      <p>{t('kit.certificate.body', { range: kbRangeText(t, doc.spec.minKB, doc.spec.maxKB) })}</p>
      {files.length > 0 && (
        <ol class="space-y-2" aria-label={t('kit.certificate.listLabel')}>
          {files.map((f, i) => (
            <li key={i} class="card flex items-center gap-3 p-3">
              <span class="flex-1 text-sm">
                <span class="font-semibold">{t('kit.certificate.page', { n: i + 1 })}</span>
                <span class="text-muted">
                  {' '}
                  · {f.type === 'application/pdf' ? 'PDF' : t('kit.certificate.image')} ·{' '}
                  {formatKB(f.size)}
                </span>
              </span>
              <Button
                variant="ghost"
                onClick={() => onRemove(i)}
                aria-label={t('kit.certificate.remove', { n: i + 1 })}
                disabled={busy}
              >
                <Trash2 size={18} aria-hidden="true" />
              </Button>
            </li>
          ))}
        </ol>
      )}
      {files.length < MAX_CERT_FILES && (
        <Uploader
          t={t}
          multiple
          allowPdf
          capture="environment"
          tip={doc.captureTip ? loc(doc.captureTip, lang) : undefined}
          onFiles={onAdd}
          onReject={onReject}
          busy={busy}
        />
      )}
    </div>
  );
}
