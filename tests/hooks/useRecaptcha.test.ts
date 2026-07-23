import { describe, it, expect } from 'vitest'
import { act, renderHook } from '@testing-library/react'
import { useRecaptcha } from '../../src/hooks/useRecaptcha'

describe('useRecaptcha', () => {
  it('starts empty and unverified', () => {
    const { result } = renderHook(() => useRecaptcha())
    expect(result.current.token).toBe('')
    expect(result.current.isVerified).toBe(false)
  })

  it('marks verified on onVerify', () => {
    const { result } = renderHook(() => useRecaptcha())
    act(() => result.current.onVerify('abc'))
    expect(result.current.token).toBe('abc')
    expect(result.current.isVerified).toBe(true)
  })

  it('clears on onExpire', () => {
    const { result } = renderHook(() => useRecaptcha())
    act(() => result.current.onVerify('abc'))
    act(() => result.current.onExpire())
    expect(result.current.token).toBe('')
    expect(result.current.isVerified).toBe(false)
  })

  it('clears on onError', () => {
    const { result } = renderHook(() => useRecaptcha())
    act(() => result.current.onVerify('abc'))
    act(() => result.current.onError())
    expect(result.current.token).toBe('')
    expect(result.current.isVerified).toBe(false)
  })

  it('clears on reset', () => {
    const { result } = renderHook(() => useRecaptcha())
    act(() => result.current.onVerify('abc'))
    act(() => result.current.reset())
    expect(result.current.token).toBe('')
    expect(result.current.isVerified).toBe(false)
  })
})
