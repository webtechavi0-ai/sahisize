/**
 * Side-rail block factories (docs/design/inner-pages-spec.md §3, §5–7). Server only.
 * Each returns a RailItem, or null when the preset has no data for it (spec §9): no placeholder
 * boxes, no facts that are not in the preset JSON, and no dates other than `lastChecked`.
 */
import type { ReactNode } from 'react';
import Icon from '@/components/site/Icon';
import { Picture } from '@/components/media/Picture';
import { HERO_DARK_IMG, HERO_DARK_PLATE } from '@/components/media/RouteImages';
import { examDocPath } from '@/config/routes';
import { t } from '@/i18n/server';
import type { Lang } from '@/i18n/config';
import { isVerifiedPreset, type ExamPreset, type PresetDocument } from '@/lib/presets';
import { formatDate, kbText, pxText } from '@/seo/spec-text';
import { examShortName, latinTitleName, localHref, relatedExamsFor } from '@/server/content';
import BlockShell from './BlockShell';
import type { RailItem } from './Rail';
import { ShapeSvg, TileSvg } from './ShapeSvg';
import { isPdfUrl, kbAndFormat, noticeWithYear, uploadMatch, sizeTiles, type SizeTile } from './rail-data';
import { artImageFor, type ArtSource } from './rail-art';
import { railHeights } from './rail-fit';
import { docShape } from './scale-box';

type Tr = (k: string, v?: Record<string, string | number>) => string;
const trFor = (lang: Lang): Tr => (k, v) => t(lang, k, v);

/** Tile label: the document name without its parenthetical ("Class 10 (SSC/SSLC) certificate" → "Class 10
 * certificate"); the full name is the tile's title and the linked page's H1. */
function tileLabel(label: string): string {
  const short = label.replace(/\s*\([^)]*\)/g, '').replace(/\s{2,}/g, ' ').trim();
  return short || label;
}

const LABEL = 'mt-2 line-clamp-3 break-words text-[13px] font-semibold leading-snug text-heading';

const TILE =
  'group flex h-full min-h-[120px] flex-col items-center rounded-xl border border-rule bg-band px-1 pb-2 pt-3 text-center no-underline transition-colors duration-150 hover:border-ink hover:bg-ink-soft';

/* ------------------------------------------------------------------ Sizes at a glance (§3.1) */

/** KB rule and format on separate short lines, so narrow (320 px rail) tiles never break mid-value. */
function TileSpec({ kb, format }: { kb: string | null; format: string | null }) {
  return (
    <>
      {kb && <span className="num text-[13px] font-semibold leading-snug text-ink">{kb.replace(/ KB$/, '\u00a0KB')}</span>}
      {format && <span className="text-[12px] font-semibold leading-snug tracking-wide text-muted">{format}</span>}
    </>
  );
}

function Tile({ tile, p, lang, tr }: { tile: SizeTile; p: ExamPreset; lang: Lang; tr: Tr }) {
  if (tile.kind === 'more') {
    return (
      <a href="#spec-h" className={TILE} data-size-box data-shape="more">
        <span aria-hidden="true" className="num grid h-[52px] place-items-center text-[22px] font-bold text-ink">
          +{tile.n}
        </span>
        <span className="mt-2 text-[13px] font-semibold leading-snug text-heading">
          {tr('site.exams.docShort.more', { n: tile.n })}
        </span>
      </a>
    );
  }
  if (tile.kind === 'live') {
    return (
      <a href="#live-h" className={TILE} data-size-box data-shape="live">
        <TileSvg shape={{ kind: 'live', px: null }} doc="photo" format="jpg" />
        <span className={LABEL}>
          {tr('site.exams.docShort.photoLive')}
        </span>
        <span className="text-[13px] font-semibold leading-snug text-ink">{tr('site.rail.noUpload')}</span>
      </a>
    );
  }
  const href = localHref(examDocPath(p.slug, tile.slug), lang);
  if (tile.kind === 'pdf-group') {
    const first = tile.docs[0]!;
    // Several documents share this tile, so it opens the spec table that lists them all.
    return (
      <a
        href="#spec-h"
        className={TILE}
        data-size-box
        data-doc={tile.slug}
        data-shape="pdf"
        title={tile.docs.map((x) => x.label[lang]).join(', ')}
      >
        <TileSvg shape={{ kind: 'pdf', px: null }} doc={first.doc} format="pdf" />
        <span className={LABEL}>{tr('site.rail.pdfGroup', { n: tile.docs.length })}</span>
        <TileSpec kb={kbText(first, lang)} format={null} />
      </a>
    );
  }
  const d = tile.doc;
  const px = pxText(d, lang);
  return (
    <a href={href} className={TILE} data-size-box data-doc={tile.slug} data-shape={tile.shape.kind}>
      <TileSvg shape={tile.shape} doc={d.doc} format={d.format} />
      <span className={LABEL} title={tileLabel(d.label[lang]) !== d.label[lang] ? d.label[lang] : undefined}>
        {tileLabel(d.label[lang])}
      </span>
      {px && tile.shape.kind !== 'pdf' && <span className="num text-[12px] leading-snug text-muted">{px}</span>}
      <TileSpec kb={kbText(d, lang)} format={d.format.toUpperCase()} />
    </a>
  );
}

