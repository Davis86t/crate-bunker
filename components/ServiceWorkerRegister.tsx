'use client';
import { useEffect } from 'react';

export default function ServiceWorkerRegister() {
  useEffect(() => {
    if (!('serviceWorker' in navigator)) return;

    navigator.serviceWorker
      .register('/sw.js', { scope: '/' })
      .then((reg) => {
        const sendWarmup = () => {
          const urls: string[] = [];

          // collect stylesheet links
          document.querySelectorAll('link[rel="stylesheet"]').forEach((el) => {
            if (el instanceof HTMLLinkElement && el.href) urls.push(el.href);
          });

          // collect scripts
          document.querySelectorAll('script[src]').forEach((el) => {
            if (el instanceof HTMLScriptElement && el.src) urls.push(el.src);
          });

          // same-origin only
          const sameOrigin = urls.filter((u) => {
            try { return new URL(u).origin === location.origin; } catch { return false; }
          });

          if (sameOrigin.length) reg.active?.postMessage({ type: 'WARMUP_ASSETS', urls: sameOrigin });
        };

        // if already active
        if (reg.active) sendWarmup();

        // once it’s ready/activated
        navigator.serviceWorker.ready.then(() => sendWarmup()).catch(() => {});

        // also after controller changes (first load after update)
        navigator.serviceWorker.addEventListener('controllerchange', () => {
          if (navigator.serviceWorker.controller) sendWarmup();
        });
      })
      .catch(console.error);
  }, []);

  return null;
}
