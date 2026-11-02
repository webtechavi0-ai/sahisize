/** /id-documents/pan-card-signature-size */
import IdDocumentLayout, { idDocumentMetadata } from '@/components/layouts/IdDocumentLayout';
import IdSignatureTool from '@/components/id-documents/IdSignatureTool';
import ToolContent from '@/components/tools/ToolContent';
import { toolDict } from '@/components/tools/dict';
import { getIdPage, getIdPageCopy } from '@/server/content';

const lang = 'en' as const;
const page = getIdPage('pan-card-signature-size')!;
const c = getIdPageCopy(page.slug, lang)!;
const s = page.spec;

export const metadata = idDocumentMetadata({ lang, page, copy: c });

export default function Page() {
  return (
    <IdDocumentLayout
      lang={lang}
      page={page}
      copy={c}
      content={<ToolContent lang={lang} sections={c.sections} />}
    >
      <IdSignatureTool
        lang={lang}
        dict={toolDict(lang)}
        tool={page.slug}
        spec={s}
        label={`${s.widthPx}×${s.heightPx} px (2×4.5 cm), under ${s.maxKB} KB, 200 DPI`}
        sub="Protean (NSDL) PAN guideline, checked 22 Oct 2026"
        tip="Sign with a dark pen on plain white paper."
      />
    </IdDocumentLayout>
  );
}