export function sizesBlock(p: ExamPreset, lang: Lang): RailItem | null {
  const tiles = sizeTiles(p);
  if (tiles.length === 0) return null;
  const tr = trFor(lang);
  return {
    key: 'sizes',
    half: true,
    height: railHeights.sizes(tiles.length),
    render: (span) => (
      <BlockShell
        block="sizes"
        headingId="rail-sizes-h"
        title={tr('site.rail.sizesTitle')}
        icon="crop"
        className={span}
      >
        <ul className="grid grid-cols-3 gap-2">
          {tiles.map((x, i) => (
            <li key={i} className="min-w-0">
              <Tile tile={x} p={p} lang={lang} tr={tr} />
            </li>
          ))}
        </ul>
        <p className="mt-3 text-[13px] text-muted">{tr('site.rail.sizesNote')}</p>
      </BlockShell>
    ),
  };
}

/* -------------------------------------------------------------- Doc shape (doc pages, §5.1) */

/**
 * The document drawn to scale. With `p`, the official source sits in the same card (doc pages):
 * one block instead of two keeps the rail short enough to stay in view (spec §2, item 12).
 */
export function docShapeBlock(d: PresetDocument, lang: Lang, p?: ExamPreset): RailItem {
  const tr = trFor(lang);
  const shape = docShape(d);
  const label = lang === 'hi' ? d.label.hi : d.label.en.toLowerCase();
  // The drawing is small here, so the pixel rule is printed beside it instead of as dimension marks.
  const pxLine = shape.kind === 'fixed' || shape.kind === 'range' ? pxText(d, lang) : null;
  const withSource = !!p?.sourceUrl;
  const title = tr('site.rail.shapeTitle', { doc: label });
  return {
    key: 'doc-shape',
    half: true,
    height: railHeights.shapeRow(
      title,
      withSource
        ? {
            verified: isVerifiedPreset(p!),
            notice: noticeWithYear(p!),
            meta: `${p!.sourcePage !== null ? tr('site.exam.sourcePage', { page: p!.sourcePage }) + ' · ' : ''}${tr('site.rail.checked', { date: formatDate(p!.lastChecked, lang) })}`,
          }
        : null,
    ),
    render: (span) => (
      <BlockShell
        block="doc-shape"
        headingId="rail-shape-h"
        title={title}
        icon="crop"
        className={span}
      >
        {/* Drawing beside its numbers: half the height of a stacked layout. */}
        <div className="flex items-center gap-3">
          <div className="w-[56%] max-w-[170px] shrink-0">
            <ShapeSvg shape={shape} doc={d.doc} format={d.format} labels={null} />
          </div>
          <div className="min-w-0">
            <p className="num text-[15px] font-semibold leading-snug text-ink">{kbAndFormat(d, lang)}</p>
            {pxLine && <p className="num mt-1 text-[14px] text-text">{pxLine}</p>}
            {(shape.kind === 'kb' || shape.kind === 'pdf') && (
              <p className="mt-1 text-[13px] text-muted">{tr('site.rail.anyPixels')}</p>
            )}
            {d.dpi !== null && <p className="num mt-1 text-[13px] text-muted">{d.dpi} DPI</p>}
          </div>
        </div>
        {withSource && (
          <div
            className="mt-3 border-t border-rule pt-3"
            data-rail-source
            data-source-status={isVerifiedPreset(p!) ? 'verified' : 'unverified'}
          >
            <h3 className="sr-only">
              {tr(isVerifiedPreset(p!) ? 'site.rail.sourceTitle' : 'site.rail.sourceTitleUnverified')}
            </h3>
            <SourceBody p={p as ExamPreset & { sourceUrl: string }} lang={lang} compact />
          </div>
        )}
      </BlockShell>
    ),
  };
}

