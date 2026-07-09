# The CA Grid — Security Posture

_Last updated: Phase 3.5 — Production Hardening_

This document captures the current security posture of the app, what was intentionally
relaxed to keep the product shippable in Phase 3.5, and the roadmap to tighten it in
subsequent phases.

---

## 1. Transport & Session

| Control | State |
| --- | --- |
| HTTPS everywhere (via Emergent ingress) | ✅ |
| httpOnly + secure + samesite=none cookie for `session_token` | ✅ |
| 7-day session TTL, MongoDB TTL index on `expires_at` | ✅ |
| **Session rotation on login/signup** — all prior sessions for the same user are invalidated when a new session is created | ✅ Phase 3.5 |
| bcrypt password hashing | ✅ |
| Password strength: ≥8 chars, ≥1 letter, ≥1 number, blocked against a bundled list of top common passwords | ✅ Phase 3.5 |
| Password reset via signed random token (32 bytes URL-safe, 60 min TTL, single-use) | ✅ Phase 3.5 |

## 2. Rate Limiting (`slowapi`)

| Scope | Limit |
| --- | --- |
| `/api/auth/login`, `/api/auth/signup`, `/api/auth/password-reset/request`, `/api/auth/password-reset/confirm` | **5 / minute / IP** |
| `/api/mentor/chat` (persistent sessions) | **20 / minute / user** |
| `/api/mentor/quick` (one-shot, spam-prone) | **10 / minute / user** |
| `/api/study-plan/generate` | **5 / hour / user** |
| `/api/focus/start`, `/api/focus/complete`, `/api/focus/cancel` | **30 / minute / user** |
| `/api/client-errors` | **10 / minute / IP** |
| Public (`/api/live/pulse`, openapi) | **60 / minute / IP** |
| All other authenticated endpoints (fallback) | **100 / minute / user** |

The limiter keys off the user cookie/bearer when available, and falls back to remote
address. When a limit is exceeded the server returns `HTTP 429` with a JSON body
`{"detail": "Rate limit exceeded"}`.

## 3. CORS

Locked to an explicit regex allowlist (previous config was `.*`).

```
allow_origin_regex = ^(https://[a-z0-9-]+\.preview\.emergentagent\.com|http://localhost(:\d+)?|<REACT_APP_BACKEND_URL host>)$
allow_credentials  = True
allow_methods      = ["GET","POST","PUT","DELETE","OPTIONS","PATCH"]
allow_headers      = ["*"]
```

## 4. Security Headers Middleware

Every response gets:

| Header | Value | Why |
| --- | --- | --- |
| `Strict-Transport-Security` | `max-age=63072000; includeSubDomains; preload` | Force HTTPS at the browser |
| `X-Frame-Options` | `DENY` | Anti-clickjacking |
| `X-Content-Type-Options` | `nosniff` | No MIME sniffing |
| `Referrer-Policy` | `strict-origin-when-cross-origin` | Leak-minimising referrer |
| `Permissions-Policy` | `camera=(), microphone=(), geolocation=(), interest-cohort=()` | Deny sensitive capabilities |
| `Cross-Origin-Opener-Policy` | `same-origin-allow-popups` | OAuth popup safety |
| `Content-Security-Policy` | see below | XSS defense-in-depth |

### Content-Security-Policy (current)

```
default-src 'self';
script-src   'self' 'unsafe-inline' 'unsafe-eval' https://assets.emergent.sh https://*.i.posthog.com https://us.i.posthog.com;
style-src    'self' 'unsafe-inline' https://fonts.googleapis.com;
img-src      'self' data: blob: https:;
font-src     'self' https://fonts.gstatic.com data:;
connect-src  'self' https: wss:;
media-src    'self' https: blob:;
frame-ancestors 'none';
base-uri     'self';
form-action  'self';
object-src   'none';
```

### Why `unsafe-inline` and `unsafe-eval` are still present

- **`unsafe-inline` on style** — TailwindCSS, Framer Motion, Radix UI, and Recharts all
  inject inline `style="..."` attributes for animation and layout. Removing this today
  breaks page transitions, drawers, sliders, and charts.
- **`unsafe-inline` on script** — Create React App bundles inline the runtime chunk in
  development (`react-scripts start`), and the PostHog + Emergent Auth snippets in
  `index.html` require it in production.
- **`unsafe-eval` on script** — required by React DevTools helpers and Recharts’
  runtime evaluations in some code paths. Framer Motion uses `new Function()` in
  a few animation modes.

### Phase 6 tightening path

1. Migrate CRA → Vite with a build-time hook that emits a per-request **nonce** for
   inline scripts (`<script nonce="…">`) and removes `'unsafe-inline'` from
   `script-src`. Use `'strict-dynamic'` alongside the nonce.
