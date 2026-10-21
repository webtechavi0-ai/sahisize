/**
 * Upload area for single-image tools: the shared Uploader (with trust line) until a file
 * is picked, a skeleton while it decodes, then a compact "your file" row with a
 * "Use a different file" button. Errors are shown in plain words with the numbers.
 */
import { Uploader } from '@/components/kit/Uploader';
import { errorMessage } from '@/components/kit/errors';
import { TrustLine } from '@/components/kit/TrustLine';
import { Button } from '@/components/ui/Button';
import { RefreshCw } from '@/components/ui/Icon';
import { Skeleton } from '@/components/ui/Skeleton';
import { formatKB, type T } from '@/lib/format';
import type { ToolImage } from './useToolImage';

export function SourceBar({
  t,
  image,
  loading,
  error,
  onFile,
  onReset,
  allowPdf = false,
  capture = 'environment',
  tip,
}: {
  t: T;
  image: ToolImage | null;
  loading: boolean;
  error: unknown;
  onFile: (f: File) => void;
  onReset: () => void;
  allowPdf?: boolean;
  capture?: 'user' | 'environment' | false;
  tip?: string;
}) {
  const err = error ? (
    <p role="alert" class="rounded-card border border-error p-3 text-sm text-error-text">
      {errorMessage(t, error)}
    </p>
  ) : null;
  if (loading) {
    return (
      <div class="card space-y-3 p-4">
        <Skeleton class="h-6 w-1/2" label={t('tool.common.opening')} />
        <Skeleton class="h-24 w-full" />
      </div>
    );
  }
  if (!image) {
    return (
      <div class="card space-y-3 p-4">
        <Uploader
          t={t}
          allowPdf={allowPdf}
          capture={capture}
          tip={tip}
          onFiles={(fs) => fs[0] && onFile(fs[0])}
        />
        {err}
      </div>
    );
  }
  return (
    <div class="card flex flex-wrap items-center gap-3 p-4">
      <img
        src={image.src}
        alt={t('tool.common.yourFile')}
        width={56}
        height={56}
        class="h-14 w-14 shrink-0 rounded-card border border-border object-cover"
      />
      <div class="min-w-0 flex-1 text-sm">
        <p class="font-semibold">{t('tool.common.yourFile')}</p>
        <p class="tabular-nums text-muted">
          {t('common.units.px', { w: image.img.width, h: image.img.height })} · {formatKB(image.file.size)}
        </p>
        <TrustLine text={t('common.trustLine')} class="mt-1" />
      </div>
      <Button onClick={onReset}>
        <RefreshCw size={18} aria-hidden="true" />
        <span class="text-sm">{t('tool.common.changeFile')}</span>
      </Button>
      {err && <div class="w-full">{err}</div>}
    </div>
  );
}
