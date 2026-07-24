# recaptcha-react

> Lightweight, zero-dependency React component for **Google reCAPTCHA v2 (checkbox) and v3 (score-based)**
> with full TypeScript support, a Vite library build, and an optional `useRecaptcha` hook.
> Switch between v2 and v3 with a single `version` prop.

[![npm](https://img.shields.io/npm/v/recaptcha-react)](https://www.npmjs.com/package/recaptcha-react)
[![license](https://img.shields.io/npm/l/recaptcha-react)](LICENSE)
[![CI](https://github.com/Souhailmakni/recaptcha-react/actions/workflows/ci.yml/badge.svg)](https://github.com/Souhailmakni/recaptcha-react/actions)
[![node](https://img.shields.io/node/v/recaptcha-react?cacheSeconds=3600)](package.json)

Coverage (generated locally with `npm run test:coverage`, no external service):

| Statements | Branches | Functions | Lines |
|---|---|---|---|
| ![Statements](https://img.shields.io/badge/statements-96.84%25-brightgreen.svg?style=flat) | ![Branches](https://img.shields.io/badge/branches-80.21%25-yellow.svg?style=flat) | ![Functions](https://img.shields.io/badge/functions-96.96%25-brightgreen.svg?style=flat) | ![Lines](https://img.shields.io/badge/lines-98.82%25-brightgreen.svg?style=flat) |

This is the React port of [`recaptcha-vue`](https://github.com/Souhailmakni/recaptcha-vue). Same behaviour, React idioms.

---

## Table of contents

- [Features](#features)
- [Requirements](#requirements)
- [Security](#security)
- [Installation](#installation)
- [Quick start](#quick-start)
- [Token expiry and resetting](#token-expiry-and-resetting)
- [Props](#props)
- [Callbacks](#callbacks)
- [Imperative API](#imperative-api-via-ref)
- [reCAPTCHA v3](#recaptcha-v3)
- [`useRecaptcha` hook](#userecaptcha-hook)
- [Controlled value](#controlled-value)
- [Server-side verification](#server-side-verification)
- [Multiple instances on one page](#multiple-instances-on-one-page)
- [Local development](#local-development)
- [License](#license)

---

## Features

- **v2 and v3** in one component: `version="v2"` (default) or `version="v3"`
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

## Requirements

| | Version |
|---|---|
| Node.js | `>=20.19.0` (see [`.nvmrc`](.nvmrc)) |
| React | `>=17.0.0` (peer dependency) |

---

## Security

`recaptcha-react` ships with **zero runtime dependencies**. The published package
only depends on React (as a peer dependency), so there's no third-party code in
the bundle consumers install.

CI ([`.github/workflows/ci.yml`](.github/workflows/ci.yml)) audits on every push
and pull request:

- **Production dependencies** are audited with `npm audit --omit=dev` and the
  build fails on any known vulnerability. This currently has nothing to audit
  (zero runtime deps), and guards against anything introduced in the future.
- **Dev dependencies** (build/test tooling) are audited separately and reported
  without failing the build. They never ship to consumers.

Run `npm run audit` locally for the production-only check at any time.

---

## Installation

```bash
npm install recaptcha-react
# or
yarn add recaptcha-react
# or
pnpm add recaptcha-react
```

`react` and `react-dom` are peer dependencies (>= 17).

---

## Quick start

### 1. Get your reCAPTCHA v2 keys

Register at [https://www.google.com/recaptcha/admin](https://www.google.com/recaptcha/admin).
Choose **reCAPTCHA v2 -> "I'm not a robot" Checkbox**.

> **Test keys** (always pass, never use in production):
> Site key: `6LeIxAcTAAAAAJcZVRqyHh71UMIEGNQ_MXjiZKhI`
> Secret key: `6LeIxAcTAAAAAGG-vFI1TnRWxMZNFuojJ4WifJWe`

### 2. Use the component

```tsx
import { useRef } from 'react'
import { ReactRecaptcha, useRecaptcha, type RecaptchaHandle } from 'recaptcha-react'

export function Form() {
  const captcha = useRef<RecaptchaHandle>(null)
  const { token, isVerified, onVerify, onExpire, onError } = useRecaptcha()

  function submit() {
    console.log('Token to send to server:', token)
    captcha.current?.reset() // reset the widget after every submit
  }

  return (
    <form onSubmit={(e) => { e.preventDefault(); submit() }}>
      <ReactRecaptcha
        ref={captcha}
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

## Token expiry and resetting

> [!IMPORTANT]
> Read this before wiring up a form. The most common integration bug with any
> reCAPTCHA v2 wrapper is a form that works once in testing, then silently
> submits a stale or already-used token in production. (Separately: your server
> must verify the token regardless of expiry, see
> [Client state is not verification](#client-state-is-not-verification).)

A verified token is only valid for **about 2 minutes** ([Google's own limit](https://developers.google.com/recaptcha/docs/faq#my-users-are-getting-a-please-try-again-error-why)),
and it's **single-use**: once you've submitted it to your backend, that exact
token cannot be verified again, whether verification succeeded or failed. Two
failure modes follow directly from that:

1. **The user waits too long.** The checkbox stays visually "checked," but the
   token behind it has expired. Handle this with `onExpire` (from `useRecaptcha`),
   which flips `isVerified` back to `false` so your submit button disables itself
   again instead of sending a dead token.
2. **The user submits, something else fails, they retry.** Say the token verifies
   fine but a different field fails server-side validation. If you don't reset the
   widget, the user fixes that field and resubmits the *same* token, which your
   backend now rejects, and it looks like reCAPTCHA itself is broken.

The fix for both is the same one-liner, and it belongs in every code path that
leaves the form, success or failure:

```tsx
captcha.current?.reset()
```

Call `.reset()` in your success handler, in your error handler, and anywhere else
you're about to let the user try submitting again. Don't call it only in the
success path.

---

## Props

| Prop | Type | Default | Description |
|---|---|---|---|
| `sitekey` | `string` | **required** | Your reCAPTCHA site key |
| `version` | `'v2' \| 'v3'` | `'v2'` | Which reCAPTCHA to use. See [reCAPTCHA v3](#recaptcha-v3) |
| `action` | `string` | `'submit'` | **v3 only.** Default action when `execute()` is called with no argument |
| `theme` | `'light' \| 'dark'` | `'light'` | **v2 only.** Widget color scheme |
| `size` | `'normal' \| 'compact'` | `'normal'` | **v2 only.** Widget size |
| `tabindex` | `number` | `0` | **v2 only.** Tab index |
| `loadingTimeout` | `number` | `30000` | ms before `onError` fires if the script never loads |
| `language` | `string` | `''` | BCP 47 language code, e.g. `'fr'`, `'ar'` |
| `badge` | `'bottomright' \| 'bottomleft' \| 'inline'` | `'bottomright'` | **v2 only.** Badge position (invisible size only) |
| `hideBadge` | `boolean` | `false` | **v3 only.** Hide the floating badge (see the legal note below) |
| `isolated` | `boolean` | `false` | **v2 only.** Isolate widget from others on the page |
| `value` | `string` | | Controlled token value (pair with `onChange`) |
| `className` | `string` | | Extra class on the wrapper element |

---

## Callbacks

| Prop | Signature | Fires when |
|---|---|---|
| `onVerify` | `(token: string) => void` | User completed the challenge; token ready to send to server |
| `onExpire` | `() => void` | Token expired; user must re-verify |
| `onError` | `() => void` | Widget or network error, or load timeout |
| `onWidgetId` | `(id: number) => void` | Widget rendered (internal widget id) |
| `onChange` | `(token: string) => void` | Token set (verify) or cleared (expire / error / reset) |

"Ready to send to server" is doing a lot of work in that first row. See
[Client state is not verification](#client-state-is-not-verification) for why
sending it isn't the same as being verified.

---

## Imperative API (via `ref`)

```tsx
const captcha = useRef<RecaptchaHandle>(null)

<ReactRecaptcha ref={captcha} sitekey="..." />

captcha.current?.reset()               // reset the widget (v2) / clear the token (v3)
await captcha.current?.execute('login') // v3: run the challenge, resolve the token
captcha.current?.getResponse()         // read the current token string
captcha.current?.widgetId              // number | null (always null on v3)
captcha.current?.isLoaded              // boolean
```

`execute(action?)` returns a `Promise<string>`. On v3 it runs the challenge for
the action and resolves with the token. On v2 it triggers the challenge and
resolves when the next verify fires.

---

## reCAPTCHA v3

reCAPTCHA v3 is score-based and renders **no widget**: there is nothing to click.
You set `version="v3"` and get a token on demand by calling `execute(action)`,
usually right before you submit. `onVerify` still fires with the token, so the
`useRecaptcha` hook works exactly as it does for v2.

```tsx
import { useRef } from 'react'
import { ReactRecaptcha, type RecaptchaHandle } from 'recaptcha-react'

function Form() {
  const captcha = useRef<RecaptchaHandle>(null)

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    const token = await captcha.current!.execute('login')
    await fetch('/api/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ 'g-recaptcha-response': token }),
    })
  }

  return (
    <form onSubmit={handleSubmit}>
      <ReactRecaptcha ref={captcha} sitekey="YOUR_V3_SITE_KEY" version="v3" />
      <button type="submit">Log in</button>
    </form>
  )
}
```

Notes specific to v3:

- **Get a fresh token per submit.** v3 tokens are single-use and expire in about
  2 minutes, so call `execute()` at submit time, not on mount.
- **The badge and the law.** v3 shows a floating "protected by reCAPTCHA" badge.
  You may hide it with `hideBadge`, but only if you then display the
  [required legal text](https://developers.google.com/recaptcha/docs/faq#id-like-to-hide-the-recaptcha-badge-what-is-allowed)
  somewhere on the page yourself.
- **Server-side gives you a score.** `siteverify` returns `score` (0.0 to 1.0)
  and `action`. Verify both server-side (see below).
- **One version per page.** Rendering a v2 and a v3 instance on the same page is
  not supported (the two share Google's single `grecaptcha` global). Pick one.

---

## `useRecaptcha` hook

```tsx
const {
  token,       // string: current token ('' when expired / error)
  isVerified,  // boolean: true when a valid token exists (client-side only, see below)
  onVerify,    // (token: string) => void
  onExpire,    // () => void
  onError,     // () => void
  reset,       // () => void: clears local state (call captcha.current.reset() too)
} = useRecaptcha()
```

### Client state is not verification

> [!WARNING]
> `isVerified` and `token` are client-side state only. They exist to drive UX,
> e.g. disabling the submit button until the checkbox is solved, and they are
> never proof that verification actually happened. Any client can set them to
> whatever it wants before the request reaches your server.
>
> Your server must independently POST the token to
> `https://www.google.com/recaptcha/api/siteverify` with your secret key, check
> the `success` field, and reject the request when it's false. See
> [Server-side verification](#server-side-verification) below.
>
> Tokens are also single-use and expire after about 2 minutes (see
> [Token expiry and resetting](#token-expiry-and-resetting)). A reused or expired
> token comes back from `siteverify` as `success: false` with
> `error-codes: ["timeout-or-duplicate"]`.

---

## Controlled value

`value` + `onChange` make the component controlled, the way `v-model` works in
the Vue version:

```tsx
const [token, setToken] = useState('')

<ReactRecaptcha sitekey="..." value={token} onChange={setToken} />
```

---

## Server-side verification

Always verify the token on your backend against
`https://www.google.com/recaptcha/api/siteverify` with your **secret** key. See
[`examples/next/route.ts`](examples/next/route.ts) for a Next.js Route Handler,
and [`examples/ContactForm.tsx`](examples/ContactForm.tsx) for the front-end form.

```ts
const verify = await fetch('https://www.google.com/recaptcha/api/siteverify', {
  method: 'POST',
  headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
  body: new URLSearchParams({
    secret: process.env.RECAPTCHA_SECRET_KEY!,
    response: token,
  }),
}).then((r) => r.json())

if (!verify.success) {
  // reject the request
}
```

For **v3**, `siteverify` also returns `score` (0.0 to 1.0) and `action`. Check
both: reject low scores and confirm the action matches what you expected.

```ts
if (!verify.success || verify.score < 0.5 || verify.action !== 'login') {
  // reject the request
}
```

---

## Multiple instances on one page

Each `<ReactRecaptcha>` instance manages its own unique widget id and global
callback names, so you can safely render more than one widget:

```tsx
<ReactRecaptcha sitekey={siteKey} onVerify={handleLoginCaptcha} />
<ReactRecaptcha sitekey={siteKey} onVerify={handleSignupCaptcha} />
```

---

## Local development

```bash
git clone https://github.com/Souhailmakni/recaptcha-react.git
cd recaptcha-react
npm install
```

### Scripts

| Command | Description |
|---|---|
| `npm run dev` | Start the Vite dev server |
| `npm run typecheck` | Type-check `src/` with `tsc` |
| `npm test` | Run the test suite once with Vitest |
| `npm run test:watch` | Run the test suite in watch mode |
| `npm run test:coverage` | Run the suite with coverage and update the README badges |
| `npm run audit` | Audit production dependencies for known vulnerabilities |
| `npm run build` | Type-check, then build the ESM + CJS bundles to `dist/` |

---

## License

[MIT](LICENSE) © Souhail Makni
