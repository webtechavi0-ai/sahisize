import { ShieldCheck } from '@/components/ui/Icon';

/** SPEC 5.3: shown beside every upload control. Chalk shield in a chalk-soft pill. */
export function TrustLine({ text, className: cls = '' }: { text: string; className?: string }) {
  return (
    <p
      className={`inline-flex w-fit max-w-full items-center gap-2 rounded-full bg-chalk-soft px-3 py-1 text-sm font-semibold text-chalk-text ${cls}`}
    >
      <ShieldCheck size={18} aria-hidden="true" className="shrink-0 text-chalk" />
      <span className="min-w-0">{text}</span>
    </p>
  );
}
