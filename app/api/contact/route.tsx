// app/api/contact/route.tsx
// Purpose: Handle contact form POST; forwards to Resend (or configured mailer).
// Notes: Returns non-2xx on failure; ContactForm treats HTTP 200–303 as success.
import { NextResponse } from "next/server";
import { Resend } from "resend";

export const runtime = "edge";
const resend = new Resend(process.env.RESEND_API_KEY);

// very light email check (enough to block obvious junk)
const emailOk = (s: string) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(s);

export async function POST(req: Request) {
  try {
    // Accept form or JSON
    const ct = req.headers.get("content-type") || "";
    let name = "",
      email = "",
      message = "",
      hp = "";

    if (ct.includes("form")) {
      const form = await req.formData();
      name = (form.get("name") || "").toString().trim();
      email = (form.get("email") || "").toString().trim();
      message = (form.get("message") || "").toString().trim();
      hp = (form.get("website") || "").toString(); // honeypot
    } else {
      const body = await req.json().catch(() => ({} as any));
      name = (body.name || "").toString().trim();
      email = (body.email || "").toString().trim();
      message = (body.message || "").toString().trim();
      hp = (body.website || "").toString(); // honeypot
    }

    // Honeypot
    if (hp) return NextResponse.redirect(new URL("/?sent=1", req.url), 303);

    // Bounds/validation
    if (!name || !emailOk(email) || !message) {
      return NextResponse.redirect(new URL("/?error=1", req.url), 303);
    }
    if (name.length > 100 || email.length > 200 || message.length > 5000) {
      return NextResponse.redirect(new URL("/?error=1", req.url), 303);
    }

    // Send
    await resend.emails.send({
      from: "Crate Bunker <no-reply@cratebunker.com>", // domain must be verified in Resend
      to: ["hello@cratebunker.com"],
      subject: `New Project Request — ${name}`,
      replyTo: email, // Resend supports reply_to (underscore)
      text: `Name: ${name}\nEmail: ${email}\n\n${message}`,
    });

    return NextResponse.redirect(new URL("/?sent=1", req.url), 303);
  } catch (err) {
    if (process.env.NODE_ENV !== "production")
      console.error("contact error", err);
    return NextResponse.redirect(new URL("/?error=1", req.url), 303);
  }
}
