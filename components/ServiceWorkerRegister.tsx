// components/ServiceWorkerRegister.ts
// Purpose: Register and warm up the PWA service worker (/sw.js) at root scope.
// Notes: Client-only; runs once on mount. Collects same-origin assets (CSS/JS)
//        and sends them to the service worker to pre-cache or "warm up".
//        Silent failure handling; no UI interaction.
"use client";

import { useEffect } from "react";

/* ================================
   ServiceWorkerRegister
   - Registers /sw.js with scope '/'
   - Posts WARMUP_ASSETS message containing all local CSS/JS URLs
   - Handles activation and controllerchange events
================================ */
export default function ServiceWorkerRegister() {
  useEffect(() => {
    // Skip if browser doesn’t support SW.
    if (!("serviceWorker" in navigator)) return;

    navigator.serviceWorker
      .register("/sw.js", { scope: "/" })
      .then((reg) => {
        /* ================================
           sendWarmup()
           - Gathers same-origin CSS/JS assets.
           - Posts them to the active service worker.
        ================================= */
        const sendWarmup = () => {
          const urls: string[] = [];

          // Collect all linked stylesheets.
          document.querySelectorAll('link[rel="stylesheet"]').forEach((el) => {
            if (el instanceof HTMLLinkElement && el.href) urls.push(el.href);
          });

          // Collect all loaded scripts.
          document.querySelectorAll("script[src]").forEach((el) => {
            if (el instanceof HTMLScriptElement && el.src) urls.push(el.src);
          });

          // Filter out any cross-origin URLs.
          const sameOrigin = urls.filter((u) => {
            try {
              return new URL(u).origin === location.origin;
            } catch {
              return false;
            }
          });

          // Send warmup message if any same-origin assets found.
          if (sameOrigin.length)
            reg.active?.postMessage({
              type: "WARMUP_ASSETS",
              urls: sameOrigin,
            });
        };

        // Already active SW → warm up immediately.
        if (reg.active) sendWarmup();

        // Once ready (post-activation), warm up again.
        navigator.serviceWorker.ready.then(() => sendWarmup()).catch(() => {});

        // When a new controller takes over (after SW update).
        navigator.serviceWorker.addEventListener("controllerchange", () => {
          if (navigator.serviceWorker.controller) sendWarmup();
        });
      })
      .catch(console.error);
  }, []);

  return null;
}
