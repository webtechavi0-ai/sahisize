'use client';
import { useEffect } from 'react';
import { track } from '@/lib/analytics';

/** Tracks clicks on the exam page's "Make my files" link (was an inline <script> in Exam.astro). */
export function ExamSelectTracker() {
  useEffect(() => {
    const cleanups: (() => void)[] = [];
    document.querySelectorAll<HTMLAnchorElement>('a[data-exam-select]').forEach((a) => {
      const fn = () => track('exam_selected', { exam: a.dataset.examSelect!, source: 'link' });
      a.addEventListener('click', fn);
      cleanups.push(() => a.removeEventListener('click', fn));
    });
    return () => cleanups.forEach((c) => c());
  }, []);
  return null;
}
