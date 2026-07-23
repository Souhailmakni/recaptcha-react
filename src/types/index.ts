export interface RecaptchaProps {
  /** Your reCAPTCHA v2 site key from https://www.google.com/recaptcha/admin */
  sitekey: string

  /** Widget color scheme. Default: 'light' */
  theme?: 'light' | 'dark'

  /** Widget size. Default: 'normal' */
  size?: 'normal' | 'compact'

  /** Tab index of the widget. Default: 0 */
  tabindex?: number

  /** Timeout in ms before firing onError if the widget never loads. Default: 30000 */
  loadingTimeout?: number

  /** Optional BCP 47 language code for the widget, e.g. 'fr', 'ar' */
  language?: string

  /**
   * Position of the reCAPTCHA badge (only applies to invisible size).
   * Default: 'bottomright'
   */
  badge?: 'bottomright' | 'bottomleft' | 'inline'

  /** Whether to isolate this widget from others on the page */
  isolated?: boolean

  /**
   * Controlled value: the verified token. Pair with `onChange` for a
   * controlled component (the React equivalent of Vue's v-model).
   */
  value?: string

  /** Called with the new token whenever it changes (verify sets it, expire/error clear it) */
  onChange?: (token: string) => void

  /** Called when the user successfully completes the challenge; token is the response */
  onVerify?: (token: string) => void

  /** Called when the response token expires */
  onExpire?: () => void

  /** Called when reCAPTCHA encounters an error (network, script load, etc.) */
  onError?: () => void

  /** Called with the widget ID once the widget is rendered */
  onWidgetId?: (id: number) => void

  /** Extra class name applied to the wrapper element */
  className?: string
}

/** Imperative handle exposed via ref */
export interface RecaptchaHandle {
  /** Reset the widget so the user can solve it again */
  reset(): void
  /** Programmatically execute the challenge (invisible/size flows) */
  execute(): void
  /** Read the current response token straight from grecaptcha */
  getResponse(): string
  /** The rendered widget id, or null before render */
  readonly widgetId: number | null
  /** True once the widget has rendered */
  readonly isLoaded: boolean
}

/** Shape of the grecaptcha global */
export interface Grecaptcha {
  render(container: HTMLElement, params: Record<string, unknown>): number
  reset(widgetId?: number): void
  execute(widgetId?: number): void
  getResponse(widgetId?: number): string
}

declare global {
  interface Window {
    grecaptcha?: Grecaptcha
  }
}
