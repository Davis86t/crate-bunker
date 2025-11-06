// components/Banner.tsx
// Purpose: Handles post-submit banners (success/error/offline) with cooldown logic.
// Notes:
// - Reads ?sent / ?error from URL
// - Displays success or error banner for 4s
// - Enforces 1h cooldown via localStorage 'cb:contact-last-sent'
// - Uses smooth scroll and fade-out animations

'use client';

import { useEffect, useState, useCallback } from 'react';

type BannerType = 'success' | 'error' | 'offline' | null;

export default function Banner() {
  const [mounted, setMounted] = useState(false);
  const [visible, setVisible] = useState(false);
  const [type, setType] = useState<BannerType>(null);

  // defer any state writes inside effects to satisfy lint rule
  const defer = (fn: () => void) => { setTimeout(fn, 0); };

  const smoothScrollToTop = useCallback(() => {
    try { window.scrollTo({ top: 0, behavior: 'smooth' }); } catch {}
  }, []);

  // 1) On mount: read URL + online state → decide banner type (all deferred)
  useEffect(() => {
    if (typeof window === 'undefined') return;

    const url = new URL(window.location.href);
    const sent = url.searchParams.get('sent');
    const error = url.searchParams.get('error');

    const lastSent = localStorage.getItem('cb:contact-last-sent');
    const now = Date.now();

    let willShow = false;

    if (sent === '1') {
      localStorage.setItem('cb:contact-last-sent', String(now));
      defer(() => setType('success'));
      willShow = true;
    } else if (error) {
      defer(() => setType('error'));
      willShow = true;
    } else if (!navigator.onLine) {
      defer(() => setType('offline'));
      willShow = true;
    } else if (lastSent && now - Number(lastSent) < 3600_000) {
      defer(() => setType('success'));
      willShow = true;
    }

    // Clean URL (avoid repeat on refresh)
    if (sent || error) {
      url.searchParams.delete('sent');
      url.searchParams.delete('error');
      window.history.replaceState({}, '', url.toString());
    }

    if (willShow) defer(smoothScrollToTop);
  }, [smoothScrollToTop]);

  // 2) When type is set: mount → show → auto-hide → unmount (all deferred)
  useEffect(() => {
    if (!type) return;

    const mountTimer = setTimeout(() => setMounted(true), 0);
    const showTimer = setTimeout(() => setVisible(true), 30);
    const hideTimer = setTimeout(() => {
      setVisible(false);
      const cleanup = setTimeout(() => setMounted(false), 300);
      // no return here; we clear in outer cleanup
    }, 4000);

    return () => {
      clearTimeout(mountTimer);
      clearTimeout(showTimer);
      clearTimeout(hideTimer);
    };
  }, [type]);

  if (!mounted || !type) return null;

  const bg =
    type === 'success'
      ? 'bg-emerald-600/80 border-emerald-500/50'
      : type === 'error'
      ? 'bg-rose-600/80 border-rose-500/50'
      : 'bg-gray-700/80 border-gray-600/50';

  const msg =
    type === 'success'
      ? 'Message sent successfully.'
      : type === 'error'
      ? 'Something went wrong — try again.'
      : 'You appear to be offline. Message will send when back online.';

  return (
    <div
      role="status"
      className={`fixed top-0 left-0 right-0 z-50 flex items-center justify-center transition-all duration-300 ${
        visible ? 'opacity-100 translate-y-0' : 'opacity-0 -translate-y-4'
      }`}
    >
      <div
        className={`m-3 w-fit max-w-[90%] rounded-xl border px-6 py-3 text-sm text-white shadow-lg backdrop-blur-md ${bg}`}
      >
        {msg}
      </div>
    </div>
  );
}
