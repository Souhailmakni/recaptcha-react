export interface RecaptchaProps {
  /** Your reCAPTCHA site key from https://www.google.com/recaptcha/admin */
  sitekey: string

  /**
   * Which reCAPTCHA to use. Default: 'v2' (the visible checkbox).
   * 'v3' is score-based and renders no widget; obtain a token by calling
   * `execute(action)` on the ref.
   */
  version?: 'v2' | 'v3'

  /**
   * v3 only: the default action name used when `execute()` is called without
   * an argument. Default: 'submit'.
   */
  action?: string

  /** v2 only. Widget color scheme. Default: 'light' */
  theme?: 'light' | 'dark'

  /** v2 only. Widget size. Default: 'normal' */
  size?: 'normal' | 'compact'

  /** v2 only. Tab index of the widget. Default: 0 */
  tabindex?: number

  /** Timeout in ms before firing onError if the script never loads. Default: 30000 */
  loadingTimeout?: number

  /** Optional BCP 47 language code for the widget, e.g. 'fr', 'ar' */
  language?: string

  /**
   * v2 only. Position of the reCAPTCHA badge (invisible size).
   * Default: 'bottomright'
   */
  badge?: 'bottomright' | 'bottomleft' | 'inline'

  /**
   * v3 only. Hide the floating reCAPTCHA badge. If you hide it you must display
   * the "protected by reCAPTCHA" legal text yourself (Google's terms require it).
   */
  hideBadge?: boolean

  /** v2 only. Whether to isolate this widget from others on the page */
  isolated?: boolean

  /**
   * Controlled value: the verified token. Pair with `onChange` for a
   * controlled component (the React equivalent of Vue's v-model).
   */
  value?: string

  /** Called with the new token whenever it changes (verify sets it, expire/error clear it) */
  onChange?: (token: string) => void

  /**
   * Called with the token: on v2 when the user completes the challenge, on v3
   * whenever `execute()` resolves.
   */
  onVerify?: (token: string) => void

  /** v2 only. Called when the response token expires */
  onExpire?: () => void

  /** Called when reCAPTCHA encounters an error (network, script load, execute failure) */
  onError?: () => void

  /** v2 only. Called with the widget ID once the widget is rendered */
  onWidgetId?: (id: number) => void

  /** Extra class name applied to the wrapper element */
  className?: string
}

/** Imperative handle exposed via ref */
export interface RecaptchaHandle {
  /**
   * v2: reset the widget so the user can solve it again.
   * v3: clear the last token held by the component.
   */
  reset(): void
  /**
   * Obtain a token. On v3, runs the challenge for `action` (or the `action`
   * prop, defaulting to 'submit') and resolves with the token. On v2, triggers
   * the challenge and resolves when the next verify fires.
   */
  execute(action?: string): Promise<string>
  /** Read the current token (last resolved token on v3) */
  getResponse(): string
  /** v2: the rendered widget id, or null. Always null on v3. */
  readonly widgetId: number | null
  /** True once the widget has rendered (v2) or grecaptcha is ready (v3) */
  readonly isLoaded: boolean
}

/** Shape of the grecaptcha global */
export interface Grecaptcha {
  render(container: HTMLElement, params: Record<string, unknown>): number
  reset(widgetId?: number): void
  getResponse(widgetId?: number): string
  /** v3: run the challenge for an action and resolve with a token */
  execute(siteKey: string, options: { action: string }): Promise<string>
  /** v2 invisible: trigger the challenge for a widget */
  execute(widgetId?: number): void
  /** v3: run the callback once grecaptcha is ready */
  ready(callback: () => void): void
}

declare global {
  interface Window {
    grecaptcha?: Grecaptcha
  }
}
