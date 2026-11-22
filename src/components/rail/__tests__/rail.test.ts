import { describe, expect, it } from 'vitest';
import { getPreset } from '@/server/content/presets';
import { examIntroShort } from '@/server/content/exam-meta';
import { relatedExamsFor } from '@/server/content/related';
import { fitBox, docShape, SHAPE_STAGE } from '../scale-box';
import { railEstimate, railFit, railHeights, STICKY } from '../rail-fit';
import { isPdfUrl, kbAndFormat, uploadMatch, singleGroup, sizeTiles, MAX_TILES } from '../rail-data';

const preset = (slug: string) => {
  const p = getPreset(slug);
  if (!p) throw new Error(`no preset ${slug}`);
  return p;
};

describe('fitBox (72×52 tile stage)', () => {
  it.each([
    [200, 230, 45, 52],
    [240, 240, 52, 52],
    [800, 400, 72, 36],
    [140, 60, 72, 31],
    [472, 157, 72, 24],
    [709, 236, 72, 24],
    [276, 354, 41, 52],
    [276, 118, 72, 31],
    [140, 110, 66, 52],
    [350, 150, 72, 31],
  ])('%i×%i -> %i×%i on the baseline', (w, h, bw, bh) => {
    const b = fitBox(w, h);
    expect([b.w, b.h]).toEqual([bw, bh]);
    expect(b.y + b.h).toBe(52);
    expect(b.x * 2 + b.w).toBeGreaterThanOrEqual(71);
  });

  it('keeps a minimum side for thin strips', () => {
    expect(fitBox(1000, 50).h).toBe(16);
    expect(fitBox(50, 1000).w).toBe(16);
  });

  it('fits the large stage too', () => {
    const b = fitBox(200, 230, SHAPE_STAGE);
    expect(b.h).toBe(SHAPE_STAGE.h);
    expect(b.w).toBeLessThanOrEqual(SHAPE_STAGE.w);
  });
});

describe('docShape', () => {
  it('uses notice pixels only', () => {
    const base = { format: 'jpg' as const, widthPx: null, heightPx: null };
    expect(docShape({ ...base, widthPx: 200, heightPx: 230 }).kind).toBe('fixed');
    expect(docShape({ ...base, minWidthPx: 140, minHeightPx: 60 })).toEqual({ kind: 'range', px: { w: 140, h: 60 } });
    expect(docShape({ ...base, minWidthPx: 140 }).kind).toBe('kb');
    expect(docShape(base).kind).toBe('kb');
    expect(docShape({ ...base, format: 'pdf' }).kind).toBe('pdf');
  });
});

describe('sizeTiles', () => {
  it('IBPS PO: 5 tiles, four drawn boxes and one PDF', () => {
    const tiles = sizeTiles(preset('ibps-po'));
    expect(tiles).toHaveLength(5);
    const boxes = tiles.flatMap((t) => (t.kind === 'doc' && t.shape.px ? [fitBox(t.shape.px.w, t.shape.px.h)] : []));
    expect(boxes.map((b) => `${b.w}x${b.h}`)).toEqual(['45x52', '72x31', '52x52', '72x36']);
    expect(tiles.filter((t) => t.kind === 'doc' && t.shape.kind === 'pdf')).toHaveLength(1);
  });

  it('SSC CGL: live tile first, then the 72×24 signature', () => {
    const [a, b] = sizeTiles(preset('ssc-cgl'));
    expect(a?.kind).toBe('live');
    expect(b?.kind === 'doc' && b.shape.px && fitBox(b.shape.px.w, b.shape.px.h)).toMatchObject({ w: 72, h: 24 });
  });

  it('NEET UG: KB-only and PDF shapes, at most 6 tiles', () => {
    const tiles = sizeTiles(preset('neet-ug'));
    expect(tiles.length).toBeLessThanOrEqual(MAX_TILES);
    for (const t of tiles) {
      if (t.kind === 'doc') expect(['kb', 'pdf']).toContain(t.shape.kind);
    }
  });

  it('is empty when nothing is uploadable', () => {
    expect(sizeTiles(preset('haryana-police'))).toEqual([]);
  });
});

describe('uploadMatch', () => {
  it('compares every upload, not just photo and signature', () => {
    expect(uploadMatch(preset('ibps-po'), preset('ibps-clerk'))).toEqual({ same: 5, total: 5, all: true });
    // SBI PO: photo, signature, thumb and declaration match; the certificate limit differs.
    const sbi = uploadMatch(preset('ibps-po'), preset('sbi-po'));
    expect(sbi.all).toBe(false);
    expect(sbi.same).toBe(4);
    expect(uploadMatch(preset('ssc-cgl'), preset('rrb-ntpc')).same).toBe(0);
  });

  it('is symmetric', () => {
    const a = uploadMatch(preset('ibps-po'), preset('sbi-po'));
    const b = uploadMatch(preset('sbi-po'), preset('ibps-po'));
    expect(a).toEqual(b);
  });
});

