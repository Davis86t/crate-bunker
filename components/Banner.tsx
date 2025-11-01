'use client';
import { useSearchParams } from 'next/navigation';
import { useEffect, useRef, useState } from 'react';
import { CheckCircle, AlertTriangle } from 'lucide-react';

export default function Banner() {
  const sp = useSearchParams();
  const active = sp.get('sent') === '1' || sp.get('error') === '1';
  const isError = sp.get('error') === '1';

  const [mounted, setMounted] = useState(active);
  const [visible, setVisible] = useState(active);
  const containerRef = useRef<HTMLDivElement | null>(null);

  // smooth scroll to top (ease-out cubic)
  useEffect(() => {
    if (!active) return;
    const start = window.scrollY;
    const duration = 700;
    const startTime = performance.now();
    const ease = (t: number) => 1 - Math.pow(1 - t, 3);
    const tick = (now: number) => {
      const p = Math.min((now - startTime) / duration, 1);
      window.scrollTo(0, start * (1 - ease(p)));
      if (p < 1) requestAnimationFrame(tick);
    };
    requestAnimationFrame(tick);
  }, [active]);

  // show → hold → fade (single overlay transition to avoid jank)
  useEffect(() => {
    if (!active) return;
    setMounted(true);
    // start fully visible
    requestAnimationFrame(() => setVisible(true));
    const hold = setTimeout(() => setVisible(false), 1800); // start fade at 1.8s
    return () => clearTimeout(hold);
  }, [active]);

  // unmount AFTER the fade completes (listen once)
  useEffect(() => {
    const node = containerRef.current;
    if (!node) return;
    const onEnd = (e: TransitionEvent) => {
      if (e.target === node && e.propertyName === 'opacity' && !visible) {
        setMounted(false);
      }
    };
    node.addEventListener('transitionend', onEnd);
    return () => node.removeEventListener('transitionend', onEnd);
  }, [visible]);

  if (!mounted) return null;

  const boxClasses =
    (isError
      ? 'bg-red-700/25 border-red-500/50 text-red-100 shadow-[0_0_25px_2px_rgba(239,68,68,0.28)]'
      : 'bg-[#E57C23]/20 border-[#E57C23]/40 text-[#FFEEDB] shadow-[0_0_25px_2px_rgba(229,124,35,0.33)]') +
    ' flex items-center gap-3 rounded-2xl px-9 py-7 text-lg font-medium border backdrop-blur-xl will-change-transform will-change-opacity';

  return (
    <div
      ref={containerRef}
      className={`fixed inset-0 z-50 flex items-center justify-center transition-opacity duration-500 ${
        visible ? 'opacity-100' : 'opacity-0'
      }`}
      // pointer-events none prevents stealing scroll/clicks while showing
      style={{ pointerEvents: 'none' }}
      aria-live="polite"
      role="status"
    >
      {/* keep blur constant; only opacity transitions (less GPU thrash) */}
      <div className="absolute inset-0 bg-black/40 backdrop-blur-[3px]" />
      <div className={boxClasses}>
        {isError ? (
          <AlertTriangle className="w-7 h-7 text-red-300" />
        ) : (
          <CheckCircle className="w-7 h-7 text-[#E57C23]" />
        )}
        <span>
          {isError
            ? 'Something went wrong. Please try again.'
            : 'Message sent successfully — we’ll reply soon.'}
        </span>
      </div>
    </div>
  );
}

