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
    responses.set(id, '')
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

describe('ReactRecaptcha', () => {
  beforeEach(() => {
    document.getElementById('google-recaptcha-script')?.remove()
    delete (window as any).grecaptcha
  })

  afterEach(() => {
    cleanup()
    vi.restoreAllMocks()
  })

  it('renders a container', () => {
    const { container } = render(<ReactRecaptcha sitekey="test-key" />)
    expect(container.querySelector('.react-recaptcha')).toBeInTheDocument()
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

  it('renders the widget when grecaptcha is already present', async () => {
    const { render: renderSpy } = installGrecaptchaMock()
    render(<ReactRecaptcha sitekey="test-key" theme="dark" size="compact" />)
    await waitFor(() => expect(renderSpy).toHaveBeenCalled())
    const params = (window as any).__lastParams
    expect(params.sitekey).toBe('test-key')
    expect(params.theme).toBe('dark')
    expect(params.size).toBe('compact')
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

  it('exposes reset / execute / getResponse through the ref', async () => {
    installGrecaptchaMock()
    const ref = createRef<RecaptchaHandle>()
    render(<ReactRecaptcha ref={ref} sitekey="test-key" />)
    await waitFor(() => expect(ref.current?.isLoaded).toBe(true))

    ref.current!.reset()
    ref.current!.execute()
    expect(window.grecaptcha!.reset).toHaveBeenCalled()
    expect(window.grecaptcha!.execute).toHaveBeenCalled()
    expect(ref.current!.getResponse()).toBe('')
    expect(typeof ref.current!.widgetId).toBe('number')
  })

  it('fires onError if the widget never loads before the timeout', async () => {
    vi.useFakeTimers()
    const onError = vi.fn()
    render(<ReactRecaptcha sitekey="test-key" loadingTimeout={1000} onError={onError} />)
    vi.advanceTimersByTime(1000)
    expect(onError).toHaveBeenCalled()
    vi.useRealTimers()
  })
})
