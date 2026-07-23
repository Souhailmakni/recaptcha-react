# recaptcha-react

> Lightweight, zero-dependency React component for **Google reCAPTCHA v2 (checkbox)**
> with full TypeScript support, a Vite library build, and an optional `useRecaptcha` hook.

[![npm](https://img.shields.io/npm/v/recaptcha-react)](https://www.npmjs.com/package/recaptcha-react)
[![license](https://img.shields.io/npm/l/recaptcha-react)](LICENSE)

This is the React port of [`recaptcha-vue`](https://github.com/Souhailmakni/recaptcha-vue). Same features, React idioms.

---

## Features

- **React 17 / 18 / 19** with hooks and `forwardRef`
- **TypeScript**: full types for props and the imperative handle
- **`useRecaptcha` hook**: reactive `token` & `isVerified` state
- **Controlled value**: `value` + `onChange` (the v-model equivalent)
- **Multiple instances**: safe to use more than one widget per page
- **Theming**: `light` / `dark`, `normal` / `compact`
- **Language**: pass any BCP 47 code (`hl` param)
- **Load timeout**: fires `onError` if the script never loads
- **ESM + CJS** dual build via Vite, zero runtime dependencies

---

## Installation

```bash
npm install recaptcha-react
# or
yarn add recaptcha-react
```

`react` and `react-dom` are peer dependencies (>= 17).

---

## Quick start

```tsx
import { ReactRecaptcha, useRecaptcha } from 'recaptcha-react'

export function Form() {
  const { isVerified, onVerify, onExpire, onError } = useRecaptcha()

  return (
    <form>
      <ReactRecaptcha
        sitekey="YOUR_SITE_KEY"
        onVerify={onVerify}
        onExpire={onExpire}
        onError={onError}
      />
      <button type="submit" disabled={!isVerified}>Submit</button>
    </form>
  )
}
```

---

## Props

| Prop | Type | Default | Description |
|---|---|---|---|
| `sitekey` | `string` | required | Your reCAPTCHA v2 site key |
| `theme` | `'light' \| 'dark'` | `'light'` | Widget color scheme |
| `size` | `'normal' \| 'compact'` | `'normal'` | Widget size |
| `tabindex` | `number` | `0` | Tab index of the widget |
| `loadingTimeout` | `number` | `30000` | ms before `onError` fires if the script never loads |
| `language` | `string` | `''` | BCP 47 language code (`hl`) |
| `badge` | `'bottomright' \| 'bottomleft' \| 'inline'` | `'bottomright'` | Badge position |
| `isolated` | `boolean` | `false` | Isolate this widget from others |
| `value` | `string` | | Controlled token value (pair with `onChange`) |
| `className` | `string` | | Extra class on the wrapper |

### Callbacks

| Prop | Signature | Fires when |
|---|---|---|
| `onVerify` | `(token: string) => void` | Challenge solved |
| `onExpire` | `() => void` | Token expired |
| `onError` | `() => void` | Network / script-load error or timeout |
| `onWidgetId` | `(id: number) => void` | Widget rendered |
| `onChange` | `(token: string) => void` | Token set (verify) or cleared (expire/error/reset) |

---

## Imperative API (via ref)

```tsx
const captcha = useRef<RecaptchaHandle>(null)

<ReactRecaptcha ref={captcha} sitekey="..." />

captcha.current?.reset()        // reset the widget
captcha.current?.execute()      // trigger the challenge
captcha.current?.getResponse()  // read the token
captcha.current?.widgetId       // number | null
captcha.current?.isLoaded       // boolean
```

---

## `useRecaptcha` hook

Tracks verification state so you don't wire up `useState` yourself.

```tsx
const { token, isVerified, onVerify, onExpire, onError, reset } = useRecaptcha()
```

`reset()` clears the tracked state only. Call `ref.reset()` to reset the widget.

---

## Controlled value (v-model equivalent)

```tsx
const [token, setToken] = useState('')

<ReactRecaptcha sitekey="..." value={token} onChange={setToken} />
```

---

## Server-side verification

Always verify the token on your backend against
`https://www.google.com/recaptcha/api/siteverify` with your **secret** key. See
[`examples/next/route.ts`](examples/next/route.ts) for a Next.js Route Handler,
or the `recaptcha-vue` repo for the Laravel controller.

---

## Local development

```bash
yarn install
yarn dev            # Vite dev server
yarn test           # run tests
yarn test:coverage  # tests + coverage
yarn build          # build the library into dist/
```

---

## License

MIT © Souhail Makni
