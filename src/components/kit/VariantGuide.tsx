/**
 * A.1 special signature formats: dual-language (Bihar CSBC/BPSC: Hindi + English, two
 * uploads) and triple (UPSC: three signatures one below another in one image).
 */
import { Info } from '@/components/ui/Icon';
import type { T } from '@/lib/format';

interface Props {
  t: T;
  variant: 'dual-language' | 'triple';
  examName: string;
  docName: string;
}

export function VariantGuide({ t, variant, examName, docName }: Props) {
  const dual = variant === 'dual-language';
  return (
    <section class="card flex gap-3 border-primary p-4" data-variant={variant}>
      <Info size={22} aria-hidden="true" class="mt-0.5 shrink-0 text-primary" />
      <div>
        <h3 class="font-bold">{t(dual ? 'kit.variant.dualTitle' : 'kit.variant.tripleTitle')}</h3>
        <p class="mt-1 text-sm">
          {t(dual ? 'kit.variant.dualBody' : 'kit.variant.tripleBody', {
            exam: examName,
            doc: docName,
          })}
        </p>
        {!dual && (
          <svg viewBox="0 0 120 72" class="mt-2 h-16 w-28 text-text" aria-hidden="true">
            <rect
              x="1"
              y="1"
              width="118"
              height="70"
              rx="4"
              fill="none"
              stroke="currentColor"
              stroke-dasharray="4 3"
            />
            {[18, 38, 58].map((y) => (
              <path
                key={y}
                d={`M18 ${y} q8 -10 16 0 t16 0 t16 -2 t16 2 t16 0`}
                fill="none"
                stroke="currentColor"
                stroke-width="2"
              />
            ))}
          </svg>
        )}
      </div>
    </section>
  );
}
