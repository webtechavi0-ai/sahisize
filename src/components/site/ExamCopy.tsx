/**
 * Per-exam written copy from src/content/exam-copy/{lang}/{slug}.json.
 * Renders nothing if the file is missing.
 */
import RichText from '@/components/content/RichText';
import { getExamCopy } from '@/server/content';
import { type Lang } from '@/i18n/config';

interface Props {
  lang: Lang;
  slug: string;
  title: string;
}

export default function ExamCopy({ lang, slug, title }: Props) {
  const blocks = getExamCopy(slug, lang);
  if (!blocks) return null;
  return (
    <section aria-labelledby="copy-h" className="mt-10">
      <h2 id="copy-h" className="text-xl font-bold">{title}</h2>
      <RichText blocks={blocks} headingOffset={1} className="prose mt-3 max-w-none dark:prose-invert prose-a:text-primary" />
    </section>
  );
}
