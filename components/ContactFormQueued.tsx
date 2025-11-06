// components/ContactFormQueued.tsx
// Purpose: Flush a queued contact payload when back online, then refresh the page.
// Notes:
// - Reads from localStorage KEY and posts to /api/contact
// - Treats 200/204/303 as success; keeps UX consistent with Banner.tsx
// - No 'any', no "access before declare", correct hook deps

'use client';

import { useCallback, useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';

type Payload = {
  name: string;
  email: string;
  message: string;
  website?: string;
};

const KEY = 'cb:contact-outbox';

export default function ContactFormQueued() {
  const router = useRouter();
  const [_status, setStatus] = useState<'idle' | 'sending' | 'sent' | 'error'>('idle');

  // POST helper defined BEFORE effects so it’s in scope
  const send = useCallback(async (payload: Payload): Promise<boolean> => {
    const res = await fetch('/api/contact', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-Requested-With': 'fetch',
      },
      body: JSON.stringify(payload),
      // We manually interpret 303 as success to match the API’s redirect flow
      redirect: 'manual',
    });
    return res.ok || res.status === 303 || res.status === 204;
  }, []);

  // Attempt flush when we become online or on mount if already online
  useEffect(() => {
    if (typeof window === 'undefined') return;

    const go = async () => {
      // If browser thinks we're offline, bail early
      if (!navigator.onLine) return;

      const raw = localStorage.getItem(KEY);
      if (!raw) return;

      setStatus('sending');
      try {
        const parsed = JSON.parse(raw) as Payload;
        const ok = await send(parsed);
        if (ok) {
          localStorage.removeItem(KEY);
          setStatus('sent');
          // Make sure banners/SSR state update
          router.refresh();
        } else {
          setStatus('error');
        }
      } catch {
        setStatus('error');
      }
    };

    // Run once on mount
    void go();

    // Also listen for online events
    const onOnline = () => void go();
    window.addEventListener('online', onOnline);
    return () => window.removeEventListener('online', onOnline);
  }, [router, send]);

  // Headless helper; no UI
  return null;
}
