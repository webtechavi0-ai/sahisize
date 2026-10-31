/**
 * Owner rule 4: visible disclaimer, near the top and again at the foot of every
 * /id-documents page. Hindi pages show the Hindi line and the English line.
 * Plain SahiSize styling: no logos, emblems or tricolour.
 *
 * With `page` and place "top" it is a compact notice above the tool (Q30): the
 * disclaimer, the official source link and the checked date in one short block, so the
 * upload button stays above the fold on a phone. The on-device line then moves to the foot
 * (the tool's own trust line already says it next to the buttons).
 */
import type { Lang } from '@/config/site';
import {
  ID_CHECKED_LABEL,
  ID_CHECKED_ON,
  ID_DISCLAIMER,
  ID_PRIVACY,
  type IdDocPage,
} from '@/config/id-documents';

interface Props {
  lang: Lang;
  /** "top" also shows the on-device line (unless compact). */
  place: 'top' | 'bottom';
  /** Spec page: makes the top notice compact, with source link and checked date. */
  page?: IdDocPage;
}

export default function IdDisclaimer({ lang, place, page }: Props) {
  const hi = lang === 'hi';
  const compact = place === 'top' && !!page;
  const src = page?.sources[0];
  const showPrivacy = page ? place === 'bottom' : place === 'top';

  if (compact && src) {
    return (
      <aside
        className="mt-3 rounded-card border border-rule bg-card px-3 py-2 text-sm leading-snug"
        data-id-disclaimer={place}
        aria-label={hi ? 'अस्वीकरण' : 'Disclaimer'}
      >
        <p>
          {hi && (
            <span className="font-semibold" lang="hi">
              {ID_DISCLAIMER.hi}{' '}
            </span>
          )}
          <span className={hi ? 'text-muted' : 'font-semibold'} lang="en">
            {ID_DISCLAIMER.en}
          </span>{' '}
          <a href={src.url} rel="noopener" target="_blank" data-id-source>
            {hi ? 'सोर्स: Protean गाइडलाइन' : 'Source: Protean guideline'}
          </a>
          {' · '}
          <time dateTime={ID_CHECKED_ON} data-id-checked>
            {ID_CHECKED_LABEL[lang]}
          </time>
        </p>
      </aside>
    );
  }
  return (
    <aside
      className="mt-4 rounded-card border border-rule bg-card p-4 text-sm"
      data-id-disclaimer={place}
      aria-label={hi ? 'अस्वीकरण' : 'Disclaimer'}
    >
      {hi && (
        <p className="font-semibold" lang="hi">
          {ID_DISCLAIMER.hi}
        </p>
      )}
      <p className={hi ? 'mt-1 text-muted' : 'font-semibold'} lang="en">
        {ID_DISCLAIMER.en}
      </p>
      {showPrivacy && (
        <p className="mt-2 text-chalk-text" data-id-privacy>
          {ID_PRIVACY[lang]}
        </p>
      )}
    </aside>
  );
}
