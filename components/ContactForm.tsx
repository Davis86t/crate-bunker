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

function readOutbox(): OutboxItem[] {
  try {
    return JSON.parse(localStorage.getItem(OUTBOX_KEY) || "[]");
  } catch {
    return [];
  }
}
function writeOutbox(items: OutboxItem[]) {
  localStorage.setItem(OUTBOX_KEY, JSON.stringify(items));
}
function enqueue(item: OutboxItem) {
  const q = readOutbox();
  q.push(item);
  writeOutbox(q);
}
function dequeue(): OutboxItem | undefined {
  const q = readOutbox();
  const item = q.shift();
  writeOutbox(q);
  return item;
}
function hasOutbox() {
  return readOutbox().length > 0;
}

/* ================================
   URL param helper (no rerender, no scroll)
================================ */
function setParamNoScroll(updater: (url: URL) => void) {
  try {
    const url = new URL(window.location.href);
    updater(url);
    window.history.replaceState({}, "", url.toString());
  } catch {}
}

/* ================================
   Online probe (real network)
================================ */
// robust online check: only network error/timeout => offline
async function isOnline(): Promise<boolean> {
  if (!navigator.onLine) return false;

  const tryFetch = async (path: string) => {
    const ctrl = new AbortController();
    const t = setTimeout(() => ctrl.abort(), 2500);
    try {
      // GET and no reliance on res.ok — any response means we're online
      await fetch(`${path}?ts=${Date.now()}`, {
        method: "GET",
        cache: "no-store",
        credentials: "same-origin",
        signal: ctrl.signal,
      });
      clearTimeout(t);
      return true;
    } catch {
      clearTimeout(t);
      return false; // only thrown on real network failure/timeout
    }
  };

  // Prefer an API route if present; fall back to root (404 is fine)
  return (await tryFetch("/api/ping")) || (await tryFetch("/"));
}

export default function ContactForm() {
  const formRef = useRef<HTMLFormElement>(null);

  const [sending, setSending] = useState(false);
  const [hydrated, setHydrated] = useState(false);
  const [sentOnce, setSentOnce] = useState(false); // one-and-done lock
  const [anchorRect, setAnchorRect] = useState<{
    top: number;
    left: number;
    width: number;
  } | null>(null);

  function asHTMLElement(el: Element | null): HTMLElement | null {
    return el instanceof HTMLElement ? el : null;
  }

  // local “already” nudge (inline toast; no scroll, no URL)
  const [alreadyNudge, setAlreadyNudge] = useState(false);
  const nudgeTimer = useRef<number | null>(null);
  const pingAlreadyLocal = () => {
    if (nudgeTimer.current) window.clearTimeout(nudgeTimer.current);
    setAlreadyNudge(true);
    nudgeTimer.current = window.setTimeout(() => setAlreadyNudge(false), 2200);
  };

  // Show “already sent” nudge over form
  function showAlreadyOver(el: Element | null) {
    const h = asHTMLElement(el);
    if (!h) return;
    const r = h.getBoundingClientRect(); // viewport coords for position: fixed
    const top = Math.max(8, r.top - 56);
    const left = Math.min(
      window.innerWidth - 8,
      Math.max(8, r.left + r.width / 2)
    );
    setAnchorRect({ top, left, width: r.width });
    pingAlreadyLocal();
  }

  useEffect(() => setHydrated(true), []);
  useEffect(() => {
    try {
      setSentOnce(localStorage.getItem(SENT_ONCE_KEY) === "1");
    } catch {}
  }, []);
  useEffect(
    () => () => {
      if (nudgeTimer.current) window.clearTimeout(nudgeTimer.current);
    },
    []
  );

  // Clear query params after banners fade (used for sent/error/queued only)
  const clearQuerySoon = (ms = 2800) => {
    setTimeout(() => {
      setParamNoScroll((url) => {
        ["sent", "error", "queued", "compact", "already"].forEach((k) =>
          url.searchParams.delete(k)
        );
      });
    }, ms);
  };

  /* ================================
     Auto-flush queue when truly online
  ================================== */
  useEffect(() => {
    let running = false;

    const normalizeIfStaleQueued = () => {
      setParamNoScroll((url) => {
        if (url.searchParams.get("queued") === "1")
          url.searchParams.delete("queued");
      });
    };

    const flush = async () => {
      if (running) return;
      const online = await isOnline();

      if (online && !hasOutbox()) {
        normalizeIfStaleQueued();
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
            localStorage.setItem(SENT_ONCE_KEY, "1");
          } catch {}
          setSentOnce(true);
          // Compact success when coming from an offline flush
          setParamNoScroll((url) => {
            url.searchParams.set("sent", "1");
            url.searchParams.set("compact", "1");
          });
          clearQuerySoon(2500);
        } else {
          normalizeIfStaleQueued();
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

  /* ================================
     Submit
  ================================== */
  async function onSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const form = e.currentTarget;
    const fd = new FormData(form);

    // block after one success → local nudge only (no URL, no scroll)
    if (sentOnce) {
      pingAlreadyLocal();
      return;
    }

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
          localStorage.setItem(SENT_ONCE_KEY, "1");
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

  // Capture focus/click/enter anywhere in form to trigger local "already" nudge
  const captureAlready = (e: React.SyntheticEvent<HTMLFormElement>) => {
    if (!sentOnce) return;
    const target = e.target as Element | null;
    const el = target ? target.closest("input, textarea, button") : null; // <- no undefined
    showAlreadyOver(el);
  };
  const captureEnter = (e: React.KeyboardEvent<HTMLFormElement>) => {
    if (!sentOnce) return;
    if (e.key === "Enter") {
      e.preventDefault();
      const active = document.activeElement as Element | null;
      const el = active ? active.closest("input, textarea, button") : null;
      showAlreadyOver(el);
    }
  };

  return hydrated ? (
    <form
      ref={formRef}
      method={method}
      action={action}
      onSubmit={onSubmit}
      className="mt-6 grid max-w-xl gap-4 relative"
      autoComplete="on"
      noValidate
      onFocusCapture={captureAlready}
      onClickCapture={captureAlready}
      onKeyDownCapture={captureEnter}
    >
      {/* already nudge (anchored above field, fade, no layout shift) */}
      {anchorRect && (
        <div
          aria-live="polite"
          className={`pointer-events-none fixed z-30 transition-opacity duration-[1200ms] ease-[cubic-bezier(0.4,0,0.2,1)]
                      ${alreadyNudge ? "opacity-100" : "opacity-0"}`}
          style={{
            top: anchorRect.top, // viewport coords (no scrollY)
            left: anchorRect.left,
            transform: "translateX(-50%)",
          }}
        >
          <div
            className="rounded-2xl border border-[#E57C23]/30 bg-black/30 px-6 py-3 text-[#FFEEDB]
                          shadow-[0_0_35px_4px_rgba(229,124,35,0.35)] backdrop-blur-sm text-sm font-medium"
          >
            <span>You've already sent a message.</span>
          </div>
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
          // soft-lock: focusable but immutable
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
        disabled={sending} // not disabled by sentOnce; we intercept
        aria-disabled={sentOnce}
        onClick={(e) => {
          if (sentOnce) {
            e.preventDefault();
            pingAlreadyLocal();
          }
        }}
        className={`mt-2 rounded-full px-6 py-3 font-semibold transition-colors
          ${
            sentOnce
              ? "bg-[#E57C23] text-black opacity-60 cursor-not-allowed"
              : "bg-[#E57C23] text-black hover:bg-black hover:text-[#E57C23]"
          }`}
      >
        {sending ? "Sending…" : "Deploy Request"}
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
