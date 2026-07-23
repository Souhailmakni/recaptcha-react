import { describe, it, expect } from 'vitest'
import * as api from '../src/index'
import { ReactRecaptcha } from '../src/components/ReactRecaptcha'
import { useRecaptcha } from '../src/hooks/useRecaptcha'

describe('public API', () => {
  it('re-exports the component and the hook', () => {
    expect(api.ReactRecaptcha).toBe(ReactRecaptcha)
    expect(api.useRecaptcha).toBe(useRecaptcha)
  })

  it('exposes exactly the documented named exports', () => {
    expect(Object.keys(api).sort()).toEqual(['ReactRecaptcha', 'useRecaptcha'])
  })
})