/* ------------------------------------------------------------------ Rejection tips (§3.2) */

export function tipsBlock(
  p: ExamPreset,
  tips: ExamPreset['rejectionTips'],
  lang: Lang,
  /** The page renders the full list at #rej-h (see-all link only then). */
  fullListOnPage: boolean,
  /** Tips shown in the rail (doc pages show 2 to keep the rail short enough to stay in view). */
  max = 3,
): RailItem | null {
  if (tips.length === 0) return null;
  const tr = trFor(lang);
  const shown = tips.slice(0, max);
  // The fix text is clamped in the rail, so the full list is always one tap away.
  const seeAll = fullListOnPage;
  return {
    key: 'tips',
    half: false,
    height: railHeights.tips(
      shown.map((x) => x.error.length),
      seeAll,
      tr('site.rail.tipsTitle', { exam: examShortName(p) }),
    ),
    render: (span) => (
      <BlockShell
        block="tips"
        headingId="rail-tips-h"
        title={tr('site.rail.tipsTitle', { exam: examShortName(p) })}
        icon="alert"
        tone="saffron"
        className={span}
      >
        <ol className={`space-y-2 md:grid md:gap-2 md:space-y-0 lg:block lg:space-y-2 ${shown.length === 3 ? 'md:grid-cols-3' : shown.length === 2 ? 'md:grid-cols-2' : ''}`}>
          {shown.map((tip, i) => (
            <li key={i} className="rounded-xl bg-band px-3 py-2">
              {/* The quoted portal message is never clamped: people compare it with their screen. */}
              <p className="text-[14px] font-semibold leading-snug text-danger-text">
                <span className="sr-only">{tr('site.exam.rejectionError')}: </span>
                <q lang="en" className="font-mono text-[13px]">
                  {tip.error}
                </q>
              </p>
              <p className="mt-1 line-clamp-2 text-[14px] leading-snug text-text">
                <span className="font-semibold">{tr('site.exam.rejectionFix')}:</span> {tip.fix[lang]}
              </p>
            </li>
          ))}
        </ol>
        {seeAll && (
          <a
            href="#rej-h"
            className="-mx-2 mt-1 inline-flex min-h-tap items-center gap-1 rounded-xl px-2 text-[15px] font-semibold text-ink no-underline hover:bg-ink-soft"
          >
            {tips.length > shown.length ? tr('site.rail.tipsAll', { n: tips.length }) : tr('site.rail.tipsFull')}
            <Icon name="arrowRight" size={16} />
          </a>
        )}
      </BlockShell>
    ),
  };
}

/* ------------------------------------------------------------------------ Source (§3.3) */

