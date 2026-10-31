/**
 * Big search box (SPEC 6.2 #1, K1): the ExamSearch island, hero variant. Exams, tools,
 * other documents and guides. On phones it opens full screen on focus.
 * Without JS the form submits to /exams?q=, which filters the list.
 */
import ExamSearch from '@/islands/ExamSearch';
import { searchIslandProps } from '@/lib/nav-data';
import type { Lang } from '@/config/site';

interface Props {
  lang: Lang;
  /** Optional placeholder (default "Search your exam"). */
  placeholder?: string;
}

export default async function HeroSearch({ lang, placeholder }: Props) {
  const props = await searchIslandProps(lang);
  return <ExamSearch variant="hero" {...props} placeholder={placeholder} />;
}
