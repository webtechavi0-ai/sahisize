'use client';
import { useEffect } from 'react';
import { initAnalytics, initPromoTracking } from '@/scripts/analytics-init';
import { track } from '@/lib/analytics';

/** Analytics + service-worker registration (was the inline <script> in RootShell). */
export default function ClientBoot() {
  useEffect(() => {
    initAnalytics();
    initPromoTracking(track);
    if ('serviceWorker' in navigator && process.env.NODE_ENV === 'production') {
      navigator.serviceWorker.register('/sw.js').catch(() => undefined);
    }
  }, []);
  return null;
}
