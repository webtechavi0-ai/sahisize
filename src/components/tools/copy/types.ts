/** Page copy shape for tool pages (EN and provisional HI). Build-time only. */
export interface ToolSection {
  h2: string;
  paras: string[];
  list?: string[];
  links?: { href: string; label: string }[];
}

export interface ToolCopy {
  title: string;
  description: string;
  h1: string;
  intro: string;
  steps: { name: string; text: string }[];
  faq: { q: string; a: string }[];
  sections: ToolSection[];
}

/** Rough word count of everything below the H1 (tests keep pages in 300–700 words). */
export function wordCount(c: ToolCopy): number {
  const text = [
    c.intro,
    ...c.steps.flatMap((s) => [s.name, s.text]),
    ...c.faq.flatMap((f) => [f.q, f.a]),
    ...c.sections.flatMap((s) => [s.h2, ...s.paras, ...(s.list ?? [])]),
  ].join(' ');
  return text.split(/\s+/).filter(Boolean).length;
}
