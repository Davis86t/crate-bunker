'use client';
import { FormEvent, useState } from 'react';
import { useRouter } from 'next/navigation';

export default function ContactForm() {
  const [sending, setSending] = useState(false);
  const router = useRouter();

  async function onSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setSending(true);
    const form = e.currentTarget;
    const fd = new FormData(form);

    try {
      const res = await fetch('/api/contact', { method: 'POST', body: fd });
      const ok = res.ok;
      // update URL without reload → Banner reads ?sent=1 / ?error=1
      router.replace(ok ? '/?sent=1' : '/?error=1');

      // smooth scroll to top
      requestAnimationFrame(() => {
        window.scrollTo({ top: 0, behavior: 'smooth' });
      });

      if (ok) form.reset();
    } catch {
      router.replace('/?error=1');
      requestAnimationFrame(() => {
        window.scrollTo({ top: 0, behavior: 'smooth' });
      });
    } finally {
      setSending(false);
    }
  }

  return (
    <form method="POST" action="/api/contact" onSubmit={onSubmit} className="mt-6 grid max-w-xl gap-4">
      {/* honeypot (still works server-side if JS is off) */}
      <input type="text" name="website" className="hidden" tabIndex={-1} autoComplete="off" />
      <div>
        <label className="mb-1 block text-sm">Name</label>
        <input name="name" required className="w-full rounded-lg border border-white/10 bg-[#1F1F1F] px-3 py-2" />
      </div>
      <div>
        <label className="mb-1 block text-sm">Email</label>
        <input type="email" name="email" required className="w-full rounded-lg border border-white/10 bg-[#1F1F1F] px-3 py-2" />
      </div>
      <div>
        <label className="mb-1 block text-sm">Message</label>
        <textarea name="message" rows={5} required className="w-full rounded-lg border border-white/10 bg-[#1F1F1F] px-3 py-2" />
      </div>
      <button
        disabled={sending}
        className="mt-2 rounded-full bg-[#E57C23] px-6 py-3 font-semibold text-black hover:bg-black hover:text-[#E57C23] transition-colors disabled:opacity-60"
      >
        {sending ? 'Sending…' : 'Deploy Request'}
      </button>
    </form>
  );
}