/** Notice, page and checked date plus the official link: the body of the Source block. */
function SourceBody({ p, lang, compact = false }: { p: ExamPreset & { sourceUrl: string }; lang: Lang; compact?: boolean }) {
  const tr = trFor(lang);
  const verified = isVerifiedPreset(p);
  const pdf = isPdfUrl(p.sourceUrl);
  const linkText = verified ? tr(pdf ? 'site.rail.openPdf' : 'site.rail.openNotice') : tr('site.exam.secondarySource');
  const checked = tr('site.rail.checked', { date: formatDate(p.lastChecked, lang) });
  return (
    <>
      {!verified && (
        <p className="mb-2 rounded-lg bg-saffron-soft p-2 text-[14px] text-text">{tr('site.exam.unverifiedBadge')}</p>
      )}
      <dl className={compact ? 'text-[14px]' : 'space-y-1 text-[15px]'}>
        <div>
          <dt className="sr-only">{tr('site.rail.sourceNoticeLabel')}</dt>
          <dd className="font-semibold text-heading">{noticeWithYear(p)}</dd>
        </div>
        {compact ? (
          /* Page and checked date share one line in the compact (doc page) form. */
          <div className="text-muted">
            {p.sourcePage !== null && (
              <>
                <dt className="sr-only">{tr('site.rail.sourcePageLabel')}</dt>
                <dd className="inline">{tr('site.exam.sourcePage', { page: p.sourcePage })}</dd>
                <span aria-hidden="true"> · </span>
              </>
            )}
            <dt className="sr-only">{tr('site.rail.checkedLabel')}</dt>
            <dd className="inline">{checked}</dd>
          </div>
        ) : (
          <>
            {p.sourcePage !== null && (
              <div>
                <dt className="sr-only">{tr('site.rail.sourcePageLabel')}</dt>
                <dd className="text-muted">{tr('site.exam.sourcePage', { page: p.sourcePage })}</dd>
              </div>
            )}
            <div>
              <dt className="sr-only">{tr('site.rail.checkedLabel')}</dt>
              <dd className="text-muted">{checked}</dd>
            </div>
          </>
        )}
      </dl>
      <a
        href={p.sourceUrl}
        target="_blank"
        rel="noopener nofollow external"
        className={`btn-secondary min-h-[48px] w-full text-[15px] ${compact ? 'mt-2' : 'mt-3'}`}
      >
        {linkText}
        <Icon name="external" size={16} className="shrink-0" />
        <span className="sr-only">{tr('site.rail.newTab')}</span>
      </a>
    </>
  );
}

export function sourceBlock(p: ExamPreset, lang: Lang): RailItem | null {
  if (!p.sourceUrl) return null;
  const tr = trFor(lang);
  const verified = isVerifiedPreset(p);
  const sp = p as ExamPreset & { sourceUrl: string };
  return {
    key: 'source',
    half: true,
    height: railHeights.source(verified, p.sourcePage !== null),
    render: (span) => (
      <BlockShell
        block="source"
        headingId="rail-source-h"
        title={tr(verified ? 'site.rail.sourceTitle' : 'site.rail.sourceTitleUnverified')}
        icon={verified ? 'badge' : 'info'}
        tone={verified ? 'chalk' : 'saffron'}
        className={span}
        attrs={{ 'data-source-status': verified ? 'verified' : 'unverified' }}
      >
        <SourceBody p={sp} lang={lang} />
      </BlockShell>
    ),
  };
}

/* -------------------------------------------------------------- Related exams (§3.4) */

export function relatedBlock(p: ExamPreset, lang: Lang): RailItem | null {
  const related = relatedExamsFor(p);
  if (related.length === 0) return null;
  const tr = trFor(lang);
  // Computed from the presets on every build, so labels stay right when a notice changes.
  const rows = related
    .map((x) => ({ x, m: uploadMatch(p, x) }))
    .sort((a, b) => Number(b.m.all) - Number(a.m.all) || b.m.same - a.m.same);
  return {
    key: 'related',
    half: true,
    height: railHeights.relatedRows(rows.length),
    render: (span) => (
      <BlockShell
        block="related"
        headingId="rail-related-h"
        title={tr('site.rail.relatedTitle')}
        icon="arrowRight"
        className={span}
      >
        <ul className="space-y-2">
          {rows.map(({ x, m }) => (
            <li key={x.slug}>
              <a
                href={localHref(`/exam/${x.slug}`, lang)}
                data-related-chip={x.slug}
                data-upload-match={m.all ? 'all' : m.same > 0 ? 'partial' : 'none'}
                className="flex min-h-tap items-center gap-3 rounded-xl border border-rule bg-card px-3 py-2 no-underline transition-colors duration-150 hover:border-ink hover:bg-ink-soft"
              >
                <span className="min-w-0 flex-1">
                  <span className="block truncate font-semibold text-ink" lang={lang === 'hi' ? 'en' : undefined}>
                    {latinTitleName(x)}
                  </span>
                  {m.same > 0 && (
                    <span className={`mt-0.5 flex items-center gap-1 text-[13px] ${m.all ? 'font-semibold text-chalk-text' : 'text-muted'}`}>
                      <Icon name="check" size={14} className={`shrink-0 ${m.all ? 'text-chalk' : 'text-muted'}`} />
                      {m.all
                        ? m.total === 1
                          ? tr('site.rail.matchOne')
                          : tr('site.rail.matchAll', { n: m.total })
                        : tr('site.rail.matchSome', { same: m.same, total: m.total })}
                    </span>
                  )}
                </span>
                <Icon name="arrowRight" size={16} className="shrink-0 text-muted" />
              </a>
            </li>
          ))}
        </ul>
      </BlockShell>
    ),
  };
}