describe('source link and KB text', () => {
  it('detects direct PDF links', () => {
    expect(isPdfUrl('https://ibps.in/wp-content/uploads/x.PDF')).toBe(true);
    expect(isPdfUrl('https://ssc.gov.in/notice?file=x.pdf')).toBe(false);
    expect(isPdfUrl('not a url')).toBe(false);
  });

  it('formats KB and format', () => {
    expect(kbAndFormat({ minKB: 20, maxKB: 50, format: 'jpg' }, 'en')).toBe('20–50 KB · JPG');
    expect(kbAndFormat({ minKB: null, maxKB: 500, format: 'pdf' }, 'hi')).toBe('अधिकतम 500 KB · PDF');
  });
});

describe('railFit', () => {
  it('picks the smallest bucket that fits with 48 px slack', () => {
    expect(railFit(600)).toBe('h720');
    expect(railFit(672)).toBe('h720');
    expect(railFit(673)).toBe('h800');
    expect(railFit(1152)).toBe('h1200');
    expect(railFit(1153)).toBe('none');
  });

  it('emits literal sticky classes', () => {
    expect(STICKY.h900).toContain('lg:[@media(min-height:900px)]:sticky');
    expect(STICKY.none).toBe('');
  });

  it('scales Hindi estimates', () => {
    expect(railEstimate([100, 100], true)).toBe(Math.round(216 * 1.12));
  });

  // Calibrated in Playwright at 1024×768 (320 px rail): IBPS PO exam rail ≈1641 px (scrolls with the
  // page); IBPS PO photo page ≈829 px and /tools/compress-image-to-20kb ≈773 px (both sticky at 900,
  // the 1512×900 calibration target of inner-pages spec §2 item 12). The photo rail is ≈845 px at 1280 (360 px rail).
  it('IBPS PO exam rail is too tall to stick; the photo page and a tool page stick at 900', () => {
    const exam = railEstimate(
      [
        railHeights.sizes(5),
        railHeights.tips([17, 27, 77], true, 'Why IBPS PO uploads get rejected'),
        railHeights.source(true, true),
        railHeights.chips(4, true),
        railHeights.art(),
      ],
      false,
    );
    expect(exam).toBeGreaterThanOrEqual(1641);
    expect(railFit(exam)).toBe('none');
    const photo = railEstimate(
      [
        railHeights.shapeRow('Shape of your photograph', {
          verified: true,
          notice: 'CRP PO/MT-XVI 2026',
          meta: 'page 39 · Checked 22 Oct 2026',
        }),
        railHeights.tips([36, 73], true, 'Why IBPS PO uploads get rejected'),
        railHeights.art(true),
      ],
      false,
    );
    expect(photo).toBeGreaterThanOrEqual(845);
    expect(railFit(photo)).toBe('h900');
    const tool = railEstimate(
      [railHeights.steps([95, 120, 125, 105]), railHeights.chips3(8), railHeights.art(true)],
      false,
    );
    expect(tool).toBeGreaterThanOrEqual(773);
    expect(railFit(tool)).toBe('h900');
  });
});

describe('examIntroShort', () => {
  it('uses the photo spec and the upload count', () => {
    expect(examIntroShort(preset('ibps-po'), 'en')).toBe('IBPS PO photo: 200×230 px, 20–50 KB, JPG. All 5 uploads below.');
    expect(examIntroShort(preset('ibps-po'), 'hi')).toBe('IBPS PO फोटो: 200×230 px, 20–50 KB, JPG। सभी 5 अपलोड नीचे हैं।');
  });

  it('handles live-photo exams', () => {
    expect(examIntroShort(preset('ssc-cgl'), 'en')).toMatch(
      /^SSC CGL photo: taken live in the form, no upload\. Signature: 472×157 px, 10–20 KB, JPG\.$/,
    );
  });

  it('is null without uploadable documents', () => {
    expect(examIntroShort(preset('haryana-police'), 'en')).toBeNull();
  });
});

describe('relatedExamsFor', () => {
  it('returns published exams other than itself, max 6', () => {
    const r = relatedExamsFor(preset('ibps-po'));
    expect(r.length).toBeGreaterThan(0);
    expect(r.length).toBeLessThanOrEqual(6);
    expect(r.every((x) => x.published && x.slug !== 'ibps-po')).toBe(true);
  });
});

describe('singleGroup', () => {
  it('returns the group all hub members share', () => {
    expect(singleGroup([{ group: 'banking' }, { group: 'banking' }])).toBe('banking');
  });
  it('returns null for mixed or empty members', () => {
    expect(singleGroup([{ group: 'banking' }, { group: 'ssc' }])).toBeNull();
    expect(singleGroup([])).toBeNull();
  });
});
