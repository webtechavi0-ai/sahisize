/** "Step 2 of 5: Signature" with a progress bar (SPEC K9). */
import { ProgressBar } from '@/components/ui/ProgressBar';
import type { T } from '@/lib/format';

interface Props {
  t: T;
  step: number;
  total: number;
  docName: string;
  done: number;
}

export function StepProgress({ t, step, total, docName, done }: Props) {
  const text = t('kit.header.stepOf', { n: step, total, doc: docName });
  return (
    <div class="space-y-2">
      <p class="font-semibold">{text}</p>
      <ProgressBar
        value={done}
        max={Math.max(1, total)}
        label={t('ui.progress.label', { done, total })}
        valueText={t('ui.progress.label', { done, total })}
      />
    </div>
  );
}
