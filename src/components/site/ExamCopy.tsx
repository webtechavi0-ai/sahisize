/**
 * Per-exam written copy (SPEC 9.4) from src/content/exam-copy/{lang}/{slug}.json.
 * Renders nothing if the file is missing.
 */
import { getExamCopyHtml } from '@/content/loaders';
import type { Lang } from '@/config/site';

interface Props {
  lang: Lang;
  slug: string;
  title: string;
}

export default function ExamCopy({ lang, slug, title }: Props) {
  const html = getExamCopyHtml(lang, slug);
  if (!html) return null;
  return (
    <section aria-labelledby="copy-h" className="mt-10">
      <h2 id="copy-h" className="text-xl font-bold">{title}</h2>
      <div className="prose mt-3 max-w-none dark:prose-invert prose-a:text-primary" dangerouslySetInnerHTML={{ __html: html }} />
    </section>
  );
}
