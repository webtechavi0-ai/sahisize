import { ShieldCheck } from '@/components/ui/Icon';

/** SPEC 5.3: shown beside every upload control. */
export function TrustLine({ text, class: cls = '' }: { text: string; class?: string }) {
  return (
    <p class={`flex items-center gap-2 text-sm text-success-text ${cls}`}>
      <ShieldCheck size={18} aria-hidden="true" class="shrink-0" />
      <span>{text}</span>
    </p>
  );
}
