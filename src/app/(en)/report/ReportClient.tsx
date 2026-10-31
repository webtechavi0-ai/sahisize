'use client';
import { useEffect } from 'react';
import { buildReportMailto } from '@/scripts/report';

/** Wires the server-rendered #report-form: prefill from ?exam=&doc= and open a mailto: on submit. */
export default function ReportClient() {
  useEffect(() => {
    const form = document.getElementById('report-form') as HTMLFormElement | null;
    if (!form) return;
    const params = new URLSearchParams(location.search);
    const exam = form.elements.namedItem('exam') as HTMLSelectElement;
    const doc = form.elements.namedItem('doc') as HTMLSelectElement;
    const pick = (sel: HTMLSelectElement, v: string | null) => {
      if (v && [...sel.options].some((o) => o.value === v)) sel.value = v;
    };
    pick(exam, params.get('exam'));
    pick(doc, params.get('doc'));
    const onSubmit = (e: Event) => {
      e.preventDefault();
      const fd = new FormData(form);
      const what = form.querySelector<HTMLInputElement>('input[name="what"]:checked');
      const whatLabel = what?.parentElement?.textContent?.trim() ?? '';
      const href = buildReportMailto({
        to: form.dataset.email!,
        site: form.dataset.site!,
        exam: String(fd.get('exam') ?? ''),
        examLabel: exam.selectedOptions[0]?.textContent?.trim() ?? '',
        doc: String(fd.get('doc') ?? ''),
        what: whatLabel,
        error: String(fd.get('error') ?? ''),
        details: String(fd.get('details') ?? ''),
        page: location.origin,
      });
      location.href = href;
    };
    form.addEventListener('submit', onSubmit);
    return () => form.removeEventListener('submit', onSubmit);
  }, []);
  return null;
}
