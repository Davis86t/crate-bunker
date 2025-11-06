// components/ContactFormQueued.tsx
'use client';
import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';

type Payload = { name: string; email: string; message: string; website?: string };
const KEY = 'cb:contact-outbox';

export default function ContactFormQueued() {
  const [online, setOnline] = useState(true);
  const [status, setStatus] = useState<'idle'|'queued'|'sending'|'sent'|'error'>('idle');
  const router = useRouter();

  useEffect(() => {
    const sync = () => setOnline(navigator.onLine);
    sync();
    window.addEventListener('online', sync);
    window.addEventListener('offline', sync);
    return () => { window.removeEventListener('online', sync); window.removeEventListener('offline', sync); };
  }, []);

  // Flush queued payload when we regain connectivity
  useEffect(() => {
    if (!online) return;
    const raw = localStorage.getItem(KEY);
    if (!raw) return;
    (async () => {
      setStatus('sending');
      try {
        const ok = await send(JSON.parse(raw) as Payload);
        if (ok) {
          localStorage.removeItem(KEY);
          setStatus('sent');
          router.replace('/?sent=1'); // no full navigation, no SW dependency
        } else {
          setStatus('error');
        }
      } catch { setStatus('error'); }
    })();
  }, [online, router]);

  async function send(payload: Payload) {
    const res = await fetch('/api/contact', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'X-Requested-With': 'fetch' },
      body: JSON.stringify(payload),
      redirect: 'manual', // DON’T auto-follow 303; we handle it
    });
    return res.ok || res.status === 303;
  }

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault(); // hard stop navigation
    const fd = new FormData(e.currentTarget);
    const payload: Payload = {
      name: (fd.get('name') || '').toString(),
      email: (fd.get('email') || '').toString(),
      message: (fd.get('message') || '').toString(),
      website: (fd.get('website') || '').toString(), // honeypot
    };

    if (!online) {
      localStorage.setItem(KEY, JSON.stringify(payload));
      setStatus('queued');
      alert('Saved offline. We’ll send it when you reconnect.');
      return; // NO navigation → no dino
    }

    setStatus('sending');
    try {
      const ok = await send(payload);
      setStatus(ok ? 'sent' : 'error');
      if (ok) router.replace('/?sent=1'); // avoid full page load
    } catch { setStatus('error'); }
  }

  return (
    // IMPORTANT: no action/method here; we fully control submission
    <form onSubmit={onSubmit} className="grid gap-3" noValidate>
      <input name="name" placeholder="Name" required />
      <input name="email" type="email" placeholder="Email" required />
      <textarea name="message" placeholder="Message" required />
      <input name="website" style={{ display: 'none' }} tabIndex={-1} autoComplete="off" />
      <button className="rounded-full bg-[#E57C23] px-5 py-2 font-semibold text-black">
        {online ? (status === 'sending' ? 'Sending…' : 'Send') : 'Save & Auto-Send'}
      </button>
      {status === 'queued' && <p className="text-xs text-gray-400">Queued. Will auto-send when online.</p>}
      {status === 'error' && <p className="text-xs text-red-400">Couldn’t send. Try again when online.</p>}
    </form>
  );
}
