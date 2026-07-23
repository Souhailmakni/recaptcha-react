import { useRef, useState } from 'react'
import { ReactRecaptcha, useRecaptcha, type RecaptchaHandle } from 'recaptcha-react'

/**
 * Example: a contact form that requires a solved reCAPTCHA before submitting.
 * Reads the site key from Vite's env (VITE_RECAPTCHA_SITE_KEY).
 */
export function ContactForm() {
  const captcha = useRef<RecaptchaHandle>(null)
  const { token, isVerified, onVerify, onExpire, onError, reset } = useRecaptcha()
  const [message, setMessage] = useState('')

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    const res = await fetch('/api/contact', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ message, 'g-recaptcha-response': token }),
    })

    if (res.ok) {
      setMessage('')
      reset() // clear the hook state
      captcha.current?.reset() // reset the widget itself
    }
  }

  return (
    <form onSubmit={handleSubmit}>
      <textarea value={message} onChange={(e) => setMessage(e.target.value)} required />

      <ReactRecaptcha
        ref={captcha}
        sitekey={import.meta.env.VITE_RECAPTCHA_SITE_KEY}
        onVerify={onVerify}
        onExpire={onExpire}
        onError={onError}
      />

      <button type="submit" disabled={!isVerified}>
        Send
      </button>
    </form>
  )
}
