/** K15 "Did the portal accept it?" prompt (B's FeedbackPrompt island). Renders nothing unless due. */
import FeedbackPrompt from '@/islands/FeedbackPrompt';
import { getNamespace } from '@/i18n';
import type { Lang } from '@/config/site';

interface Props {
  lang: Lang;
}

export default function Feedback({ lang }: Props) {
  return <FeedbackPrompt lang={lang} dict={getNamespace(lang, 'common', 'kit')} reportHref="/report" />;
}
