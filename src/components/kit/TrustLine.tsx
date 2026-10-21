import { ShieldCheck } from '@/components/ui/Icon';

/** SPEC 5.3: shown beside every upload control. Chalk shield in a chalk-soft pill. */
export function TrustLine({ text, class: cls = '' }: { text: string; class?: string }) {
  return (
    <p
      class={`inline-flex w-fit max-w-full items-center gap-2 rounded-full bg-chalk-soft px-3 py-1 text-sm font-semibold text-chalk-text ${cls}`}
    >
      <ShieldCheck size={18} aria-hidden="true" class="shrink-0 text-chalk" />
      <span class="min-w-0">{text}</span>
    </p>
  );
}
