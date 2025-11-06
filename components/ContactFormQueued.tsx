// components/ContactFormQueued.tsx
// Purpose: Flush a queued contact payload when back online, then refresh the page.
// Notes:
// - Reads localStorage key 'cb:contact-outbox' (array of Payloads).
// - Posts each payload to /api/contact; treats 303 as success.
// - On success, removes payload and refreshes the page so Banner can reflect state.
// - Headless component: no UI rendered.

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
  // keep an internal status for debugging; underscore silences “unused” lint if not read
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const [_status, setStatus] = useState<'idle' | 'sending' | 'sent' | 'error'>('idle');

  // POST helper (declared before effects so it’s in scope)
  const send = useCallback(async (payload: Payload): Promise<boolean> => {
    const res = await fetch('/api/contact', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'X-Requested-With': 'fetch' },
      body: JSON.stringify(payload),
      redirect: 'manual', // interpret 303 as success
    });
    return res.ok || res.status === 303 || res.status === 204;
  }, []);

  // Flush queue once on mount + whenever we regain connectivity
  useEffect(() => {
    if (typeof window === 'undefined') return;

    const flush = async () => {
      if (!navigator.onLine) return;

      const raw = localStorage.getItem(KEY);
      if (!raw) return;

      let q: Payload[];
      try {
        q = JSON.parse(raw) as Payload[];
      } catch {
        localStorage.removeItem(KEY);
        return;
      }
      if (!Array.isArray(q) || q.length === 0) return;

      setStatus('sending');

      // Try send head, pop when OK, stop early on failure to retry later
      const next = [...q];
      while (next.length) {
        const item = next[0];
        try {
          const ok = await send(item);
          if (!ok) break;
          next.shift();
        } catch {
          break;
        }
      }

      if (next.length === 0) {
        localStorage.removeItem(KEY);
        setStatus('sent');
        router.refresh(); // ensure banners and SSR bits update
      } else {
        localStorage.setItem(KEY, JSON.stringify(next));
        setStatus('error'); // not fully sent; will retry later
      }
    };

    // run once
    void flush();

    // also listen to “online” resume
    const onOnline = () => void flush();
    window.addEventListener('online', onOnline);
    return () => window.removeEventListener('online', onOnline);
  }, [router, send]);

  return null; // headless
}
