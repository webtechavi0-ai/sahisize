'use client';
import { useEffect } from 'react';
import { trackPageview } from '@/lib/analytics';

/** Pageview and service-worker registration for every page. */
export default function ClientBoot() {
  useEffect(() => {
    trackPageview();
    if ('serviceWorker' in navigator && process.env.NODE_ENV === 'production') {
      navigator.serviceWorker.register('/sw.js').catch(() => undefined);
    }
  }, []);
  return null;
}
