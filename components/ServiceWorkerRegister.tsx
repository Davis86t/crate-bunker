// components/ServiceWorkerRegister.tsx
// Purpose: Register / update the service worker in production.
// - Registers /sw.js
// - Listens for updates and auto-activates quietly (no reload).

"use client";
import { useEffect } from "react";

export default function ServiceWorkerRegister() {
  useEffect(() => {
    if (!("serviceWorker" in navigator)) return;
    if (process.env.NODE_ENV !== "production") return;

    const url = "/sw.js";
    let reg: ServiceWorkerRegistration | null = null;

    (async () => {
      try {
        reg = await navigator.serviceWorker.register(url, { scope: "/" });
        // Trigger skip-waiting when an update is installed
        reg.addEventListener("updatefound", () => {
          const sw = reg?.installing;
          if (!sw) return;
          sw.addEventListener("statechange", () => {
            if (
              sw.state === "installed" &&
              reg &&
              navigator.serviceWorker.controller
            ) {
              sw.postMessage({ type: "SKIP_WAITING" });
            }
          });
        });
        navigator.serviceWorker.addEventListener("controllerchange", () => {
          // Optional: show a toast or silently continue
        });
      } catch {
        // Progressive enhancement: ignore failures
      }
    })();
  }, []);

  return null;
}
