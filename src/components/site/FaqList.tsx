/** FAQ as native <details> (no JS). FAQPage JSON-LD is built by the page. */
import Icon from './Icon';

interface Props {
  title: string;
  items: { q: string; a: string }[];
  id?: string;
  /** Open the first answer (home). */
  openFirst?: boolean;
  /** Classes for the <section> (spacing). */
  className?: string;
}

export default function FaqList({ title, items, id = 'faq-h', openFirst = false, className = 'mt-10' }: Props) {
  if (items.length === 0) return null;
  return (
    <section aria-labelledby={id} className={className}>
      <h2 id={id} className="text-xl font-bold sm:text-2xl">{title}</h2>
      <div className="card mt-4 divide-y divide-rule shadow-e1">
        {items.map((f, i) => (
          <details key={i} className="group" open={openFirst && i === 0}>
            <summary className="flex min-h-[56px] cursor-pointer list-none items-center justify-between gap-3 px-4 py-3 font-semibold text-heading sm:px-5 [&::-webkit-details-marker]:hidden">
              <span>{f.q}</span>
              <Icon name="chevronDown" size={20} className="shrink-0 text-muted transition-transform group-open:rotate-180" />
            </summary>
            <p className="px-4 pb-4 text-text sm:px-5">{f.a}</p>
          </details>
        ))}
      </div>
    </section>
  );
}
