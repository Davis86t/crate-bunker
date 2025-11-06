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
      {/* … existing hero content … */}

      {/* CONTACT */}
      <section id="contact" className="mx-auto max-w-6xl px-6 py-16">
        {/* ContactForm handles offline queue, 1h lock, and URL-based feedback */}
        <ContactForm />
      </section>
    </main>
  );
}
