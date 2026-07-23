import { useCallback, useState } from 'react'

export interface UseRecaptchaReturn {
  /** Current token, updated on verify / cleared on expire / error / reset */
  token: string
  /** True once a valid token exists */
  isVerified: boolean
  /** Pass to <ReactRecaptcha onVerify=... /> */
  onVerify: (token: string) => void
  /** Pass to <ReactRecaptcha onExpire=... /> */
  onExpire: () => void
  /** Pass to <ReactRecaptcha onError=... /> */
  onError: () => void
  /** Clears the tracked state (does NOT reset the widget, call ref.reset() for that) */
  reset: () => void
}

/**
 * Hook that tracks reCAPTCHA verification state.
 *
 * @example
 * ```tsx
 * const { token, isVerified, onVerify, onExpire, onError } = useRecaptcha()
 *
 * return (
 *   <>
 *     <ReactRecaptcha sitekey="..." onVerify={onVerify} onExpire={onExpire} onError={onError} />
 *     <button disabled={!isVerified} onClick={submit}>Submit</button>
 *   </>
 * )
 * ```
 */
export function useRecaptcha(): UseRecaptchaReturn {
  const [token, setToken] = useState('')
  const [isVerified, setIsVerified] = useState(false)

  const onVerify = useCallback((t: string) => {
    setToken(t)
    setIsVerified(true)
  }, [])

  const onExpire = useCallback(() => {
    setToken('')
    setIsVerified(false)
  }, [])

  const onError = useCallback(() => {
    setToken('')
    setIsVerified(false)
  }, [])

  const reset = useCallback(() => {
    setToken('')
    setIsVerified(false)
  }, [])

  return { token, isVerified, onVerify, onExpire, onError, reset }
}
