// components/ContactForm.tsx
// Purpose: Collect + submit contact messages with offline queue + 1h resend cooldown.
// Notes:
// - If offline (or network fails), queue payload in localStorage (cb:contact-outbox) for later auto-flush.
// - Uses a 1-hour cooldown via localStorage (cb:contact-last-sent) to prevent rapid re-sends.
// - Honeypot "website" blocks obvious bots.
// - Treat HTTP 303 from /api/contact as success (the API redirects on success by design).

'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';

type Payload = {
  name: string;
  email: string;
  message: string;
  website?: string; // honeypot
};

const OUTBOX_KEY = 'cb:contact-outbox';          // array of queued Payloads
const LAST_SENT_KEY = 'cb:contact-last-sent';    // number (ms since epoch)
const COOLDOWN_MS = 60 * 60 * 1000;              // 1 hour

export default function ContactForm() {
  // ----- FORM STATE -----
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [message, setMessage] = useState('');
  const websiteRef = useRef<HTMLInputElement | null>(null); // honeypot (uncontrolled)
  const [submitting, setSubmitting] = useState(false);

  // ----- DERIVED: COOLDOWN & ONLINE STATE -----
  const [now, setNow] = useState(() => Date.now());
  const online = typeof navigator !== 'undefined' ? navigator.onLine : true;

  // tick every ~15s so cooldown label can update without reload
  useEffect(() => {
    const t = setInterval(() => setNow(Date.now()), 15000);
    return () => clearInterval(t);
  }, []);

  const cooldownRemaining = useMemo(() => {
    if (typeof window === 'undefined') return 0;
    const last = Number(localStorage.getItem(LAST_SENT_KEY) || 0);
    const rem = last + COOLDOWN_MS - now;
    return rem > 0 ? rem : 0;
  }, [now]);

  const inCooldown = cooldownRemaining > 0;

  // ----- HELPERS: OUTBOX READ/WRITE -----
  const readOutbox = useCallback((): Payload[] => {
    if (typeof window === 'undefined') return [];
    try {
      return JSON.parse(localStorage.getItem(OUTBOX_KEY) || '[]') as Payload[];
    } catch {
      return [];
    }
  }, []);

  const writeOutbox = useCallback((items: Payload[]) => {
    if (typeof window === 'undefined') return;
    localStorage.setItem(OUTBOX_KEY, JSON.stringify(items));
  }, []);

  const enqueue = useCallback((p: Payload) => {
    const q = readOutbox();
    q.push(p);
    writeOutbox(q);
  }, [readOutbox, writeOutbox]);

  // ----- VALIDATION (minimal) -----
  const isEmail = (e: string) => /.+@.+\..+/.test(e);
  const canSubmit = name.trim() && isEmail(email) && message.trim() && !submitting && !inCooldown;

  // ----- NETWORK SEND (303 counts as success) -----
  const send = useCallback(async (payload: Payload): Promise<boolean> => {
    const res = await fetch('/api/contact', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'X-Requested-With': 'fetch' },
      body: JSON.stringify(payload),
      redirect: 'manual', // we treat a 303 as success without following it here
    });
    return res.ok || res.status === 303 || res.status === 204;
  }, []);

  // ----- SUBMIT HANDLER -----
  const onSubmit = useCallback(async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();

    const payload: Payload = {
      name: name.trim(),
      email: email.trim(),
      message: message.trim(),
      website: websiteRef.current?.value || '', // honeypot
    };

    // quick client validation
    if (!payload.name || !isEmail(payload.email) || !payload.message) return;

    // honeypot trips → behave like success but ignore
    if (payload.website) {
      // pretend sent to avoid teaching bots; do not touch cooldown/outbox
      return;
    }

    // Respect cooldown
    if (inCooldown) return;

    setSubmitting(true);
    try {
      if (!online) {
        // offline: queue and rely on queued flusher + Banner UX
        enqueue(payload);
        // allow UI to show success banner and lockout
        localStorage.setItem(LAST_SENT_KEY, String(Date.now()));
        // optional: nudge UI (page refresh/Router refresh handled elsewhere)
        return;
      }

      const ok = await send(payload);
      if (ok) {
        // lock future sends for 1 hour
        localStorage.setItem(LAST_SENT_KEY, String(Date.now()));
        // clear fields
        setName(''); setEmail(''); setMessage('');
      } else {
        // network responded but not ok → enqueue for safety
        enqueue(payload);
      }
    } catch {
      // fetch failed → enqueue
      enqueue(payload);
    } finally {
      setSubmitting(false);
    }
  }, [name, email, message, inCooldown, online, enqueue, send]);

  // ----- RENDER -----
  const buttonLabel = submitting
    ? 'Sending…'
    : inCooldown
      ? `Cooldown (${Math.ceil(cooldownRemaining / 60000)}m)`
      : online ? 'Send' : 'Send when online';

  return (
    <form onSubmit={onSubmit} className="space-y-4">
      {/* Honeypot (hidden from users) */}
      <input
        ref={websiteRef}
        name="website"
        type="text"
        tabIndex={-1}
        autoComplete="off"
        className="hidden"
        aria-hidden="true"
      />

      {/* Name */}
      <div>
        <label className="block text-sm font-medium">Name</label>
        <input
          value={name}
          onChange={(e) => setName(e.target.value)}
          required
          className="mt-1 w-full rounded-md bg-white/5 px-3 py-2 outline-none ring-1 ring-white/10 focus:ring-2 focus:ring-white/30"
        />
      </div>

      {/* Email */}
      <div>
        <label className="block text-sm font-medium">Email</label>
        <input
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          type="email"
          inputMode="email"
          required
          className="mt-1 w-full rounded-md bg-white/5 px-3 py-2 outline-none ring-1 ring-white/10 focus:ring-2 focus:ring-white/30"
        />
      </div>

      {/* Message */}
      <div>
        <label className="block text-sm font-medium">Message</label>
        <textarea
          value={message}
          onChange={(e) => setMessage(e.target.value)}
          required
          rows={5}
          className="mt-1 w-full rounded-md bg-white/5 px-3 py-2 outline-none ring-1 ring-white/10 focus:ring-2 focus:ring-white/30"
        />
      </div>

      <button
        type="submit"
        disabled={!canSubmit}
        className="rounded-lg bg-white/10 px-4 py-2 text-sm font-medium text-white hover:bg-white/20 disabled:opacity-50"
      >
        {buttonLabel}
      </button>

      {/* Optional helper text */}
      <p className="text-xs text-white/60">
        We’ll send from <code>no-reply@cratebunker.com</code>. If you’re offline, your message will auto-send when you’re back online.
      </p>
    </form>
  );
}
