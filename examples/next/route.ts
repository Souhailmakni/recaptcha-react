// Example Next.js Route Handler that verifies the token server-side.
// app/api/contact/route.ts

import { NextResponse } from 'next/server'

export async function POST(request: Request) {
  const body = await request.json()
  const token = body['g-recaptcha-response']

  if (!token) {
    return NextResponse.json({ error: 'Missing reCAPTCHA token' }, { status: 422 })
  }

  const verify = await fetch('https://www.google.com/recaptcha/api/siteverify', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      secret: process.env.RECAPTCHA_SECRET_KEY ?? '',
      response: token,
    }),
  }).then((r) => r.json())

  if (!verify.success) {
    return NextResponse.json({ error: 'Failed reCAPTCHA verification' }, { status: 422 })
  }

  // ... persist the message, send the email, etc.
  return NextResponse.json({ ok: true })
}
