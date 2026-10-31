/**
 * Mount point for B's KitFlow island (src/islands/KitFlow.tsx), per its mount contract.
 *  - /kit/[slug]: all fittable documents (the page IS the tool).
 *  - /exam/[slug]/[document]: pre-set to one document (`only`).
 * The promo card goes in KitFlow's "promo" slot: shown under the summary only (SPEC 10).
 */
import KitFlow from '@/islands/KitFlow';
import PromoSlot from './PromoSlot';
import { toKitPreset } from '@/components/kit/kit-preset';
import { getNamespace } from '@/i18n';
import type { Lang } from '@/config/site';
import type { ExamPreset } from '@/content/presets/schema';
import { localHref } from '@/seo/localize-href';

interface Props {
  lang: Lang;
  preset: ExamPreset;
  /** docSlug to pre-set the tool to a single document. */
  only?: string;
}

export default function KitSlot({ lang, preset: p, only }: Props) {
  const examHref = localHref(`/exam/${p.slug}`, lang);
  const props = {
    preset: toKitPreset(p),
    lang,
    dict: getNamespace(lang, 'common', 'ui', 'kit'),
    examHref,
    // /report exists in English only today; localHref switches when /hi/report is added.
    reportHref: localHref('/report', lang),
    showHeader: false,
    ...(only ? { only } : {}),
  };
  return (
    <KitFlow
      {...props}
      promo={<PromoSlot lang={lang} placement="kit-summary" exam={p.slug} group={p.group} />}
    />
  );
}
