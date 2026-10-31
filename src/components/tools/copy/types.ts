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
