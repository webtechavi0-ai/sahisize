import { describe, expect, it } from 'vitest';
import { buildMostSearched, MOST_SEARCHED, type MostSearchedResolver, type MostSearchedSource } from '../home-sizes';

const resolver = (over: Partial<MostSearchedResolver> = {}): MostSearchedResolver => ({
  doc: (exam, doc) => ({ href: `/exam/${exam}/${doc}`, spec: `${exam}:${doc}` }),
  pdfTool: (kb) => ({ href: `/tools/compress-pdf-to-${kb}kb`, spec: `under ${kb} KB` }),
  label: (s) => (s.kind === 'pdfTool' ? `PDF compressor to ${s.kb} KB` : `label ${s.id}`),
  ...over,
});

describe('buildMostSearched', () => {
  it('keeps source order and maps each source to its page', () => {
    const rows = buildMostSearched(MOST_SEARCHED, resolver());
    expect(rows.map((r) => r.href)).toEqual([
      '/exam/jee-main/class10',
      '/exam/csir-net/result-awaited',
      '/exam/rrb-ntpc/certificate',
      '/exam/ssc-cgl/signature',
      '/tools/compress-pdf-to-400kb',
    ]);
    expect(rows[4]).toMatchObject({ label: 'PDF compressor to 400 KB', spec: 'under 400 KB' });
  });

  it('drops rows whose target is missing, unverified or unlabelled', () => {
    const rows = buildMostSearched(
      MOST_SEARCHED,
      resolver({
        doc: (exam, doc) => (exam === 'csir-net' ? null : { href: `/exam/${exam}/${doc}`, spec: 'x' }),
        pdfTool: () => null,
        label: (s) => (s.id === 'sscCglSignature' ? '  ' : s.id),
      }),
    );
    expect(rows.map((r) => r.id)).toEqual(['jeeMainClass10', 'rrbNtpcCertificate']);
  });

  it('drops duplicate targets', () => {
    const dup: MostSearchedSource[] = [
      { kind: 'doc', id: 'a', exam: 'x', doc: 'photo' },
      { kind: 'doc', id: 'b', exam: 'x', doc: 'photo' },
    ];
    expect(buildMostSearched(dup, resolver()).map((r) => r.id)).toEqual(['a']);
  });

  it('has unique ids (they are i18n keys)', () => {
    const ids = MOST_SEARCHED.map((s) => s.id);
    expect(new Set(ids).size).toBe(ids.length);
  });
});
