import { NextResponse } from 'next/server';
import { Resend } from 'resend';

export const runtime = 'edge';
const resend = new Resend(process.env.RESEND_API_KEY);

export async function POST(req: Request) {
  try {
    const form = await req.formData();
    const name = (form.get('name') || '').toString().trim();
    const email = (form.get('email') || '').toString().trim();
    const message = (form.get('message') || '').toString().trim();
    const hp = (form.get('website') || '').toString();

    if (hp) return NextResponse.redirect(new URL('/?sent=1', req.url), 303);
    if (!name || !email || !message)
      return NextResponse.redirect(new URL('/?error=1', req.url), 303);

    await resend.emails.send({
      from: 'Crate Bunker <no-reply@cratebunker.com>',
      to: 'hello@cratebunker.com',
      replyTo: email,
      subject: `New Project Request — ${name}`,
      text: `Name: ${name}\nEmail: ${email}\n\n${message}`,
    });

    return NextResponse.redirect(new URL('/?sent=1', req.url), 303);
  } catch {
    return NextResponse.redirect(new URL('/?error=1', req.url), 303);
  }
}
