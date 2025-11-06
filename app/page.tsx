// app/page.tsx
// Purpose: Landing page hero + contact section.
// Notes: Renders <Banner/> again safely; accepts URL flags via searchParams.

import ContactForm from "@/components/ContactForm";
import Banner from "@/components/Banner";

export default async function Page({
  searchParams,
}: {
  searchParams?: {
    sent?: string;
    error?: string;
    queued?: string;
    compact?: string;
    already?: string;
  };
}) {
  // Derive simple flags if needed (kept minimal to avoid logic churn)
  const sp = await searchParams;
  const sent = sp?.sent === "1";
  const error = sp?.error === "1";

  return (
    <main className="min-h-screen bg-[#2B2B2B] text-[#F3F3F3]">
      {/* Safe to render; Banner ignores if no URL flags are set */}
      <Banner />

      {/* HERO */}
      <section className="mx-auto max-w-6xl px-6 pt-20 pb-14">
        <h1 className="text-4xl md:text-6xl font-extrabold tracking-tight">
          Built. Secured. Deployed.
        </h1>
        <p className="mt-4 max-w-2xl text-white/80">
          Crate Bunker is a modern, tactical web presence for fast, reliable
          client sites — Next.js, TypeScript, Tailwind.
        </p>
        <div className="mt-8 flex gap-3">
          <a
            href="#contact"
            className="rounded-full bg-[#E57C23] px-6 py-3 font-semibold text-black"
          >
            Start a project
          </a>
          <a
            href="/sitemap.xml"
            className="rounded-full border border-white/20 px-6 py-3 font-semibold"
          >
            Learn more
          </a>
        </div>
      </section>

      {/* FEATURES */}
      <section className="mx-auto max-w-6xl px-6 py-10 grid gap-6 md:grid-cols-3">
        {[
          {
            t: "Performant",
            d: "Next.js App Router, optimized builds, image & font pipeline.",
          },
          {
            t: "Reliable",
            d: "Offline-aware contact flow with queue + 1h resend lock.",
          },
          {
            t: "Deploy-ready",
            d: "Vercel-first, CI passes on typecheck/lint/build.",
          },
        ].map((f) => (
          <div
            key={f.t}
            className="rounded-2xl border border-white/10 p-5 bg-white/5"
          >
            <h3 className="font-semibold">{f.t}</h3>
            <p className="mt-1 text-sm text-white/70">{f.d}</p>
          </div>
        ))}
      </section>
      {/* CONTACT */}
      <section id="contact" className="mx-auto max-w-6xl px-6 py-16">
        {/* ContactForm handles offline queue, 1h lock, and URL-based feedback */}
        <ContactForm />
      </section>
    </main>
  );
}
