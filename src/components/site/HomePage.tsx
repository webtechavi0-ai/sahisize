/**
 * Home (SPEC 6.2; redesign docs/design/home-redesign-spec.md) for / and /hi. Bands: hero (wash)
 * -> popular exams (band) -> tools -> how it works (band) -> trust + FAQ -> footer (band).
 * Page metadata comes from the route's generateMetadata.
 */
import { preload } from 'react-dom';
import MainLayout from '@/components/layout/MainLayout';
import ExamCard from './ExamCard';
import HowItWorks from './HowItWorks';
import TrustStrip from './TrustStrip';
import FaqList from './FaqList';
import HeroArt from './HeroArt';
import { RouteHero } from '@/components/media/RouteImages';
import FaqIllustration from './FaqIllustration';
import Feedback from './Feedback';
import HomePaths, { type PathLink, type TaskLink } from './HomePaths';
import HomeTools, { type ToolRow } from './HomeTools';
import Icon from './Icon';
import { compressPdfToKbPath, compressToKbPath, PDF_KB_TARGETS, TOOL_META, type ToolSlug } from '@/config/tools';
import {
  alternatesFor,
  examDocParams,
  getPreset,
  hindiExamSlugs,
  hindiPathFor,
  latinTitleName,
  localHref,
  otherDocCards,
  publishedPresets,
  seasonOrder,
} from '@/server/content';
import { getDocument } from '@/lib/presets';
import { verifiedSummary } from '@/seo/spec-text';
import { buildMostSearched, MOST_SEARCHED } from './home-sizes';
import { faqPage, organization, website } from '@/seo/jsonld';
import { toolNameKey } from './util';
import { t } from '@/i18n/server';
import { lookup } from '@/i18n/core';
import { RAW_MESSAGES } from '@/i18n/messages';
import { localizePath, type Lang } from '@/i18n/config';
import { pickPopular } from '@/lib/presets';

interface Props {
  lang: Lang;
}