/* ------------------------------------------------------------------------ Art (§3.5) */

const ART_SIZES =
  '(min-width:1440px) 400px, (min-width:1280px) 360px, (min-width:1024px) 320px, (min-width:768px) 50vw, 100vw';

/** Decorative illustration at the bottom of the panel; no block at all when there is no image. */
export function artBlock(
  src: ArtSource,
  lang: Lang,
  /** A 108 px strip instead of 214 px in the desktop rail, so a tall rail (doc, tool pages) still fits the screen. */
  compact = false,
): RailItem | null {
  const art = artImageFor(src, lang);
  if (!art) return null;
  return {
    key: 'art',
    half: true,
    height: railHeights.art(compact),
    render: (span) => (
      <div data-rail-block="art" className={`min-w-0 ${span}`}>
        {/* Same dark-mode plate as RouteHero; lazy-loaded (no priority): below the fold. */}
        <figure
          className={`mx-auto overflow-hidden rounded-card ${span ? 'max-w-[480px] lg:max-w-none' : ''} ${compact ? 'lg:h-[108px]' : 'lg:h-[214px]'} ${HERO_DARK_PLATE}`}
          data-route-hero
          data-rail-art={art.slot.id}
        >
          <Picture
            slot={art.slot.id}
            lang={lang}
            sizes={ART_SIZES}
            className={`h-auto w-full rounded-card lg:h-full lg:object-cover ${HERO_DARK_IMG}`}
          />
        </figure>
      </div>
    ),
  };
}

/* ------------------------------------------------- Numbered steps (tool how-to, hub how-to) */

export function StepList({ steps }: { steps: readonly { name?: string; text: string }[] }) {
  return (
    <ol className="space-y-2.5">
      {steps.map((s, i) => (
        <li key={i} className="flex gap-2.5">
          <span
            aria-hidden="true"
            className="num grid h-7 w-7 shrink-0 place-items-center rounded-full bg-ink-soft text-sm font-bold text-ink"
          >
            {i + 1}
          </span>
          <p className="min-w-0 text-[14px] leading-snug">
            {s.name && <strong className="text-heading">{s.name}.</strong>} {s.text}
          </p>
        </li>
      ))}
    </ol>
  );
}

/** Tool "How to use it" moved into the rail (same id="how-h", spec §6.1). */
export function howBlock(steps: readonly { name: string; text: string }[], lang: Lang): RailItem | null {
  if (steps.length === 0) return null;
  const tr = trFor(lang);
  return {
    key: 'how',
    half: false,
    height: railHeights.steps(steps.map((x) => x.name.length + 2 + x.text.length)),
    render: (span) => (
      <BlockShell block="how" headingId="how-h" title={tr('site.tool.howTitle')} icon="check" className={span}>
        <StepList steps={steps} />
      </BlockShell>
    ),
  };
}

export interface ChipLink {
  href: string;
  label: string;
}

