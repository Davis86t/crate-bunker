// components/Banner.tsx
// Purpose: Global submit feedback banners.
// - Glass overlay for direct online success (sent=1, non-compact)
// - Compact top bar for queued/flush/error/already
// - Smooth scroll to top on show (except "already"), no snap-jank

"use client";
import { useSearchParams } from "next/navigation";
import { useEffect, useRef, useState, useMemo } from "react";
import { CheckCircle, AlertTriangle, Info } from "lucide-react";

export default function Banner() {
  // Read query params safely on the client
  const sp = useSearchParams();
  const searchKey = useMemo(() => sp.toString(), [sp]); // force effects to re-run if params change

  // Flags controlled by URL params
  const isError = sp.get("error") === "1";
  const isSent = sp.get("sent") === "1";
  const isQueued = sp.get("queued") === "1";
  const compact = sp.get("compact") === "1";
  const isAlready = sp.get("already") === "1";

  // Show the big glass success if it's a direct online send (no compact/error/queued)
  const showGlassSent = isSent && !compact && !isError && !isQueued;
  // Otherwise, show a compact top bar for queued/error/already/sent(from flush)
  const showCompact =
    !showGlassSent && (isError || isQueued || isSent || isAlready);

  // Mount/visibility (fade in/out)
  const [mounted, setMounted] = useState(showGlassSent || showCompact);
  const [visible, setVisible] = useState(showGlassSent || showCompact);
  const containerRef = useRef<HTMLDivElement | null>(null);

  // Smooth scroll helper (prevents CSS smooth from fighting JS)
  const scrollingRef = useRef(false);
  function smoothScrollToTop(ms = 1100) {
    if (scrollingRef.current) return;
    if (!showGlassSent && !showCompact) return;

    if (window.matchMedia?.("(prefers-reduced-motion: reduce)").matches) {
      window.scrollTo(0, 0);
      return;
    }

    const start = window.scrollY;
    if (start < 24) return; // near top; do nothing

    const root = document.documentElement;
    const prevBehavior = root.style.scrollBehavior;
    root.style.scrollBehavior = "auto";

    scrollingRef.current = true;
    const t0 = performance.now();
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

    window.addEventListener("wheel", stop as any, { passive: true } as any);
    window.addEventListener(
      "touchstart",
      stop as any,
      { passive: true } as any
    );

    const tick = (now: number) => {
      if (stopped) return;
      const p = Math.min(1, (now - t0) / ms);
      const y = Math.round(start * (1 - ease(p)));
      window.scrollTo(0, y);
      if (p < 1) requestAnimationFrame(tick);
      else stop();
    };

    requestAnimationFrame(tick);
  }

  // Scroll to top on show — but **skip** when it's the "already" info
  useEffect(() => {
    if (showGlassSent || (showCompact && !isAlready)) smoothScrollToTop(1100);
  }, [showGlassSent, showCompact, isAlready, searchKey]);

  // Wipe params after fade to keep URL clean
  const clearParams = () => {
    try {
      const url = new URL(window.location.href);
      ["sent", "error", "queued", "compact", "already"].forEach((k) =>
        url.searchParams.delete(k)
      );
      window.history.replaceState({}, "", url.toString());
    } catch {}
  };

  // Enter → hold → fade → unmount
  useEffect(() => {
    if (!(showGlassSent || showCompact)) {
      setVisible(false);
      const t = setTimeout(() => setMounted(false), 200);
      return () => clearTimeout(t);
    }
    setMounted(true);
    requestAnimationFrame(() => setVisible(true));

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

  if (!mounted) return null;

  // ===== GLASS SUCCESS OVERLAY =====
  if (showGlassSent) {
    const boxClasses = [
      "bg-[#E57C23]/20",
      "border-[#E57C23]/40",
      "text-[#FFEEDB]",
      "shadow-[0_0_25px_2px_rgba(229,124,35,0.33)]",
      "flex items-center gap-3 rounded-2xl px-9 py-7 text-lg font-medium",
      "border backdrop-blur-xl will-change-transform will-change-opacity",
    ].join(" ");

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
        {/* Softened backdrop */}
        <div className="absolute inset-0 bg-black/30 backdrop-blur-[1.5px]" />
        <div className={boxClasses}>
          <CheckCircle className="w-7 h-7 text-[#E57C23]" />
          <span>Message sent successfully — we’ll reply soon.</span>
        </div>
      </div>
    );
  }

  // ===== COMPACT TOP BAR =====
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