export default function HomePage({ lang }: Props) {
  const tr = (k: string, v?: Record<string, string | number>) => t(lang, k, v);
  // Season order, minus past cycles (by build year) and unverified sources; later exams backfill.
  const popular = pickPopular(seasonOrder(), { year: new Date().getFullYear(), limit: 12 });
  const total = publishedPresets().length;
  const hi = new Set(hindiExamSlugs());
  const examHref = (s: string) => (lang === 'hi' && hi.has(s) ? `/hi/exam/${s}` : `/exam/${s}`);
  const toolHref = (p: string) => (lang === 'hi' ? (hindiPathFor(p) ?? p) : p);
  const toolPath = (slug: ToolSlug) => toolHref(TOOL_META[slug].path);
  const toolName = (slug: ToolSlug) => tr(toolNameKey(slug));

  // The H1 is set in Inter 700 and is the LCP text: preload that face on the home only.
  preload('/fonts/inter-latin-700.woff2', { as: 'font', type: 'font/woff2', crossOrigin: 'anonymous' });

  // Exam path: the exams most applicants fill (recognisable names, not season order). Six show
  // on phones and on half-width cards (3 x 2), eight where the chips have 4 columns (4 x 2).
  // Chips show the Latin code printed on forms and admit cards ("IBPS PO") in both languages,
  // with the full name in the page language as the tooltip.
  const HERO_EXAMS = ['ibps-po', 'ssc-cgl', 'neet-ug', 'rrb-ntpc', 'sbi-po', 'ssc-chsl', 'ctet', 'upsc-cse'];
  const published = new Set(publishedPresets().map((p) => p.slug));
  const heroExams: PathLink[] = HERO_EXAMS.filter((s) => published.has(s))
    .slice(0, 8)
    .map((s, i) => {
      const p = getPreset(s)!;
      const label = latinTitleName(p);
      return {
        href: examHref(s),
        label,
        title: label !== p.name[lang] ? p.name[lang] : undefined,
        lang: lang === 'hi' ? 'en' : undefined,
        wideOnly: i >= 6,
      };
    });

  // Size path: the four KB sizes searched most, "Other size" (the one primary: it serves the
  // visitor with no number yet) and Signature. PAN, passport and custom size live in Tools.
  const docs = otherDocCards(lang);
  const doc = (id: string) => docs.find((d) => d.id === id)!;
  const kbTask = (kb: number): TaskLink => ({ id: `${kb}kb`, href: toolHref(compressToKbPath(kb)), kind: 'kb', kb });
  const tasks: TaskLink[] = [
    kbTask(20),
    kbTask(50),
    kbTask(100),
    kbTask(200),
    { id: 'any-kb', href: toolPath('photo-size-converter-in-kb'), kind: 'other' },
    { id: 'signature', href: toolPath('signature-resize'), kind: 'signature' },
  ];

  // "Most searched sizes": the organic winners, sizes from the presets (keyword map §2).
  const docRoutes = new Set(examDocParams().map((x) => `${x.slug}/${x.doc}`));
  const mostSearched = buildMostSearched(MOST_SEARCHED, {
    doc: (exam, slug) => {
      const p = getPreset(exam);
      const d = p && docRoutes.has(`${exam}/${slug}`) ? getDocument(p, slug) : undefined;
      if (!d || d.toVerify) return null;
      return { href: localHref(`/exam/${exam}/${slug}`, lang), spec: verifiedSummary(d, lang) };
    },
    pdfTool: (kb) =>
      (PDF_KB_TARGETS as readonly number[]).includes(kb)
        ? { href: toolHref(compressPdfToKbPath(kb)), spec: tr('site.home.sizesPdfSpec', { n: kb }) }
        : null,
    label: (s) => tr(`site.home.sizes.${s.id}`, s.kind === 'pdfTool' ? { n: s.kb } : undefined),
  });

  // One grouped tools list (was "Other documents" + "What do you need?").
  const docRow = (id: string): ToolRow => {
    const d = doc(id);
    return { href: d.href, name: d.name, spec: d.spec, note: d.note, doc: d.id };
  };
  const slugRow = (slug: ToolSlug): ToolRow => ({ href: toolPath(slug), name: toolName(slug) });
  // "By document" first; the four KB rows the hero already has are left out here.
  const toolGroups = [
    {
      id: 'doc',
      title: tr('site.home.toolsByDoc'),
      icon: 'badge' as const,
      rows: [
        docRow('pan-photo'),
        docRow('pan-signature'),
        docRow('passport'),
        slugRow('photo-3-5x4-5-cm'),
        docRow('stamp'),
        docRow('postcard'),
        slugRow('signature-resize'),
        slugRow('thumb-impression'),
        slugRow('handwritten-declaration'),
      ],
    },
    {
      id: 'size',
      title: tr('site.home.toolsBySize'),
      icon: 'file' as const,
      rows: [
        { href: toolHref('/tools/compress-image-20kb-to-50kb'), name: tr('site.home.photoRange', { a: 20, b: 50 }) },
        slugRow('photo-size-converter-in-kb'),
        slugRow('compress-image'),
        slugRow('increase-image-size-in-kb'),
        docRow('custom'),
      ],
    },
    {
      id: 'pdf',
      title: tr('site.home.toolsPdf'),
      icon: 'download' as const,
      rows: [
        slugRow('images-to-pdf'),
        slugRow('compress-pdf'),
        slugRow('name-date-on-photo'),
        slugRow('passport-photo-sheet'),
      ],
    },
  ];

  // H1 with the "in KB" accent (site.home.heroMark, inside site.home.hero).
  const hero = tr('site.home.hero');
  const mark = tr('site.home.heroMark');
  const at = mark && mark !== 'site.home.heroMark' ? hero.indexOf(mark) : -1;
  const heroParts =
    at >= 0 ? [hero.slice(0, at), hero.slice(at, at + mark.length), hero.slice(at + mark.length)] : null;
  // Only questions written in the page language (`t` would fall back to English per key).
  const translated = (k: string) => lookup(RAW_MESSAGES[lang].site, k) !== undefined;
  const faq = [1, 8, 2, 3, 4, 5, 6, 7]
    .filter((i) => translated(`home.faq${i}q`) && translated(`home.faq${i}a`))
    .map((i) => ({ q: tr(`site.home.faq${i}q`), a: tr(`site.home.faq${i}a`, { count: total }) }));

  const heading = heroParts ? (
    <>
      {heroParts[0]}
      <span className="marker whitespace-nowrap">{heroParts[1]}</span>
      {heroParts[2]}
    </>
  ) : (
    hero
  );
  // Illustration: beside the hero from 768 px, at the top of "How it works" on phones. Lazy
  // everywhere (the H1 is the LCP element); light mode has no box (its background = the page),
  // dark mode gets RouteHero's quiet plate (thin ring, rounded clip, dimmed art).
  const artPlate = 'overflow-hidden';
  const artImg = 'h-auto w-full rounded-2xl';
  const heroArt = (
    <RouteHero
      route="/"
      lang={lang}
      className={`${artPlate} [mask-image:radial-gradient(ellipse_at_center,#000_64%,transparent_72%)] dark:[mask-image:none]`}
      imgClassName={artImg}
      sizes="(min-width: 1280px) 480px, (min-width: 1024px) 40vw, 280px"
      fallback={<HeroArt lang={lang} />}
    />
  );

  return (
    <MainLayout
      lang={lang}
      alternates={alternatesFor('/')}
      hideSearch
      mainClass="container-fluid flex-1"
      jsonLd={[organization(), website(lang), faqPage(faq)]}
    >
      <Feedback lang={lang} />
      <HomePaths
        lang={lang}
        heading={heading}
        exams={heroExams}
        tasks={tasks}
        examCount={total}
        sizes={mostSearched}
        art={heroArt}
      />

      <section aria-labelledby="pop-h" className="band py-8 sm:py-14 lg:py-20">
        <div className="w-full">
          <div className="flex items-center justify-between gap-4">
            <h2 id="pop-h" className="text-h2">{tr('site.home.popular')}</h2>
            <a
              href={localizePath('/exams', lang)}
              className="inline-flex min-h-tap shrink-0 items-center gap-1 rounded-xl px-2 text-[15px] font-semibold text-ink no-underline hover:bg-ink-soft"
            >
              <span className="sm:hidden">{tr('site.home.allShort', { count: total })}</span>
              <span className="hidden sm:inline">{tr('site.home.allExams', { count: total })}</span>
              <Icon name="arrowRight" size={16} className="shrink-0" />
            </a>
          </div>
          {/* 12 cards in the HTML; phones show 6. 12 = full rows at 3 and 4 columns. */}
          <ul className="mt-4 grid gap-2.5 sm:mt-6 sm:gap-3 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 max-sm:[&>li:nth-child(n+7)]:hidden">
            {popular.map((p) => <ExamCard key={p.slug} lang={lang} preset={p} href={examHref(p.slug)} compact />)}
          </ul>
          <a href={localizePath('/exams', lang)} className="btn-secondary mt-3 w-full sm:hidden">
            {tr('site.home.allExams', { count: total })}
          </a>
        </div>
      </section>

      <HomeTools lang={lang} groups={toolGroups} />

      <HowItWorks
        lang={lang}
        art={
          <RouteHero
            route="/"
            lang={lang}
            className={`mx-auto mb-4 max-w-[240px] md:hidden ${artPlate}`}
            imgClassName={artImg}
            sizes="240px"
          />
        }
      />

      <div className="w-full py-8 sm:py-14 lg:py-20">
        <TrustStrip lang={lang} />
        {/* FAQ + illustration: hidden <768, centred above 768-1023, sticky right third >=1024. */}
        <div className="lg:grid lg:grid-cols-3 lg:items-start lg:gap-8">
          <FaqIllustration
            lang={lang}
            className="mx-auto mt-10 hidden w-full max-w-[360px] md:block lg:sticky lg:top-6 lg:col-start-3 lg:row-start-1 lg:mt-20"
          />
          <div className="min-w-0 lg:col-span-2 lg:col-start-1 lg:row-start-1">
            <FaqList title={tr('site.home.faqTitle')} items={faq} openFirst className="mt-8 sm:mt-10" />
          </div>
        </div>
      </div>
    </MainLayout>
  );
}
