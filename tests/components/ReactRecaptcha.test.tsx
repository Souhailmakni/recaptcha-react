import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import { createRef } from 'react'
import { render, cleanup, waitFor } from '@testing-library/react'
import { ReactRecaptcha } from '../../src/components/ReactRecaptcha'
import type { RecaptchaHandle } from '../../src/types'

function installGrecaptchaMock() {
  const responses = new Map<number, string>()
  let nextId = 0
  const render = vi.fn((_el: HTMLElement, params: Record<string, unknown>) => {
    const id = nextId++
    // Stash callbacks so the test can trigger them.
    ;(window as any).__lastParams = params
    responses.set(id, 'token-' + id)
    return id
  })
  ;(window as any).grecaptcha = {
    render,
    reset: vi.fn((id: number) => responses.set(id, '')),
    execute: vi.fn(),
    getResponse: vi.fn((id: number) => responses.get(id) ?? ''),
  }
  return { render }
}

/** Find an instance's onload callback (name is randomised per instance). */
function findOnLoadCallback(): (() => void) | undefined {
  const key = Object.keys(window).find((k) => k.startsWith('__recaptchaOnLoad_'))
  return key ? (window as any)[key] : undefined
}

describe('ReactRecaptcha', () => {
  beforeEach(() => {
    document.getElementById('google-recaptcha-script')?.remove()
    delete (window as any).grecaptcha
    delete (window as any).__lastParams
  })

  afterEach(() => {
    cleanup()
    vi.restoreAllMocks()
  })

  it('renders a container', () => {
    const { container } = render(<ReactRecaptcha sitekey="test-key" />)
    expect(container.querySelector('.react-recaptcha')).toBeInTheDocument()
  })

  it('applies an extra className', () => {
    const { container } = render(<ReactRecaptcha sitekey="test-key" className="mine" />)
    expect(container.querySelector('.react-recaptcha.mine')).toBeInTheDocument()
  })

  it('injects the reCAPTCHA script exactly once', () => {
    render(
      <>
        <ReactRecaptcha sitekey="key-a" />
        <ReactRecaptcha sitekey="key-b" />
      </>
    )
    const scripts = document.querySelectorAll('#google-recaptcha-script')
    expect(scripts.length).toBe(1)
  })

  it('adds the hl param when a language is given', () => {
    render(<ReactRecaptcha sitekey="test-key" language="fr" />)
    const script = document.getElementById('google-recaptcha-script') as HTMLScriptElement
    expect(script.src).toContain('&hl=fr')
  })

  it('renders the widget when grecaptcha is already present', async () => {
    const { render: renderSpy } = installGrecaptchaMock()
    const onWidgetId = vi.fn()
    render(
      <ReactRecaptcha sitekey="test-key" theme="dark" size="compact" onWidgetId={onWidgetId} />
    )
    await waitFor(() => expect(renderSpy).toHaveBeenCalled())
    const params = (window as any).__lastParams
    expect(params.sitekey).toBe('test-key')
    expect(params.theme).toBe('dark')
    expect(params.size).toBe('compact')
    expect(onWidgetId).toHaveBeenCalledWith(expect.any(Number))
  })

  it('renders via the global onload callback after the script loads', async () => {
    render(<ReactRecaptcha sitekey="test-key" />)
    const onload = findOnLoadCallback()
    expect(onload).toBeTypeOf('function')

    const { render: renderSpy } = installGrecaptchaMock()
    onload!()
    await waitFor(() => expect(renderSpy).toHaveBeenCalled())
  })

  it('polls for grecaptcha when the script tag already exists', () => {
    vi.useFakeTimers()
    // Simulate a script injected by a previous instance.
    const existing = document.createElement('script')
    existing.id = 'google-recaptcha-script'
    document.head.appendChild(existing)

    render(<ReactRecaptcha sitekey="test-key" />)
    const { render: renderSpy } = installGrecaptchaMock()
    vi.advanceTimersByTime(100)

    expect(renderSpy).toHaveBeenCalled()
    vi.useRealTimers()
  })

  it('fires onVerify and onChange when the challenge is solved', async () => {
    installGrecaptchaMock()
    const onVerify = vi.fn()
    const onChange = vi.fn()
    render(<ReactRecaptcha sitekey="test-key" onVerify={onVerify} onChange={onChange} />)
    await waitFor(() => expect((window as any).__lastParams).toBeDefined())

    const { callback } = (window as any).__lastParams
    ;(window as any)[callback]('the-token')

    expect(onVerify).toHaveBeenCalledWith('the-token')
    expect(onChange).toHaveBeenCalledWith('the-token')
  })

  it('clears the token on expire', async () => {
    installGrecaptchaMock()
    const onExpire = vi.fn()
    const onChange = vi.fn()
    render(<ReactRecaptcha sitekey="test-key" onExpire={onExpire} onChange={onChange} />)
    await waitFor(() => expect((window as any).__lastParams).toBeDefined())

    const expiredCb = (window as any).__lastParams['expired-callback']
    ;(window as any)[expiredCb]()

    expect(onExpire).toHaveBeenCalled()
    expect(onChange).toHaveBeenCalledWith('')
  })

  it('clears the token and reports the error on the error callback', async () => {
    installGrecaptchaMock()
    const onError = vi.fn()
    const onChange = vi.fn()
    render(<ReactRecaptcha sitekey="test-key" onError={onError} onChange={onChange} />)
    await waitFor(() => expect((window as any).__lastParams).toBeDefined())

    const errorCb = (window as any).__lastParams['error-callback']
    ;(window as any)[errorCb]()

    expect(onError).toHaveBeenCalled()
    expect(onChange).toHaveBeenCalledWith('')
  })

  it('exposes reset / execute / getResponse through the ref', async () => {
    installGrecaptchaMock()
    const onChange = vi.fn()
    const ref = createRef<RecaptchaHandle>()
    render(<ReactRecaptcha ref={ref} sitekey="test-key" onChange={onChange} />)
    await waitFor(() => expect(ref.current?.isLoaded).toBe(true))

    expect(ref.current!.getResponse()).toBe('token-0')
    expect(typeof ref.current!.widgetId).toBe('number')

    ref.current!.reset()
    ref.current!.execute()
    expect(window.grecaptcha!.reset).toHaveBeenCalled()
    expect(window.grecaptcha!.execute).toHaveBeenCalled()
    expect(onChange).toHaveBeenCalledWith('') // reset clears the controlled value
    expect(ref.current!.getResponse()).toBe('') // cleared after reset
  })

  it('stops polling if unmounted before grecaptcha loads (v2)', () => {
    vi.useFakeTimers()
    const existing = document.createElement('script')
    existing.id = 'google-recaptcha-script'
    document.head.appendChild(existing)

    const { unmount } = render(<ReactRecaptcha sitekey="test-key" />)
    unmount() // dispose while waitForGrecaptcha is polling
    installGrecaptchaMock()
    expect(() => vi.advanceTimersByTime(300)).not.toThrow()
    vi.useRealTimers()
  })

  it('execute() resolves with the token when the next verify fires', async () => {
    installGrecaptchaMock()
    const ref = createRef<RecaptchaHandle>()
    render(<ReactRecaptcha ref={ref} sitekey="test-key" />)
    await waitFor(() => expect(ref.current?.isLoaded).toBe(true))

    const pending = ref.current!.execute()
    const cb = (window as any).__lastParams.callback
    ;(window as any)[cb]('verified-token')
    await expect(pending).resolves.toBe('verified-token')
  })

  it('imperative methods are no-ops before the widget renders', () => {
    const ref = createRef<RecaptchaHandle>()
    render(<ReactRecaptcha ref={ref} sitekey="test-key" />)
    // No grecaptcha installed, so nothing has rendered.
    expect(ref.current!.widgetId).toBeNull()
    expect(ref.current!.isLoaded).toBe(false)
    expect(ref.current!.getResponse()).toBe('')
    expect(() => {
      ref.current!.reset()
      ref.current!.execute()
    }).not.toThrow()
  })

  it('calls onError when the script fails to load', () => {
    const onError = vi.fn()
    render(<ReactRecaptcha sitekey="test-key" onError={onError} />)
    const script = document.getElementById('google-recaptcha-script') as HTMLScriptElement
    script.onerror?.(new Event('error'))
    expect(onError).toHaveBeenCalled()
  })

  it('fires onError if the widget never loads before the timeout', () => {
    vi.useFakeTimers()
    const onError = vi.fn()
    render(<ReactRecaptcha sitekey="test-key" loadingTimeout={1000} onError={onError} />)
    vi.advanceTimersByTime(1000)
    expect(onError).toHaveBeenCalled()
    vi.useRealTimers()
  })

  it('re-renders the widget when the sitekey changes', async () => {
    const { render: renderSpy } = installGrecaptchaMock()
    const { rerender } = render(<ReactRecaptcha sitekey="key-a" />)
    await waitFor(() => expect(renderSpy).toHaveBeenCalledTimes(1))

    rerender(<ReactRecaptcha sitekey="key-b" />)
    await waitFor(() => expect(renderSpy).toHaveBeenCalledTimes(2))
    expect((window as any).__lastParams.sitekey).toBe('key-b')
  })
})
