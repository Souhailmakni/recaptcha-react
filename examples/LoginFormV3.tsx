import { useRef } from 'react'
import { ReactRecaptcha, type RecaptchaHandle } from 'recaptcha-react'

/**
 * Example: reCAPTCHA v3 (score-based, no widget). A fresh token is fetched at
 * submit time via execute(action) and sent to the server for verification.
 */
export function LoginFormV3() {
  const captcha = useRef<RecaptchaHandle>(null)

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()

    // Always execute right before submitting: v3 tokens are single-use and
    // expire after about 2 minutes.
    const token = await captcha.current!.execute('login')

    const res = await fetch('/api/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ 'g-recaptcha-response': token }),
    })

    if (!res.ok) {
      // The server rejected the score or the action mismatch.
    }
  }

  return (
    <form onSubmit={handleSubmit}>
      <input name="email" type="email" required />
      <input name="password" type="password" required />

      {/* No visible widget on v3, just the floating badge. */}
      <ReactRecaptcha
        ref={captcha}
        sitekey={import.meta.env.VITE_RECAPTCHA_V3_SITE_KEY}
        version="v3"
      />

      <button type="submit">Log in</button>
    </form>
  )
}