2. Replace inline styles from third parties with `style-src 'self' 'nonce-…'` +
   `hashed` fallback for the very few Tailwind-injected inline styles (audit with
   [csp-evaluator](https://csp-evaluator.withgoogle.com/)).
3. Move PostHog and Emergent Auth to `preconnect` + external `<script src>` only.
4. Remove `'unsafe-eval'` after auditing Recharts / Framer Motion for `eval` /
   `new Function` usage — swap for AOT-compiled equivalents.
5. Introduce a **CSP report-only** phase (`Content-Security-Policy-Report-Only`) with
   a report endpoint before switching the enforced policy.

## 5. Account Data Rights (GDPR-lite)

- `GET  /api/account/export` — authenticated user downloads a JSON dump of every row
  keyed to their `user_id`: profile, sessions (redacted tokens), user_stats,
  focus_sessions, daily_focus, achievements, mentor_sessions, mentor_messages,
  study_plans.
- `DELETE /api/account/delete` — cascade removes the same rows, invalidates the
  session cookie, and returns `{"ok": true}`.

## 6. Structured Logging

All security-relevant events go through a JSON log line prefixed `EVENT`:

```
EVENT {"event": "auth.login.ok", "user_id": "user_…", "email": "…", "ip": "…", "ts": "…"}
```

Emitted events: `auth.signup.ok`, `auth.login.ok`, `auth.login.fail`, `auth.logout`,
`password.reset.request`, `password.reset.confirm`, `account.export`,
`account.delete`, `client.error`. The single-line JSON format is grep-friendly and
ready for ingestion by any log aggregator (Loki, Datadog, ELK).

## 7. Password Reset — Delivery

Phase 3.5 logs the reset link to stdout (visible in `/var/log/supervisor/backend.*.log`):

```
[PASSWORD RESET] email=<x> link=<origin>/reset-password?token=<t>
```

`# TODO: Phase 4 — wire SendGrid or Amazon SES` markers are left in the code at the
send site. No emails leave the box today. This is documented for the security review.

## 8. Known trade-offs (non-blockers)

- No CSRF token on state-changing endpoints; mitigated by samesite=none + credential
  cookie being scoped tightly and the fact that all mutating endpoints require the
  cookie or Bearer. Consider double-submit cookie in Phase 6.
- Rate limiter uses in-process memory (single pod). If we horizontally scale the API
  pod count > 1, move to Redis backend (`slowapi` supports it out of the box).
- Password reset tokens are stored in Mongo (short-lived TTL). No pepper. Acceptable
  for MVP; consider HMAC-of-token in DB when we add SSO parity.

---

## 9. Known infra caveats (Phase 3.5 tester findings)

These are edge/CDN-level behaviours, not application bugs. Documented here so the
next on-call engineer doesn't spend a morning chasing them in the code.

### 9.1 `robots.txt` overridden at the edge

Cloudflare has a **"Managed Robots"** setting (Security → Bots → Configure) that,
when enabled, returns Cloudflare's synthesised `robots.txt` instead of our own
static file at `/robots.txt`. Symptom: our app-served content is fine locally but
the public URL serves a different body.

- Fix: disable **"Managed Robots"** on the CF zone for our domain.
- Verification after fix: `curl -sSL https://<domain>/robots.txt` should match
  the file at `/app/frontend/public/robots.txt` byte-for-byte.

### 9.2 `OPTIONS` preflight short-circuited with wildcard CORS

Cloudflare intercepts CORS preflights (`OPTIONS`) at the edge and can respond
with `Access-Control-Allow-Origin: *` before the request reaches our backend.
This is Cloudflare's default "CORS Trust" or "CORS Preflight" behaviour.

- Impact: **cosmetic only.** Our application-level CORS middleware still runs
  on the actual (non-preflight) request — see §3 above. A malicious cross-origin
  page still cannot read our responses because our origin regex kicks in on the
  real request.
- Fix (if a stricter posture is desired): disable "Managed CORS" / "CORS
  Preflight" cache in Cloudflare and let the origin (our FastAPI middleware)
  handle preflights end-to-end.
- Verification after fix: `curl -sI -X OPTIONS -H "Origin: https://evil.example"
  -H "Access-Control-Request-Method: POST" <api>` should NOT return
  `Access-Control-Allow-Origin: *` and should NOT return `Access-Control-Allow-Origin`
  matching the evil origin.

### 9.3 `DELETE` with request body

Some intermediaries (older HTTP/1.1 proxies, some Cloudflare Workers) drop the
body from `DELETE` requests. Because the account-deletion endpoint intentionally
requires the confirmation string `"DELETE MY ACCOUNT"`, we ship **both**:

- `DELETE /api/account/delete` — reads the body defensively (falls back to
  `request.json()` if the Pydantic body arg is empty).
- `POST /api/account/delete` — body-friendly alias that all proxies preserve.

The frontend calls `POST` from `/app/frontend/src/pages/Profile.jsx`. External API
consumers may use either — both enforce the confirmation guard identically.
