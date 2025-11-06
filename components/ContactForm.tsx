// components/ContactForm.tsx
// Purpose: Collect & submit contact messages.
// Notes: Offline queue (localStorage), 1h resend cooldown, honeypot "website", 303 treated as success.
"use client";

import { FormEvent, useEffect, useMemo, useRef, useState } from "react";

/* ================================
   Local queue (localStorage)
================================ */
type OutboxItem = {
  name: string;
  email: string;
  message: string;
  website?: string;
  ts: number;
};

const OUTBOX_KEY = "cb:contact-outbox";
const SENT_ONCE_KEY = "cb:sentOnce";
const SENT_LOCK_HOURS = 1; // lockout duration

/** Safely read the outbox queue from localStorage (returns [] on parse errors). */
function readOutbox(): OutboxItem[] {
  try {
    return JSON.parse(localStorage.getItem(OUTBOX_KEY) || "[]");
  } catch {
    return [];
  }
}
/** Persist the full outbox queue back to localStorage. */
function writeOutbox(items: OutboxItem[]) {
  localStorage.setItem(OUTBOX_KEY, JSON.stringify(items));
}
/** Append a single item to the end of the outbox queue. */
function enqueue(item: OutboxItem) {
  const q = readOutbox();
  q.push(item);
  writeOutbox(q);
}
/** Remove and return the first queued item (FIFO); returns undefined if empty. */
function dequeue(): OutboxItem | undefined {
  const q = readOutbox();
  const item = q.shift();
  writeOutbox(q);
  return item;
}
/** True if the outbox currently contains at least one queued item. */
function hasOutbox() {
  return readOutbox().length > 0;
}

/**
 * Update the current URL's search params without causing navigation or scroll.
 * Useful to show temporary flags (sent/error/queued) without history spam.
 */
function setParamNoScroll(updater: (url: URL) => void) {
  try {
    const url = new URL(window.location.href);
    updater(url);
    window.history.replaceState({}, "", url.toString());
  } catch {}
}

/**
 * Robust online probe:
 * - Requires `navigator.onLine` AND a fetch that doesn't timeout.
 * - Any HTTP response (even 404) counts as "online".
 */
async function isOnline(): Promise<boolean> {
  if (!navigator.onLine) return false;
  const tryFetch = async (path: string) => {
    const ctrl = new AbortController();
    const t = setTimeout(() => ctrl.abort(), 2500);
    try {
      await fetch(`${path}?ts=${Date.now()}`, {
        cache: "no-store",
        credentials: "same-origin",
        signal: ctrl.signal,
      });
      clearTimeout(t);
      return true;
    } catch {
      clearTimeout(t);
      return false;
    }
  };
  return (await tryFetch("/api/ping")) || (await tryFetch("/"));
}

