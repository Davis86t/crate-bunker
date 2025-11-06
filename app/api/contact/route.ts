// app/api/contact/route.ts
// Stable handler for contact form submissions (Edge runtime + Resend)
// - Accepts JSON or multipart/form-data
// - Honeypot "website" blocks bots
// - Validates name/email/message (length + basic patterns)
// - Uses verified sender: Crate Bunker <no-reply@cratebunker.com>
// - Redirects with URL flags consumed by Banner.tsx
// - GET/HEAD return 204 to bust caches/pings
// - Always uses 303 on success to avoid resubmits

import { NextResponse } from 'next/server'
import { Resend } from 'resend'

export const runtime = 'edge'

const FROM = 'Crate Bunker <no-reply@cratebunker.com>'
const resend = new Resend(process.env.RESEND_API_KEY)
const TO: string[] = ['hello@cratebunker.com'];


type Payload = { name: string; email: string; message: string; website?: string }

// Small helpers
const isEmail = (e: string) => /.+@.+\..+/.test(e)
const sanitize = (s: string) => s.replace(/[\u0000-\u001F\u007F]/g, '').trim()

async function parseRequest(req: Request): Promise<Payload> {
  const ctype = req.headers.get('content-type') || ''
  if (ctype.includes('application/json')) {
    const body = await req.json().catch(() => ({}))
    return { name: body.name ?? '', email: body.email ?? '', message: body.message ?? '', website: body.website ?? '' }
  }
  if (ctype.includes('multipart/form-data') || ctype.includes('application/x-www-form-urlencoded')) {
    const fd = await req.formData()
    return { 
      name: String(fd.get('name') || ''), 
      email: String(fd.get('email') || ''), 
      message: String(fd.get('message') || ''), 
      website: String(fd.get('website') || '') 
    }
  }
  // Fallback try JSON
  try {
    const b = await req.json()
    return { name: b.name ?? '', email: b.email ?? '', message: b.message ?? '', website: b.website ?? '' }
  } catch { return { name: '', email: '', message: '', website: '' } }
}

function badRequest(msg: string) {
  return NextResponse.json({ ok: false, error: msg }, { status: 400 })
}

export async function GET() {
  return new NextResponse(null, { status: 204, headers: { 'cache-control': 'no-store' } })
}

export async function HEAD() {
  return new NextResponse(null, { status: 204, headers: { 'cache-control': 'no-store' } })
}

export async function POST(req: Request) {
  const url = new URL(req.url)
  try {
    const raw = await parseRequest(req)
    const name = sanitize(raw.name || 'Anonymous')
    const email = sanitize(raw.email || '')
    const message = sanitize(raw.message || '')
    const website = (raw.website || '').trim()

    // Honeypot
    if (website) return badRequest('Bot detected.')

    // Basic validation
    if (!name || name.length > 120) return badRequest('Invalid name.')
    if (!isEmail(email) || email.length > 254) return badRequest('Invalid email.')
    if (!message || message.length < 2 || message.length > 4000) return badRequest('Invalid message.')

    if (!process.env.RESEND_API_KEY) {
      return NextResponse.json({ ok: false, error: 'Missing RESEND_API_KEY' }, { status: 500 })
    }

    const to = ['hello@cratebunker.com'] as const;
    const subject = `New contact form submission`

    const html = `
      <div style="font-family:ui-sans-serif,system-ui,-apple-system,Segoe UI,Roboto,Helvetica,Arial;">
        <h2>New Contact Form</h2>
        <p><strong>Name:</strong> {name}</p>
        <p><strong>Email:</strong> {email}</p>
        <pre style="white-space:pre-wrap;border:1px solid #eee;padding:12px;border-radius:8px">{message}</pre>
        <p style="color:#888;font-size:12px">Sent from {url}</p>
      </div>
    `.replace('{name}', name).replace('{email}', email).replace('{message}', message).replace('{url}', url.origin)

    const { error } = await resend.emails.send({
      from: FROM,
      to: TO,
      subject,
      replyTo: email,
      html
    })

    if (error) {
      console.error('Resend error:', error)
      url.searchParams.set('sent', '0')
      url.searchParams.set('error', 'email_failed')
      return NextResponse.redirect(url.toString(), 303)
    }

    url.searchParams.set('sent', '1')
    return NextResponse.redirect(url.toString(), 303)
  } catch (e: unknown) {
    console.error('Contact POST error:', e)
    const url = new URL(req.url)
    url.searchParams.set('sent', '0')
    url.searchParams.set('error', 'server')
    return NextResponse.redirect(url.toString(), 303)
  }
}
