// components/ContactFormQueued.tsx
// Purpose: Flush a single queued contact payload when connectivity returns.
// Notes:
// - Reads 'cb:contact-outbox' from localStorage (single Payload JSON in this variant).
// - Treats HTTP 200/204/303 from /api/contact as success (API may redirect on success).
// - Headless state machine driving UX messages via local status; uses router.replace to avoid full nav.

"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";

/** Contact payload captured while offline or prior attempt failed. */
type Payload = {
  name: string;
  email: string;
  message: string;
  website?: string;
};

/** LocalStorage key for offline-queued payload. */
const KEY = "cb:contact-outbox";

export default function ContactFormQueued() {
  // ----- connectivity + simple status for UX text -----
  const [online, setOnline] = useState(true);
  const [status, setStatus] = useState<
    "idle" | "queued" | "sending" | "sent" | "error"
  >("idle");
  const router = useRouter();

  // Sync online/offline signals to state (fast path via navigator.onLine)
  useEffect(() => {
    const sync = () => setOnline(navigator.onLine);
    sync();
    window.addEventListener("online", sync);
    window.addEventListener("offline", sync);
    return () => {
      window.removeEventListener("online", sync);
      window.removeEventListener("offline", sync);
    };
  }, []);

  // Flush queued payload when we regain connectivity (idempotent if nothing is queued)
  useEffect(() => {
    if (!online) return;
    const raw = localStorage.getItem(KEY);
    if (!raw) return;

    (async () => {
      setStatus("sending");
      try {
        const ok = await send(JSON.parse(raw) as Payload);
        if (ok) {
          localStorage.removeItem(KEY);
          setStatus("sent");
          // Use replace() to avoid adding history entries; Banner can key off ?sent=1
          router.replace("/?sent=1");
        } else {
          setStatus("error");
        }
      } catch {
        setStatus("error");
      }
    })();
  }, [online, router]);

  /**
   * POST a payload to /api/contact.
   * Returns true on 200/204/303 (303 indicates success + redirect pattern).
   */
  async function send(payload: Payload) {
    const res = await fetch("/api/contact", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "X-Requested-With": "fetch",
      },
      body: JSON.stringify(payload),
      redirect: "manual", // do not follow 303; treat it as success
    });
    return res.ok || res.status === 303;
  }

  /**
   * Handle user submit:
   * - If offline: persist payload to localStorage and show "queued" message.
   * - If online: try to send immediately; on success, soft-navigate with ?sent=1.
   * Note: This form intentionally has no action/method; JS controls submission.
   */
  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault(); // hard stop navigation
    const fd = new FormData(e.currentTarget);
    const payload: Payload = {
      name: (fd.get("name") || "").toString(),
      email: (fd.get("email") || "").toString(),
      message: (fd.get("message") || "").toString(),
      website: (fd.get("website") || "").toString(), // honeypot (empty in legit submissions)
    };

    if (!online) {
      localStorage.setItem(KEY, JSON.stringify(payload));
      setStatus("queued");
      // Visible cue that we saved offline; avoids network error/dino
      alert("Saved offline. We’ll send it when you reconnect.");
      return;
    }

    setStatus("sending");
    try {
      const ok = await send(payload);
      setStatus(ok ? "sent" : "error");
      if (ok) router.replace("/?sent=1"); // avoids full page load; Banner can react
    } catch {
      setStatus("error");
    }
  }

  return (
    // IMPORTANT: no action/method here; submission is fully handled in JS
    <form onSubmit={onSubmit} className="grid gap-3" noValidate>
      <input name="name" placeholder="Name" required />
      <input name="email" type="email" placeholder="Email" required />
      <textarea name="message" placeholder="Message" required />
      {/* Honeypot: hidden field bots might fill; humans won’t. */}
      <input
        name="website"
        style={{ display: "none" }}
        tabIndex={-1}
        autoComplete="off"
      />
      <button className="rounded-full bg-[#E57C23] px-5 py-2 font-semibold text-black">
        {online
          ? status === "sending"
            ? "Sending…"
            : "Send"
          : "Save & Auto-Send"}
      </button>
      {status === "queued" && (
        <p className="text-xs text-gray-400">
          Queued. Will auto-send when online.
        </p>
      )}
      {status === "error" && (
        <p className="text-xs text-red-400">
          Couldn’t send. Try again when online.
        </p>
      )}
    </form>
  );
}
