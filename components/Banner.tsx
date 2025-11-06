// components/Banner.tsx
// Purpose: Display post-submit status based on URL flags from contact flow.
// Notes: Two modes — glass success overlay (?sent=1) and compact top bar for
//        error/queued/sent/already. Auto-scroll to top, auto-hide, scrub params.
"use client";

import { useSearchParams } from "next/navigation";
import { useEffect, useRef, useState, useMemo } from "react";
import { CheckCircle, AlertTriangle, Info } from "lucide-react";

/* ================================
   Banner (query-driven feedback)
================================ */
export default function Banner() {
  // --- URL → flags ---------------------------------------------------------
  const sp = useSearchParams();
  /** Memo key for effects that depend on the full query string. */
  const searchKey = useMemo(() => sp.toString(), [sp]);

  /** Status flags derived from query params (strict "1"). */
  const isError = sp.get("error") === "1";
  const isSent = sp.get("sent") === "1";
  const isQueued = sp.get("queued") === "1";
  const compact = sp.get("compact") === "1";
  const isAlready = sp.get("already") === "1";

  /** Mode selection: full glass success vs compact banner. */
  const showGlassSent = isSent && !compact && !isError && !isQueued;
  const showCompact =
    !showGlassSent && (isError || isQueued || isSent || isAlready);

  // --- Mount/visibility state ----------------------------------------------
  const [mounted, setMounted] = useState(showGlassSent || showCompact);
  const [visible, setVisible] = useState(showGlassSent || showCompact);
  const containerRef = useRef<HTMLDivElement | null>(null);

  /* ================================
     Smooth scroll helper
     - JS-driven scroll-to-top; cancels on user input.
     - Respects reduced motion.
  ================================= */
  const scrollingRef = useRef(false);
  function smoothScrollToTop(ms = 1000) {
    if (scrollingRef.current) return;
    if (!showGlassSent && !showCompact) return;

    // Reduced motion → no animation.
    if (window.matchMedia?.("(prefers-reduced-motion: reduce)").matches) {
      window.scrollTo(0, 0);
      return;
    }

    const start = window.scrollY;
    if (start < 24) return;

    const root = document.documentElement;
    const prevBehavior = root.style.scrollBehavior;
    root.style.scrollBehavior = "auto";

    scrollingRef.current = true;
    const startTime = performance.now();
    const ease = (t: number) => 1 - Math.pow(1 - t, 3);

    let stopped = false;
    const stop = () => {
      if (stopped) return;
      stopped = true;
      scrollingRef.current = false;
      root.style.scrollBehavior = prevBehavior;
      window.removeEventListener("wheel", stop as any);
      window.removeEventListener("touchstart", stop as any);
    };
    // Cancel animation on manual input.
    window.addEventListener("wheel", stop as any, { passive: true } as any);
    window.addEventListener(
      "touchstart",
      stop as any,
      { passive: true } as any
    );

    const tick = (now: number) => {
      if (stopped) return;
      const p = Math.min(1, (now - startTime) / ms);
      const y = Math.round(start * (1 - ease(p)));
      window.scrollTo(0, y);
      if (p < 1) requestAnimationFrame(tick);
      else stop();
    };
    requestAnimationFrame(tick);
  }

  // On appear: scroll into view (skip for "already" compact).
  useEffect(() => {
    if (showGlassSent || (showCompact && !isAlready)) smoothScrollToTop(800);
  }, [showGlassSent, showCompact, isAlready, searchKey]);

  /* ================================
     URL param cleanup
     - Remove banner flags after dismissal.
  ================================= */
  const clearParams = () => {
    try {
      const url = new URL(window.location.href);
      ["sent", "error", "queued", "compact", "already"].forEach((k) =>
        url.searchParams.delete(k)
      );
      window.history.replaceState({}, "", url.toString());
    } catch {}
  };

  /* ================================
     Show → dwell → hide cycle
     - Mount/unmount with small fade.
     - Variant-based dwell timing.
  ================================= */
  useEffect(() => {
    // Hide path (no mode active).
    if (!(showGlassSent || showCompact)) {
      setVisible(false);
      const t = setTimeout(() => setMounted(false), 200);
      return () => clearTimeout(t);
    }

    // Show path.
    setMounted(true);
    requestAnimationFrame(() => setVisible(true));

    // Per-variant dwell ms.
    const hideMs = isError
      ? 4000
      : isQueued || compact
      ? 2500
      : isAlready
      ? 2800
      : showGlassSent
      ? 1800
      : 2600;

    const t1 = setTimeout(() => setVisible(false), hideMs);
    const t2 = setTimeout(() => {
      setMounted(false);
      clearParams();
    }, hideMs + 220);
    return () => {
      clearTimeout(t1);
      clearTimeout(t2);
    };
  }, [
    searchKey,
    showGlassSent,
    showCompact,
    isError,
    isQueued,
    compact,
    isAlready,
  ]);

  // Nothing to show.
  if (!mounted) return null;

  /* ================================
     Glass success overlay (?sent=1)
  ================================= */
  if (showGlassSent) {
    const boxClasses =
      "bg-[#E57C23]/20 border-[#E57C23]/40 text-[#FFEEDB] " +
      "shadow-[0_0_25px_2px_rgba(229,124,35,0.33)] " +
      "flex items-center gap-3 rounded-2xl px-9 py-7 text-lg font-medium " +
      "border backdrop-blur-xl will-change-transform will-change-opacity";

    return (
      <div
        ref={containerRef}
        className={`fixed inset-0 z-50 flex items-center justify-center transition-opacity duration-500 ${
          visible ? "opacity-100" : "opacity-0"
        }`}
        style={{ pointerEvents: "none" }}
        aria-live="polite"
        role="status"
      >
        {/* lighter backdrop */}
        <div className="absolute inset-0 bg-black/30 backdrop-blur-[1.5px]" />
        <div className={boxClasses}>
          <CheckCircle className="w-7 h-7 text-[#E57C23]" />
          <span>Message sent successfully — we’ll reply soon.</span>
        </div>
      </div>
    );
  }

  /* ================================
     Compact top bar (error/queued/already/sent)
  ================================= */
  const inner =
    "mx-auto flex max-w-3xl items-center gap-3 rounded-xl border px-4 py-3 text-sm shadow-lg";
  const cls = isError
    ? `${inner} border-red-400/40 bg-red-500/10 text-red-300`
    : isQueued
    ? `${inner} border-yellow-400/40 bg-yellow-500/10 text-yellow-300`
    : isAlready
    ? `${inner} border-slate-400/30 bg-white/5 text-slate-200`
    : `${inner} border-[#E57C23]/40 bg-[#E57C23]/10 text-[#E57C23]`;

  return (
    <div
      className={`fixed inset-x-0 top-0 z-50 flex justify-center px-4 py-3 transition-all duration-200 ${
        visible ? "opacity-100 translate-y-0" : "opacity-0 -translate-y-2"
      }`}
      aria-live="polite"
      role="status"
    >
      <div className={cls}>
        {isError ? (
          <AlertTriangle className="h-7 w-7" />
        ) : isQueued ? (
          <AlertTriangle className="h-7 w-7" />
        ) : isAlready ? (
          <Info className="h-7 w-7" />
        ) : (
          <CheckCircle className="h-7 w-7" />
        )}
        <span>
          {isError
            ? "Something went wrong. Please try again."
            : isQueued
            ? "You’re offline. Message saved — it’ll auto-send when you’re back online."
            : isAlready
            ? "You already sent a message."
            : "Message sent successfully — we’ll reply soon."}
        </span>
      </div>
    </div>
  );
}
