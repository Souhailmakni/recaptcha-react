import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import { createRef } from 'react'
import { render, cleanup, waitFor } from '@testing-library/react'
import { ReactRecaptcha } from '../../src/components/ReactRecaptcha'
import type { RecaptchaHandle } from '../../src/types'

function installV3Mock(token = 'v3-token') {
  const execute = vi.fn((_sitekey: string, opts: { action: string }) => {
    ;(window as any).__lastAction = opts.action
    return Promise.resolve(token)
  })
  ;(window as any).grecaptcha = {
    ready: (cb: () => void) => cb(),
    execute,
    render: vi.fn(),
    reset: vi.fn(),
    getResponse: vi.fn(),
  }
  return { execute }
}

describe('ReactRecaptcha (v3)', () => {
  beforeEach(() => {
    document.querySelectorAll('script[id^="google-recaptcha"]').forEach((s) => s.remove())
    delete (window as any).grecaptcha
    delete (window as any).__lastAction
  })

  afterEach(() => {
    cleanup()
    vi.restoreAllMocks()
  })

  it('loads the v3 script with render=SITE_KEY (not explicit)', () => {
    render(<ReactRecaptcha sitekey="key-123" version="v3" />)
    const script = document.querySelector(
      'script[id^="google-recaptcha-v3-script"]'
    ) as HTMLScriptElement
    expect(script).toBeTruthy()
    expect(script.src).toContain('render=key-123')
    expect(script.src).not.toContain('render=explicit')
  })

  it('does not render a visible widget', () => {
    installV3Mock()
    render(<ReactRecaptcha sitekey="key-123" version="v3" />)
    expect(window.grecaptcha!.render).not.toHaveBeenCalled()
  })

  it('execute(action) resolves the token and fires onVerify/onChange', async () => {
    const { execute } = installV3Mock('the-v3-token')
    const onVerify = vi.fn()
    const onChange = vi.fn()
    const ref = createRef<RecaptchaHandle>()
    render(
      <ReactRecaptcha
        ref={ref}
        sitekey="key-123"
        version="v3"
        onVerify={onVerify}
        onChange={onChange}
      />
    )
    await waitFor(() => expect(ref.current?.isLoaded).toBe(true))

    const token = await ref.current!.execute('login')
    expect(token).toBe('the-v3-token')
    expect(execute).toHaveBeenCalledWith('key-123', { action: 'login' })
    expect(onVerify).toHaveBeenCalledWith('the-v3-token')
    expect(onChange).toHaveBeenCalledWith('the-v3-token')
    expect(ref.current!.getResponse()).toBe('the-v3-token')
    expect(ref.current!.widgetId).toBeNull()
  })

  it('falls back to the action prop when execute() is called with no argument', async () => {
    const { execute } = installV3Mock()
    const ref = createRef<RecaptchaHandle>()
    render(<ReactRecaptcha ref={ref} sitekey="key-123" version="v3" action="checkout" />)
    await waitFor(() => expect(ref.current?.isLoaded).toBe(true))

    await ref.current!.execute()
    expect(execute).toHaveBeenCalledWith('key-123', { action: 'checkout' })
  })

  it('fires onError and rejects when grecaptcha.execute fails', async () => {
    const onError = vi.fn()
    ;(window as any).grecaptcha = {
      ready: (cb: () => void) => cb(),
      execute: vi.fn(() => Promise.reject(new Error('boom'))),
      render: vi.fn(),
      reset: vi.fn(),
      getResponse: vi.fn(),
    }
    const ref = createRef<RecaptchaHandle>()
    render(<ReactRecaptcha ref={ref} sitekey="key-123" version="v3" onError={onError} />)
    await waitFor(() => expect(ref.current?.isLoaded).toBe(true))

    await expect(ref.current!.execute('x')).rejects.toThrow('boom')
    expect(onError).toHaveBeenCalled()
  })

  it('errors from execute if grecaptcha is gone after readiness', async () => {
    installV3Mock()
    const onError = vi.fn()
    const ref = createRef<RecaptchaHandle>()
    render(<ReactRecaptcha ref={ref} sitekey="key-123" version="v3" onError={onError} />)
    await waitFor(() => expect(ref.current?.isLoaded).toBe(true))

    delete (window as any).grecaptcha
    await expect(ref.current!.execute('x')).rejects.toThrow()
    expect(onError).toHaveBeenCalled()
  })

  it('reset clears the last token', async () => {
    installV3Mock('tok')
    const onChange = vi.fn()
    const ref = createRef<RecaptchaHandle>()
    render(<ReactRecaptcha ref={ref} sitekey="key-123" version="v3" onChange={onChange} />)
    await waitFor(() => expect(ref.current?.isLoaded).toBe(true))

    await ref.current!.execute('a')
    expect(ref.current!.getResponse()).toBe('tok')
    ref.current!.reset()
    expect(ref.current!.getResponse()).toBe('')
    expect(onChange).toHaveBeenLastCalledWith('')
  })

  it('injects a badge-hiding style when hideBadge is set', () => {
    installV3Mock()
    render(<ReactRecaptcha sitekey="key-123" version="v3" hideBadge />)
    const style = Array.from(document.querySelectorAll('style')).find((s) =>
      s.textContent?.includes('.grecaptcha-badge')
    )
    expect(style).toBeTruthy()
  })

  it('reuses an already-loaded grecaptcha instead of injecting a second script', () => {
    installV3Mock()
    render(<ReactRecaptcha sitekey="key-123" version="v3" />)
    expect(
      document.querySelectorAll('script[id^="google-recaptcha-v3-script"]').length
    ).toBe(0) // grecaptcha already present, no script injected
  })

  it('becomes ready via script onload when grecaptcha appears after mount', async () => {
    const ref = createRef<RecaptchaHandle>()
    render(<ReactRecaptcha ref={ref} sitekey="key-123" version="v3" />)
    const script = document.querySelector(
      'script[id^="google-recaptcha-v3-script"]'
    ) as HTMLScriptElement
    installV3Mock('tok')
    script.onload?.(new Event('load'))
    await waitFor(() => expect(ref.current?.isLoaded).toBe(true))
  })

  it('polls for grecaptcha when a v3 script already exists', () => {
    vi.useFakeTimers()
    const existing = document.createElement('script')
    existing.id = 'google-recaptcha-v3-script-key-123'
    document.head.appendChild(existing)

    const ref = createRef<RecaptchaHandle>()
    render(<ReactRecaptcha ref={ref} sitekey="key-123" version="v3" />)
    installV3Mock('tok')
    vi.advanceTimersByTime(100)

    expect(ref.current?.isLoaded).toBe(true)
    vi.useRealTimers()
  })

  it('fires onError when the v3 script fails to load', () => {
    const onError = vi.fn()
    render(<ReactRecaptcha sitekey="key-123" version="v3" onError={onError} />)
    const script = document.querySelector(
      'script[id^="google-recaptcha-v3-script"]'
    ) as HTMLScriptElement
    script.onerror?.(new Event('error'))
    expect(onError).toHaveBeenCalled()
  })

  it('defaults the action to "submit" when neither prop nor argument is given', async () => {
    const { execute } = installV3Mock()
    const ref = createRef<RecaptchaHandle>()
    render(<ReactRecaptcha ref={ref} sitekey="key-123" version="v3" />)
    await waitFor(() => expect(ref.current?.isLoaded).toBe(true))

    await ref.current!.execute()
    expect(execute).toHaveBeenCalledWith('key-123', { action: 'submit' })
  })

  it('stops polling if unmounted before grecaptcha appears', () => {
    vi.useFakeTimers()
    const existing = document.createElement('script')
    existing.id = 'google-recaptcha-v3-script-key-123'
    document.head.appendChild(existing)

    const { unmount } = render(<ReactRecaptcha sitekey="key-123" version="v3" />)
    unmount() // dispose while the poll interval is still running
    installV3Mock('tok')
    expect(() => vi.advanceTimersByTime(300)).not.toThrow()
    vi.useRealTimers()
  })

  it('removes the badge-hiding style on unmount', () => {
    installV3Mock()
    const hasBadgeStyle = () =>
      Array.from(document.querySelectorAll('style')).some((s) =>
        s.textContent?.includes('.grecaptcha-badge')
      )
    const { unmount } = render(
      <ReactRecaptcha sitekey="key-123" version="v3" hideBadge />
    )
    expect(hasBadgeStyle()).toBe(true)
    unmount()
    expect(hasBadgeStyle()).toBe(false)
  })
})
