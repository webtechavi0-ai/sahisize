'use client';
import { useEffect } from 'react';
import { initExamFilter } from '@/scripts/exams-filter';

/** Wires the /exams search + group-chip filter (was the page's inline <script>). */
export default function ExamsFilterBoot() {
  useEffect(() => {
    initExamFilter();
  }, []);
  return null;
}