export default function ContactForm() {
  const formRef = useRef<HTMLFormElement>(null);

  const [sending, setSending] = useState(false);
  const [hydrated, setHydrated] = useState(false);
  const [sentOnce, setSentOnce] = useState(false); // one-and-done lock

  useEffect(() => setHydrated(true), []);

  // On mount: hydrate and restore 1h lockout state from localStorage.
  useEffect(() => {
    try {
      const raw = localStorage.getItem(SENT_ONCE_KEY);
      if (!raw) return;
      const saved = JSON.parse(raw);
      if (saved.ts && Date.now() - saved.ts < SENT_LOCK_HOURS * 3600 * 1000) {
        setSentOnce(true);
      } else {
        localStorage.removeItem(SENT_ONCE_KEY); // expired
      }
    } catch {}
  }, []);

  /**
   * After showing a banner via URL flags, remove the flags after a short delay
   * so they don't persist on refresh or copy/paste.
   */
  const clearQuerySoon = (ms = 2800) => {
    setTimeout(() => {
      setParamNoScroll((url) => {
        ["sent", "error", "queued", "compact", "already"].forEach((k) =>
          url.searchParams.delete(k)
        );
      });
    }, ms);
  };

  // Periodically try to flush queue; also on online/visible transitions.
  useEffect(() => {
    let running = false;

    const clearQueuedIfOnline = async () => {
      if (await isOnline()) {
        setParamNoScroll((url) => {
          if (url.searchParams.get("queued") === "1")
            url.searchParams.delete("queued");
        });
      }
    };

    const flush = async () => {
      if (running) return;
      const online = await isOnline();

      if (online && !hasOutbox()) {
        await clearQueuedIfOnline();
        return;
      }
      if (!online || !hasOutbox()) return;

      running = true;
      let anySent = false;
      try {
        while (hasOutbox() && (await isOnline())) {
          const next = dequeue();
          if (!next) break;

          const fd = new FormData();
          fd.set("name", next.name);
          fd.set("email", next.email);
          fd.set("message", next.message);
          if (next.website) fd.set("website", next.website);

          const res = await fetch("/api/contact", { method: "POST", body: fd });
          if (!res.ok) {
            const rest = readOutbox();
            writeOutbox([next, ...rest]);
            break;
          }
          anySent = true;
        }

        if (anySent) {
          try {
            localStorage.setItem(
              SENT_ONCE_KEY,
              JSON.stringify({ ts: Date.now() })
            );
          } catch {}
          setSentOnce(true);
          // Compact success when coming from an offline flush
          setParamNoScroll((url) => {
            url.searchParams.set("sent", "1");
            url.searchParams.set("compact", "1");
          });
          clearQuerySoon(2500);
        } else {
          await clearQueuedIfOnline();
        }
      } finally {
        running = false;
      }
    };

    const onOnline = () => flush();
    const onVisible = () => {
      if (document.visibilityState === "visible") flush();
    };
    const interval = setInterval(() => {
      if (hasOutbox()) flush();
    }, 8000);

    window.addEventListener("online", onOnline);
    document.addEventListener("visibilitychange", onVisible);
    flush();

    return () => {
      window.removeEventListener("online", onOnline);
      document.removeEventListener("visibilitychange", onVisible);
      clearInterval(interval);
    };
  }, []);

  /** Handle submit: validate, respect 1h lock, send online or enqueue offline. */
  async function onSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const form = e.currentTarget;
    const fd = new FormData(form);

    // After first success: show inline panel, readOnly fields, no URL churn
    if (sentOnce) return;

    const online = await isOnline();

    if (!online) {
      enqueue({
        name: String(fd.get("name") || ""),
        email: String(fd.get("email") || ""),
        message: String(fd.get("message") || ""),
        website: String(fd.get("website") || "") || undefined,
        ts: Date.now(),
      });
      setParamNoScroll((url) => {
        url.searchParams.set("queued", "1");
      });
      form.reset();
      return;
    }

    setSending(true);
    try {
      const res = await fetch("/api/contact", { method: "POST", body: fd });
      const ok = res.ok;
      if (ok) {
        try {
          localStorage.setItem(SENT_ONCE_KEY, JSON.stringify({ ts: Date.now() }));
        } catch {}
        setSentOnce(true);
      }
      setParamNoScroll((url) => {
        url.searchParams.set(ok ? "sent" : "error", "1");
      });
      if (ok) {
        form.reset();
        clearQuerySoon(2600);
      }
    } catch {
      setParamNoScroll((url) => {
        url.searchParams.set("error", "1");
      });
    } finally {
      setSending(false);
    }
  }

  // We render NO <form> before hydration
  const action = useMemo(() => (hydrated ? "/api/contact" : "#"), [hydrated]);
  const method = useMemo(() => (hydrated ? "post" : "get"), [hydrated]);

  return hydrated ? (
    <form
      ref={formRef}
      method={method}
      action={action}
      onSubmit={onSubmit}
      className="mt-6 grid max-w-xl gap-4"
      autoComplete="on"
      noValidate
    >
      {/* inline, static "already sent" banner — mobile-first, no layout jump */}
      {sentOnce && (
        <div
          aria-live="polite"
          className="rounded-xl border border-[#E57C23]/30 bg-[#E57C23]/10 text-[#FFEEDB] px-4 py-3 text-sm shadow-[0_0_18px_1px_rgba(229,124,35,0.25)]"
        >
          You’ve already sent a message. Thanks! We’ll get back to you soon.
        </div>
      )}

      {/* honeypot */}
      <input
        type="text"
        name="website"
        className="hidden"
        tabIndex={-1}
        autoComplete="off"
      />

      <div>
        <label className="mb-1 block text-sm">Name</label>
        <input
          name="name"
          required
          autoComplete="name"
          readOnly={sentOnce}
          className="w-full rounded-lg border border-white/10 bg-[#1F1F1F] px-3 py-2"
        />
      </div>

      <div>
        <label className="mb-1 block text-sm">Email</label>
        <input
          type="email"
          name="email"
          required
          autoComplete="email"
          inputMode="email"
          readOnly={sentOnce}
          className="w-full rounded-lg border border-white/10 bg-[#1F1F1F] px-3 py-2"
        />
      </div>

      <div>
        <label className="mb-1 block text-sm">Message</label>
        <textarea
          name="message"
          rows={5}
          required
          autoComplete="off"
          readOnly={sentOnce}
          className="w-full rounded-lg border border-white/10 bg-[#1F1F1F] px-3 py-2"
        />
      </div>

      <button
        type="submit"
        disabled={sending || sentOnce}
        aria-disabled={sentOnce}
        className={`mt-2 rounded-full px-6 py-3 font-semibold transition-colors ${
          sentOnce
            ? "bg-[#E57C23]/70 text-black cursor-not-allowed"
            : "bg-[#E57C23] text-black hover:bg-black hover:text-[#E57C23]"
        }`}
      >
        {sentOnce
          ? "Message received"
          : sending
          ? "Sending…"
          : "Deploy Request"}
      </button>
    </form>
  ) : (
    <div
      role="form"
      aria-label="Contact form"
      className="mt-6 grid max-w-xl gap-4"
    >
      <div>
        <label className="mb-1 block text-sm">Name</label>
        <input
          disabled
          className="w-full rounded-lg border border-white/10 bg-[#1F1F1F] px-3 py-2 opacity-70"
        />
      </div>
      <div>
        <label className="mb-1 block text-sm">Email</label>
        <input
          disabled
          className="w-full rounded-lg border border-white/10 bg-[#1F1F1F] px-3 py-2 opacity-70"
        />
      </div>
      <div>
        <label className="mb-1 block text-sm">Message</label>
        <textarea
          rows={5}
          disabled
          className="w-full rounded-lg border border-white/10 bg-[#1F1F1F] px-3 py-2 opacity-70"
        />
      </div>
      <button
        type="button"
        className="mt-2 rounded-full bg-[#E57C23] px-6 py-3 font-semibold text-black opacity-70"
        aria-disabled="true"
      >
        Deploy Request
      </button>
    </div>
  );
}
