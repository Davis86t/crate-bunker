// app/page.tsx
// Purpose: Homepage shell + hero.
// Notes: Keep above-the-fold light; avoid blocking fonts/images.

import ContactForm from "@/components/ContactForm";
import Banner from "@/components/Banner";

export default function Page({
  /* params, */ searchParams: _searchParams,
}: {
  searchParams?: URLSearchParams;
}) {
  return (
    <main className="min-h-screen bg-[#2B2B2B] text-[#F3F3F3]">
      <Banner />

      {/* HERO */}
      <section className="mx-auto max-w-6xl px-6 pt-24 pb-12">
        <span className="inline-block rounded-full border border-white/10 bg-[#1E1E1E] px-3 py-1 text-xs text-[#C5B693]">
          Crate Bunker™
        </span>
        <h1 className="mt-6 text-5xl font-extrabold tracking-wide uppercase">
          Built. Secured. Deployed.
        </h1>
        <p className="mt-3 max-w-2xl text-[#E0E0E0]">
          Crate Bunker designs, builds, and maintains digital infrastructure
          that never cracks under pressure.
        </p>
        <div className="mt-8 flex gap-3">
          <a
            href="#contact"
            className="rounded-full bg-[#E57C23] px-6 py-3 font-semibold text-black hover:bg-black hover:text-[#E57C23] transition-colors"
          >
            Start Your Build
          </a>
          <a
            href="#about"
            className="rounded-full border border-[#C5B693]/40 px-6 py-3 font-semibold hover:bg-[#3A3A3A] transition-colors"
          >
            View Work
          </a>
        </div>
      </section>

      {/* ABOUT */}
      <section id="about" className="border-t border-white/5 bg-[#242424]">
        <div className="mx-auto max-w-6xl px-6 py-14">
          <h2 className="text-2xl font-bold uppercase tracking-wide">
            We build reliable web systems.
          </h2>
          <p className="mt-3 max-w-3xl text-[#D8D8D8]">
            From first concept to long-term maintenance, Crate Bunker delivers
            dependable websites, clean code, and secure hosting.
          </p>
          <ul className="mt-8 grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
            {[
              "Custom Web Development",
              "Secure Hosting & Maintenance",
              "Performance Optimization",
              "Technical Support",
            ].map((t) => (
              <li
                key={t}
                className="rounded-xl border border-white/10 bg-[#2B2B2B] p-5"
              >
                {t}
              </li>
            ))}
          </ul>
        </div>
      </section>

      {/* CONTACT */}
      <section id="contact" className="border-t border-white/5">
        <div className="mx-auto max-w-6xl px-6 py-14">
          <h2 className="text-2xl font-bold uppercase tracking-wide">
            Need a reliable build partner?
          </h2>
          <p className="mt-2 text-[#D8D8D8]">
            Let’s talk about your next deployment.
          </p>

          <ContactForm />
        </div>
      </section>

      {/* FOOTER */}
      <footer className="border-t border-white/5 bg-[#1E1E1E]">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-6 py-8 text-sm text-[#CFCFCF]">
          <span>© 2025 Crate Bunker. All rights reserved.</span>
          <span>Site by Crate Bunker™</span>
        </div>
      </footer>
    </main>
  );
}