/** Related sizes / tools chips on tool pages (spec §6.2). */
export function linksBlock(title: string, links: readonly ChipLink[]): RailItem | null {
  if (links.length === 0) return null;
  // Short labels ("20 KB") fit three to a row, tool names two; long ones (document + size) take a row each.
  const longest = Math.max(...links.map((l) => l.label.length));
  const cols = longest <= 8 ? 3 : longest <= 22 ? 2 : 1;
  return {
    key: 'related-tools',
    half: true,
    height:
      cols === 3
        ? railHeights.chips3(links.length)
        : cols === 2
          ? railHeights.chips(links.length, false)
          : railHeights.chipList(links.map((l) => l.label.length)),
    render: (span) => (
      <BlockShell block="related-tools" headingId="rail-tools-h" title={title} icon="arrowRight" className={span}>
        <ul className={`grid gap-2 ${cols === 3 ? 'grid-cols-3' : cols === 2 ? 'grid-cols-2' : 'grid-cols-1'}`}>
          {links.map((l) => (
            <li key={l.href} className="min-w-0">
              <a href={l.href} className="chip num w-full whitespace-normal text-center leading-tight">
                {l.label}
              </a>
            </li>
          ))}
        </ul>
      </BlockShell>
    ),
  };
}

/* ------------------------------------------------------------- Family hub blocks (§7) */

export function hubSourceBlock(members: readonly ExamPreset[], lang: Lang): RailItem {
  const tr = trFor(lang);
  const verified = members.filter((p) => isVerifiedPreset(p));
  const latest = members
    .map((p) => p.lastChecked)
    .sort()
    .at(-1);
  const line =
    verified.length > 0 && latest
      ? tr('site.rail.hubSources', {
          n: verified.length,
          date: formatDate(latest, lang),
        })
      : tr('site.rail.hubSourcesNone');
  const steps = [1, 2, 3].map((i) => ({ text: tr(`site.rail.hubStep${i}`) }));
  return {
    key: 'hub-source',
    half: true,
    height: railHeights.hubSource(),
    render: (span) => (
      <BlockShell
        block="hub-source"
        headingId="rail-hub-h"
        title={tr('site.rail.hubTitle')}
        icon={verified.length > 0 ? 'badge' : 'info'}
        tone={verified.length > 0 ? 'chalk' : 'saffron'}
        className={span}
      >
        <p className="text-[15px]">{line}</p>
        <a href={localHref('/sources', lang)} className="btn-secondary mb-4 mt-3 min-h-[48px] w-full text-[15px]">
          {tr('site.rail.allSources')}
        </a>
        <StepList steps={steps} />
      </BlockShell>
    ),
  };
}

export function membersBlock(
  members: readonly ExamPreset[],
  family: { name: string },
  lang: Lang,
  photoText: (p: ExamPreset) => string,
): RailItem | null {
  if (members.length < 2) return null;
  const tr = trFor(lang);
  const shown = members.slice(0, 8);
  const more = members.length > shown.length;
  return {
    key: 'members',
    half: true,
    height: railHeights.members(shown.length, more),
    render: (span) => (
      <BlockShell
        block="members"
        headingId="rail-members-h"
        title={tr('site.rail.membersTitle', { family: family.name })}
        icon="arrowRight"
        className={span}
      >
        <ul className="grid grid-cols-1 gap-2">
          {shown.map((p) => (
            <li key={p.slug} className="min-w-0">
              <a
                href={localHref(`/exam/${p.slug}`, lang)}
                className="chip w-full justify-between gap-2"
                data-related-chip={p.slug}
              >
                <span className="min-w-0 truncate">{examShortName(p)}</span>
                <span className="num shrink-0 text-[13px] font-normal text-muted">{photoText(p)}</span>
              </a>
            </li>
          ))}
        </ul>
        {more && (
          <a
            href="#links-h"
            className="-mx-2 mt-1 inline-flex min-h-tap items-center gap-1 rounded-xl px-2 text-[15px] font-semibold text-ink no-underline hover:bg-ink-soft"
          >
            {tr('site.rail.membersAll', {
              n: members.length,
              family: family.name,
            })}
            <Icon name="arrowRight" size={16} />
          </a>
        )}
      </BlockShell>
    ),
  };
}

/** Wraps arbitrary block content (e.g. the moved "other documents" nav). */
export function customBlock(key: string, half: boolean, height: number, render: (span: string) => ReactNode): RailItem {
  return { key, half, height, render };
}
