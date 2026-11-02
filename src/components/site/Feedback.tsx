/** K15 "Did the portal accept it?" prompt (FeedbackPrompt client component). Renders nothing unless due. */
import FeedbackPrompt from '@/components/site/FeedbackPrompt';
import { getMessages } from '@/i18n/server';
import { type Lang } from '@/i18n/config';

interface Props {
  lang: Lang;
}

export default function Feedback({ lang }: Props) {
  return <FeedbackPrompt lang={lang} dict={getMessages(lang, ['common', 'kit'])} reportHref="/report" />;
}
