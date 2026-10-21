/**
 * Dismiss button for the home-page ExamPilot banner (ExamPilotPromo.astro, variant "banner").
 * Remembers the choice in localStorage; Base.astro's pre-paint script reads the same key and
 * sets <html data-exampilot-dismissed>, which hides the banner before first paint next time.
 */
import { X } from '@/components/ui/Icon';

export default function PromoDismiss({ label, storageKey }: { label: string; storageKey: string }) {
  return (
    <button
      type="button"
      aria-label={label}
      title={label}
      data-testid="promo-dismiss"
      class="inline-flex h-tap w-tap items-center justify-center rounded-full text-muted hover:bg-paper hover:text-text"
      onClick={() => {
        try {
          localStorage.setItem(storageKey, '1');
        } catch {
          /* storage blocked: hidden for this page view only */
        }
        document.documentElement.setAttribute('data-exampilot-dismissed', '');
      }}
    >
      <X size={22} aria-hidden="true" />
    </button>
  );
}
