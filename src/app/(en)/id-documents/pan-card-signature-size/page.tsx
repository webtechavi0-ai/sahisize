/** /id-documents/pan-card-signature-size */
import IdDocumentLayout, { idDocumentMetadata } from '@/components/layouts/IdDocumentLayout';
import IdSignatureTool from '@/islands/id-documents/IdSignatureTool';
import ToolContent from '@/components/tools/ToolContent';
import { toolDict } from '@/components/tools/dict';
import { getIdPage } from '@/config/id-documents';
import { panSignatureCopy } from '@/components/id-documents/copy';

const lang = 'en' as const;
const page = getIdPage('pan-card-signature-size');
const c = panSignatureCopy();
const s = page.spec;

export const metadata = idDocumentMetadata({ lang, page, copy: c });

export default function Page() {
  return (
    <IdDocumentLayout lang={lang} page={page} copy={c} content={<ToolContent sections={c.sections} />}>
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
