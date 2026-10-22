import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { render } from 'preact';
import { act } from 'preact/test-utils';
import { getNamespace } from '@/i18n';
import { configureAnalytics, type FlatProps } from '@/lib/analytics';
import {
  FEEDBACK_DELAY_MS,
  __resetKitStoreForTests,
  getDueFeedback,
  setFeedbackPending,
} from '@/lib/kit-store';
import ExamSearch, { examHref } from '@/islands/ExamSearch';
import FeedbackPromptIsland, { reportUrl } from '@/islands/FeedbackPrompt';
import type { SearchEntry } from '@/lib/search';

const events: { e: string; p: FlatProps }[] = [];
let root: HTMLElement;
beforeEach(() => {
  __resetKitStoreForTests();
  events.length = 0;
  configureAnalytics((e, p) => events.push({ e, p }));
  root = document.createElement('div');
  document.body.appendChild(root);
});
afterEach(() => {
  act(() => render(null, root));
  configureAnalytics(null);
  document.body.innerHTML = '';
});
const tick = () => act(async () => void (await new Promise((r) => setTimeout(r, 5))));

const index: SearchEntry[] = [
  {
    slug: 'ibps-po',
    en: 'IBPS PO',
    hi: 'आईबीपीएस पीओ',
    aliases: [],
    body: 'IBPS',
    group: 'banking',
    published: true,
  },
  {
    slug: 'up-police',
    en: 'UP Police Constable',
    hi: 'यूपी पुलिस',
    aliases: ['up police'],
    body: 'UPPRPB',
    group: 'police',
    published: false,
  },
];

describe('ExamSearch (K1)', () => {
  it('shows grouped results as a combobox and "coming soon" for hidden exams', async () => {
    act(() =>
      render(
        <ExamSearch index={index} lang="en" dict={getNamespace('en', 'common', 'ui')} />,
        root,
      ),
    );
    const input = root.querySelector('input[role="combobox"]') as HTMLInputElement;
    await act(async () => {
      input.value = 'ibsp po';
      input.dispatchEvent(new Event('input', { bubbles: true }));
    });
    const opts = root.querySelectorAll('[role="option"]');
    expect(opts[0]!.textContent).toBe('IBPS PO');
    expect(input.getAttribute('aria-expanded')).toBe('true');
    await act(async () => {
      input.value = 'up police';
      input.dispatchEvent(new Event('input', { bubbles: true }));
    });
    expect(root.textContent).toContain('UP Police Constable: coming soon');
    expect(root.querySelector('[aria-disabled="true"]')).not.toBeNull();
  });

  it('shows non-exam results in a separate "Other documents" group with the Aadhaar note', async () => {
    const docs = [
      {
        id: 'aadhaar' as const,
        en: 'Aadhaar photo',
        hi: 'आधार फोटो',
        aliases: ['aadhar', 'uidai'],
        href: { en: '/id-documents#not-covered', hi: '/hi/id-documents#not-covered' },
        note: { en: 'Aadhaar: photo is captured at the enrolment centre; no upload size is published.', hi: 'x' },
      },
      {
        id: 'pan-photo' as const,
        en: 'PAN card photo',
        hi: 'पैन कार्ड फोटो',
        aliases: ['pan', 'nsdl'],
        href: { en: '/id-documents/pan-card-photo-size', hi: '/hi/id-documents/pan-card-photo-size' },
      },
    ];
    act(() =>
      render(
        <ExamSearch index={index} docs={docs} lang="en" dict={getNamespace('en', 'common', 'ui')} />,
        root,
      ),
    );
    const input = root.querySelector('input[role="combobox"]') as HTMLInputElement;
    await act(async () => {
      input.value = 'aadhar';
      input.dispatchEvent(new Event('input', { bubbles: true }));
    });
    const group = root.querySelector('[role="group"][aria-label="Other documents"]')!;
    expect(group).not.toBeNull();
    expect(group.textContent).toContain('enrolment centre');
    expect(root.querySelectorAll('[role="option"]').length).toBe(1);
    expect(root.textContent).not.toContain('No exam found');
    await act(async () => {
      input.value = 'ibps po';
      input.dispatchEvent(new Event('input', { bubbles: true }));
    });
    expect(root.querySelector('[aria-label="Other documents"]')).toBeNull();
  });

  it('links Hindi pages only for exams that have one', () => {
    expect(examHref('ibps-po', 'hi', ['ibps-po'])).toBe('/hi/exam/ibps-po');
    expect(examHref('ctet', 'hi', ['ibps-po'])).toBe('/exam/ctet');
    expect(examHref('ctet', 'en')).toBe('/exam/ctet');
  });
});

describe('FeedbackPrompt (K15)', () => {
  it('asks after 1 hour; "No" offers report links with exam+doc and tracks only the event', async () => {
    await setFeedbackPending({
      slug: 'ibps-po',
      exam: 'IBPS PO',
      docs: [{ key: 'signature', doc: 'signature', label: 'Signature' }],
      downloadedAt: Date.now() - FEEDBACK_DELAY_MS - 1,
    });
    act(() =>
      render(
        <FeedbackPromptIsland
          lang="en"
          dict={getNamespace('en', 'common', 'kit')}
          reportHref="/report"
        />,
        root,
      ),
    );
    for (let i = 0; i < 20 && !root.textContent; i++) await tick();
    expect(root.textContent).toContain('Did the IBPS PO portal accept your files?');
    const no = [...root.querySelectorAll('button')].find((b) => b.textContent === 'No')!;
    await act(async () => no.click());
    const link = root.querySelector('a[href*="doc=signature"]') as HTMLAnchorElement;
    expect(link.getAttribute('href')).toBe('/report?exam=ibps-po&doc=signature');
    expect(events).toEqual([{ e: 'portal_feedback', p: { exam: 'ibps-po', answer: 'no' } }]);
    await tick();
    expect(await getDueFeedback(Date.now() + FEEDBACK_DELAY_MS * 2)).toBeNull();
  });

  it('stays hidden before the hour is up', async () => {
    await setFeedbackPending({ slug: 'x', exam: 'X', docs: [], downloadedAt: Date.now() });
    act(() =>
      render(<FeedbackPromptIsland lang="en" dict={getNamespace('en', 'common', 'kit')} />, root),
    );
    await tick();
    expect(root.textContent).toBe('');
    expect(reportUrl('/report', 'x')).toBe('/report?exam=x');
  });
});
