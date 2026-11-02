/** FAQ as native <details> (no JS). FAQPage JSON-LD is built by the page. */
interface Props {
  title: string;
  items: { q: string; a: string }[];
  id?: string;
}

export default function FaqList({ title, items, id = 'faq-h' }: Props) {
  if (items.length === 0) return null;
  return (
    <section aria-labelledby={id} className="mt-10">
      <h2 id={id} className="text-xl font-bold">{title}</h2>
      <div className="mt-3 divide-y divide-border rounded-card border border-border bg-surface">
        {items.map((f, i) => (
          <details key={i} className="group px-4">
            <summary className="flex min-h-tap cursor-pointer list-none items-center justify-between gap-3 py-3 font-semibold [&::-webkit-details-marker]:hidden">
              <span>{f.q}</span>
              <span aria-hidden="true" className="text-muted transition-transform group-open:rotate-45">+</span>
            </summary>
            <p className="pb-4 text-text">{f.a}</p>
          </details>
        ))}
      </div>
    </section>
  );
}
