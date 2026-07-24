import {
  forwardRef,
  useEffect,
  useImperativeHandle,
  useRef,
} from 'react'
import type { RecaptchaHandle, RecaptchaProps } from '../types'

/**
 * Google reCAPTCHA component for React, supporting both v2 (visible checkbox)
 * and v3 (score-based). Defaults to v2.
 *
 * Loads the reCAPTCHA script once per page and is safe to mount multiple times.
 * Forward a ref to reach the imperative API (`reset`, `execute`, `getResponse`).
 * On v3 there is no widget, so call `execute(action)` on the ref to get a token.
 */
export const ReactRecaptcha = forwardRef<RecaptchaHandle, RecaptchaProps>(
  function ReactRecaptcha(props, ref) {
    const {
      sitekey,
      version = 'v2',
      action = 'submit',
      theme = 'light',
      size = 'normal',
      tabindex = 0,
      loadingTimeout = 30000,
      language = '',
      badge = 'bottomright',
      hideBadge = false,
      isolated = false,
      onChange,
      onVerify,
      onExpire,
      onError,
      onWidgetId,
      className,
    } = props

    const containerRef = useRef<HTMLDivElement | null>(null)
    const widgetIdRef = useRef<number | null>(null)
    const isLoadedRef = useRef(false)
    const lastTokenRef = useRef('')
    // Resolves a pending v2 execute() when the next verify fires.
    const pendingExecuteRef = useRef<((token: string) => void) | null>(null)
    // Resolves once grecaptcha is ready in v3 mode.
    const v3ReadyRef = useRef<Promise<void>>(Promise.resolve())

    // Latest props/callbacks, read through refs so the effect stays stable.
    const cbRef = useRef({ onChange, onVerify, onExpire, onError, onWidgetId })
    cbRef.current = { onChange, onVerify, onExpire, onError, onWidgetId }
    const cfgRef = useRef({ version, sitekey, action })
    cfgRef.current = { version, sitekey, action }

    useImperativeHandle(
      ref,
      () => ({
        reset() {
          lastTokenRef.current = ''
          if (cfgRef.current.version === 'v2' && widgetIdRef.current !== null) {
            window.grecaptcha?.reset(widgetIdRef.current)
          }
          cbRef.current.onChange?.('')
        },
        async execute(actionArg?: string) {
          const cfg = cfgRef.current
          if (cfg.version === 'v3') {
            await v3ReadyRef.current
            const g = window.grecaptcha
            if (!g) {
              cbRef.current.onError?.()
              throw new Error('reCAPTCHA v3 is not loaded')
            }
            try {
              const token = await g.execute(cfg.sitekey, {
                action: actionArg ?? cfg.action,
              })
              lastTokenRef.current = token
              cbRef.current.onVerify?.(token)
              cbRef.current.onChange?.(token)
              return token
            } catch (err) {
              cbRef.current.onError?.()
              throw err
            }
          }
          // v2: trigger the challenge and resolve when the next verify fires.
          if (widgetIdRef.current === null) return ''
          window.grecaptcha?.execute(widgetIdRef.current)
          return new Promise<string>((resolve) => {
            pendingExecuteRef.current = resolve
          })
        },
        getResponse() {
          if (cfgRef.current.version === 'v3') return lastTokenRef.current
          if (widgetIdRef.current === null) return ''
          return window.grecaptcha?.getResponse(widgetIdRef.current) ?? ''
        },
        get widgetId() {
          return widgetIdRef.current
        },
        get isLoaded() {
          return isLoadedRef.current
        },
      }),
      []
    )

    useEffect(() => {
      let disposed = false
      let timeoutHandle: ReturnType<typeof setTimeout> | null = setTimeout(() => {
        if (!isLoadedRef.current) cbRef.current.onError?.()
      }, loadingTimeout)

      // ---- v3 (score-based) --------------------------------------------------
      if (version === 'v3') {
        let pollHandle: ReturnType<typeof setInterval> | null = null
        let resolveReady: () => void = () => {}
        v3ReadyRef.current = new Promise<void>((resolve) => {
          resolveReady = resolve
        })

        let styleEl: HTMLStyleElement | null = null
        if (hideBadge) {
          styleEl = document.createElement('style')
          styleEl.textContent = '.grecaptcha-badge { visibility: hidden; }'
          document.head.appendChild(styleEl)
        }

        function onGrecaptchaReady() {
          window.grecaptcha?.ready(() => {
            if (disposed) return
            isLoadedRef.current = true
            resolveReady()
            if (timeoutHandle) clearTimeout(timeoutHandle)
          })
        }

        const scriptId = `google-recaptcha-v3-script-${sitekey}`
        if (typeof window.grecaptcha?.ready === 'function') {
          onGrecaptchaReady()
        } else if (document.getElementById(scriptId)) {
          pollHandle = setInterval(() => {
            if (disposed) {
              if (pollHandle) clearInterval(pollHandle)
              return
            }
            if (typeof window.grecaptcha?.ready === 'function') {
              if (pollHandle) clearInterval(pollHandle)
              onGrecaptchaReady()
            }
          }, 100)
        } else {
          const lang = language ? `&hl=${language}` : ''
          const scriptEl = document.createElement('script')
          scriptEl.id = scriptId
          scriptEl.src = `https://www.google.com/recaptcha/api.js?render=${sitekey}${lang}`
          scriptEl.async = true
          scriptEl.defer = true
          scriptEl.onload = () => onGrecaptchaReady()
          scriptEl.onerror = () => {
            cbRef.current.onError?.()
            if (timeoutHandle) clearTimeout(timeoutHandle)
          }
          document.head.appendChild(scriptEl)
        }

        return () => {
          disposed = true
          if (timeoutHandle) clearTimeout(timeoutHandle)
          if (pollHandle) clearInterval(pollHandle)
          if (styleEl) styleEl.remove()
          isLoadedRef.current = false
        }
      }

      // ---- v2 (visible checkbox) ---------------------------------------------
      const instanceId = Math.random().toString(36).slice(2)
      const onLoadCallbackName = `__recaptchaOnLoad_${instanceId}`
      const onVerifyCallbackName = `__recaptchaVerify_${instanceId}`
      const onExpireCallbackName = `__recaptchaExpire_${instanceId}`
      const onErrorCallbackName = `__recaptchaError_${instanceId}`

      const win = window as unknown as Record<string, unknown>

      win[onVerifyCallbackName] = (token: string) => {
        lastTokenRef.current = token
        cbRef.current.onVerify?.(token)
        cbRef.current.onChange?.(token)
        if (pendingExecuteRef.current) {
          pendingExecuteRef.current(token)
          pendingExecuteRef.current = null
        }
      }
      win[onExpireCallbackName] = () => {
        lastTokenRef.current = ''
        cbRef.current.onExpire?.()
        cbRef.current.onChange?.('')
      }
      win[onErrorCallbackName] = () => {
        lastTokenRef.current = ''
        cbRef.current.onError?.()
        cbRef.current.onChange?.('')
      }

      function renderWidget() {
        if (disposed || !containerRef.current || widgetIdRef.current !== null) return

        const g = window.grecaptcha
        if (!g || !g.render) return

        const id = g.render(containerRef.current, {
          sitekey,
          theme,
          size,
          tabindex,
          badge,
          isolated,
          callback: onVerifyCallbackName,
          'expired-callback': onExpireCallbackName,
          'error-callback': onErrorCallbackName,
        })

        widgetIdRef.current = id
        isLoadedRef.current = true
        cbRef.current.onWidgetId?.(id)
        if (timeoutHandle) clearTimeout(timeoutHandle)
      }

      function waitForGrecaptcha() {
        const interval = setInterval(() => {
          if (disposed) {
            clearInterval(interval)
            return
          }
          if (typeof window.grecaptcha?.render === 'function') {
            clearInterval(interval)
            renderWidget()
          }
        }, 100)
      }

      function loadScript() {
        if (typeof window.grecaptcha?.render === 'function') {
          renderWidget()
          return
        }

        if (document.getElementById('google-recaptcha-script')) {
          waitForGrecaptcha()
          return
        }

        win[onLoadCallbackName] = () => renderWidget()

        const lang = language ? `&hl=${language}` : ''
        const src = `https://www.google.com/recaptcha/api.js?onload=${onLoadCallbackName}&render=explicit${lang}`

        const scriptEl = document.createElement('script')
        scriptEl.id = 'google-recaptcha-script'
        scriptEl.src = src
        scriptEl.async = true
        scriptEl.defer = true
        scriptEl.onerror = () => {
          cbRef.current.onError?.()
          if (timeoutHandle) clearTimeout(timeoutHandle)
        }
        document.head.appendChild(scriptEl)
      }

      loadScript()

      return () => {
        disposed = true
        if (timeoutHandle) clearTimeout(timeoutHandle)
        delete win[onLoadCallbackName]
        delete win[onVerifyCallbackName]
        delete win[onExpireCallbackName]
        delete win[onErrorCallbackName]
        if (containerRef.current) containerRef.current.innerHTML = ''
        widgetIdRef.current = null
        isLoadedRef.current = false
      }
      // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [version, sitekey, theme, size, tabindex, language, badge, isolated, hideBadge, loadingTimeout])

    return (
      <div
        ref={containerRef}
        className={className ? `react-recaptcha ${className}` : 'react-recaptcha'}
        style={{ display: 'inline-block' }}
      />
    )
  }
)
