/** Summary of all outputs: thumbnail, file name, KB, px, tick, download/redo (SPEC K10). */
import type { Lang } from '@/config/site';
import { CircleCheck, Download, RefreshCw } from '@/components/ui/Icon';
import { Button } from '@/components/ui/Button';
import { formatKB, loc, pxText, type T } from '@/lib/format';
import type { DocOutput } from '@/lib/kit-store';
import type { KitDoc } from './kit-types';
import { DocIcon } from './DocIcon';
import { useObjectUrl } from './useObjectUrl';

export interface SummaryItem {
  doc: KitDoc;
  output?: DocOutput;
}

interface Props {
  t: T;
  lang: Lang;
  items: SummaryItem[];
  onDownload: (doc: KitDoc) => void;
  onRedo: (doc: KitDoc) => void;
}

function Thumb({ output, alt }: { output: DocOutput; alt: string }) {
  const url = useObjectUrl(output.blob.type === 'application/pdf' ? null : output.blob);
  if (!url) {
    return (
      <span class="flex h-16 w-16 shrink-0 items-center justify-center rounded-card bg-bg text-muted">
        <DocIcon doc="certificate" />
      </span>
    );
  }
  return (
    <img
      src={url}
      alt={alt}
      width={output.w}
      height={output.h}
      class="h-16 w-16 shrink-0 rounded-card border border-border bg-white object-contain"
    />
  );
}

export function SummaryGrid({ t, lang, items, onDownload, onRedo }: Props) {
  return (
    <ul class="grid grid-cols-1 gap-3 sm:grid-cols-2">
      {items.map(({ doc, output }) => {
        const name = loc(doc.spec.label, lang);
        return (
          <li key={doc.key} class="card flex flex-col gap-3 p-4" data-doc={doc.key}>
            <div class="flex items-center gap-3">
              {output ? (
                <Thumb output={output} alt={t('ui.preview.alt', { doc: name })} />
              ) : (
                <span class="flex h-16 w-16 shrink-0 items-center justify-center rounded-card bg-bg text-muted">
                  <DocIcon doc={doc.spec.doc} />
                </span>
              )}
              <div class="min-w-0 flex-1">
                <p class="font-semibold">{name}</p>
                <p class="text-sm text-muted">{doc.spec.fileName}</p>
                {output ? (
                  <p class="flex items-center gap-1 text-sm tabular-nums text-success-text">
                    <CircleCheck size={16} aria-hidden="true" class="text-success" />
                    {formatKB(output.sizeBytes)}
                    {output.w > 0 && ` · ${pxText(t, output.w, output.h)}`}
                  </p>
                ) : (
                  <p class="text-sm text-error-text">{t('kit.summary.notDone')}</p>
                )}
              </div>
            </div>
            <div class="grid grid-cols-2 gap-2">
              {output && (
                <Button
                  onClick={() => onDownload(doc)}
                  aria-label={t('kit.summary.downloadOne', { doc: name })}
                >
                  <Download size={18} aria-hidden="true" />
                  {t('common.actions.download')}
                </Button>
              )}
              <Button
                variant="ghost"
                onClick={() => onRedo(doc)}
                aria-label={t('kit.summary.redoOne', { doc: name })}
              >
                <RefreshCw size={18} aria-hidden="true" />
                {output ? t('kit.summary.redo') : t('kit.summary.start')}
              </Button>
            </div>
          </li>
        );
      })}
    </ul>
  );
}
