/**
 * Mount point for the KitFlow client component (components/kit/KitFlow.tsx).
 *  - /kit/[slug]: all fittable documents (the page IS the tool).
 *  - /exam/[slug]/[document]: pre-set to one document (`only`).
 */
import KitFlow from '@/components/kit/KitFlow';
import { toKitPreset } from '@/components/kit/kit-preset';
import { getMessages } from '@/i18n/server';
import { type Lang } from '@/i18n/config';
import { type ExamPreset } from '@/lib/presets';
import { localHref } from '@/server/content';

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
    dict: getMessages(lang, ['common', 'ui', 'kit']),
    examHref,
    // /report exists in English only today; localHref switches when /hi/report is added.
    reportHref: localHref('/report', lang),
    showHeader: false,
    ...(only ? { only } : {}),
  };
  return <KitFlow {...props} />;
}
