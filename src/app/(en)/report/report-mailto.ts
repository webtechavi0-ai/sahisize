/** mailto: builder for /report. Text only; never attachments. */
export interface ReportInput {
  to: string;
  site: string;
  exam: string;
  examLabel: string;
  doc: string;
  what: string;
  error: string;
  details: string;
  page: string;
}

/** Cap text so the URL stays well under mail-client limits (~2000 chars). */
function cap(s: string, n: number): string {
  const t = s.replace(/\r\n/g, '\n').trim();
  return t.length > n ? `${t.slice(0, n - 1)}…` : t;
}

export function buildReportMailto(r: ReportInput): string {
  const subject = `[${r.site}] ${r.exam ? r.examLabel : 'Report'}${r.doc ? ` · ${r.doc}` : ''}: ${r.what}`;
  const lines = [
    `Exam: ${r.exam ? `${r.examLabel} (${r.exam})` : 'not listed'}`,
    `Document: ${r.doc || 'not sure'}`,
    `What happened: ${r.what}`,
    `Portal error message: ${cap(r.error, 300) || '-'}`,
    '',
    cap(r.details, 1000),
    '',
    `Sent from ${r.page}/report. No files attached.`,
  ];
  return `mailto:${r.to}?subject=${encodeURIComponent(cap(subject, 150))}&body=${encodeURIComponent(lines.join('\n'))}`;
}
