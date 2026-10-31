/** Affiliate links per exam group (SPEC 10). Off by default; renders nothing then. */
import { getAffiliateLinks } from '@/config/monetization';
import type { Lang } from '@/config/site';
import type { ExamGroup } from '@/content/presets/schema';

interface Props {
  lang: Lang;
  group?: ExamGroup;
  exam?: string;
  placement: 'tool' | 'exam' | 'guide' | 'kit-summary';
}

export default function AffiliateSlot({ lang, group, exam, placement }: Props) {
  const links = getAffiliateLinks(group, exam);
  if (links.length === 0) return null;
  return (
    <aside className="mt-6 rounded-card border border-border bg-surface p-4">
      <ul className="space-y-1">
        {links.map((l) => (
          <li key={l.href}>
            <a
              href={l.href}
              rel="noopener sponsored"
              target="_blank"
              data-promo-slot="affiliate"
              data-promo-placement={placement}
              data-promo-exam={exam}
              data-promo-group={group}
            >
              {l.label[lang]}
            </a>
          </li>
        ))}
      </ul>
    </aside>
  );
}
