import {
  forwardRef,
  useEffect,
  useImperativeHandle,
  useRef,
} from 'react'
import type { RecaptchaHandle, RecaptchaProps } from '../types'

/**
 * Google reCAPTCHA v2 (checkbox) component for React.
 *
 * Loads the reCAPTCHA script once per page, renders the widget explicitly, and
 * is safe to mount multiple times. Forward a ref to reach the imperative API
 * (`reset`, `execute`, `getResponse`).
 */
export const ReactRecaptcha = forwardRef<RecaptchaHandle, RecaptchaProps>(
  function ReactRecaptcha(props, ref) {
    const {
      sitekey,
      theme = 'light',
      size = 'normal',
      tabindex = 0,
      loadingTimeout = 30000,
      language = '',
      badge = 'bottomright',
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

    // Latest callbacks, read through a ref so the render effect stays stable.
    const cbRef = useRef({ onChange, onVerify, onExpire, onError, onWidgetId })
    cbRef.current = { onChange, onVerify, onExpire, onError, onWidgetId }

    useImperativeHandle(
      ref,
      () => ({
        reset() {
          if (widgetIdRef.current === null) return
          window.grecaptcha?.reset(widgetIdRef.current)
          cbRef.current.onChange?.('')
        },
        execute() {
          if (widgetIdRef.current === null) return
          window.grecaptcha?.execute(widgetIdRef.current)
        },
        getResponse() {
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

    // Re-render the widget whenever anything that changes the widget changes.
    // grecaptcha has no update API, so we tear down and re-render.
    useEffect(() => {
      let timeoutHandle: ReturnType<typeof setTimeout> | null = null
      let disposed = false

      // Unique callback names so multiple instances don't collide.
      const instanceId = Math.random().toString(36).slice(2)
      const onLoadCallbackName = `__recaptchaOnLoad_${instanceId}`
      const onVerifyCallbackName = `__recaptchaVerify_${instanceId}`
      const onExpireCallbackName = `__recaptchaExpire_${instanceId}`
      const onErrorCallbackName = `__recaptchaError_${instanceId}`

      const win = window as unknown as Record<string, unknown>

      win[onVerifyCallbackName] = (token: string) => {
        cbRef.current.onVerify?.(token)
        cbRef.current.onChange?.(token)
      }
      win[onExpireCallbackName] = () => {
        cbRef.current.onExpire?.()
        cbRef.current.onChange?.('')
      }
      win[onErrorCallbackName] = () => {
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

      timeoutHandle = setTimeout(() => {
        if (!isLoadedRef.current) cbRef.current.onError?.()
      }, loadingTimeout)

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
    }, [sitekey, theme, size, tabindex, language, badge, isolated, loadingTimeout])

    return (
      <div
        ref={containerRef}
        className={className ? `react-recaptcha ${className}` : 'react-recaptcha'}
        style={{ display: 'inline-block' }}
      />
    )
  }
)
