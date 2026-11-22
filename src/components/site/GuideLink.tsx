/**
 * One contextual link to a guide ("Step-by-step guide: <title>"). Renders nothing when the
 * guide does not exist (or is a draft) in the page's language, so a page never links to a
 * 404 or to a guide in the other language. Use with `guideForDocument` / `guideForTool`.
 */
import Icon from './Icon';
import { getGuide } from '@/server/content';
import { t } from '@/i18n/server';
import { localizePath, type Lang } from '@/i18n/config';

interface Props {
  lang: Lang;
  /** Guide slug, or null to render nothing. */
  slug: string | null;
  className?: string;
}

export default function GuideLink({ lang, slug, className }: Props) {
  const g = slug ? getGuide(slug, lang) : undefined;
  if (!g) return null;
  return (
    <p className={`flex items-start gap-2 text-sm ${className ?? ''}`.trim()} data-guide-link={g.slug}>
      <Icon name="info" size={18} className="mt-px shrink-0 text-muted" />
      <span>
        {t(lang, 'site.guides.guideLink')}:{' '}
        <a href={localizePath(`/guides/${g.slug}`, lang)} className="font-semibold">
          {g.title}
        </a>
      </span>
    </p>
  );
}
