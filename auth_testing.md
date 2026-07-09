# The CA Grid — Auth Testing Playbook

Read this file before testing any auth-gated feature.

## Auth transports supported
- **Web (React frontend)**: httpOnly cookie `session_token` (path=/, secure=True, samesite=none, 7-day expiry)
- **Bearer tokens**: `Authorization: Bearer <session_token>` also accepted (backend supports both)

## Test user setup (email/password — seeded automatically)
On backend startup, the demo user is seeded:
- email: `demo@cagrid.in`
- password: `demo123`
- `onboarded: true`, `journey_level: "Foundation"`

Trigger idempotent seed manually if needed:
```
curl -X POST "$REACT_APP_BACKEND_URL/api/seed"
```

## Google OAuth (Emergent) — Test setup without real Google flow
Because real Google auth requires a live browser, testing agents should seed a mongo user + session directly and then either:
- attach cookie in Playwright, OR
- use `Authorization: Bearer <token>` for API tests.

```
mongosh --eval "
use('test_database');
var userId = 'test-user-' + Date.now();
var sessionToken = 'test_session_' + Date.now();
db.users.insertOne({
  user_id: userId,
  email: 'test.user.' + Date.now() + '@example.com',
  name: 'Test User',
  picture: 'https://via.placeholder.com/150',
  auth_provider: 'google',
  password_hash: null,
  journey_level: 'Foundation',
  daily_goal_minutes: 180,
  subjects: [],
  fit_score: null,
  onboarded: true,
  created_at: new Date()
});
db.user_sessions.insertOne({
  user_id: userId,
  session_token: sessionToken,
  expires_at: new Date(Date.now() + 7*24*60*60*1000),
  created_at: new Date()
});
print('Session token: ' + sessionToken);
print('User ID: ' + userId);
"
```

## Backend API tests

### Signup + login (email/password)
```
API="$REACT_APP_BACKEND_URL"
# Signup
curl -sX POST "$API/api/auth/signup" \
  -H "Content-Type: application/json" \
  -d '{"email":"pretest@cagrid.in","password":"pretest123","name":"Pre Test"}' \
  -c /tmp/cagrid.jar
# /auth/me via cookie
curl -sX GET "$API/api/auth/me" -b /tmp/cagrid.jar
# Login demo
curl -sX POST "$API/api/auth/login" \
  -H "Content-Type: application/json" \
  -d '{"email":"demo@cagrid.in","password":"demo123"}' \
  -c /tmp/cagrid.jar
# Bearer version (grab token from JSON body)
TOKEN=$(curl -sX POST "$API/api/auth/login" -H "Content-Type: application/json" \
  -d '{"email":"demo@cagrid.in","password":"demo123"}' | python3 -c "import sys,json;print(json.load(sys.stdin)['session_token'])")
curl -sX GET "$API/api/auth/me" -H "Authorization: Bearer $TOKEN"
```

### Google OAuth session exchange (mocked at test level)
The endpoint hits `https://demobackend.emergentagent.com/auth/v1/env/oauth/session-data`. Do NOT call it in unit tests. Instead, prove flow works by seeding user_sessions directly and hitting `/api/auth/me`.

### Logout
```
curl -sX POST "$API/api/auth/logout" -b /tmp/cagrid.jar -c /tmp/cagrid.jar
curl -sX GET "$API/api/auth/me" -b /tmp/cagrid.jar   # expect 401
```

## Browser (Playwright) tests

### Set cookie for authed pages (web)
```
await page.context.add_cookies([{
    "name": "session_token", "value": "YOUR_SESSION_TOKEN",
    "domain": "your-app.com", "path": "/",
    "httpOnly": True, "secure": True, "sameSite": "None"
}])
await page.goto("https://your-app.com/dashboard")
```

### Full flow via UI
1. Visit `/`, verify landing renders, click "Log in".
2. Enter `demo@cagrid.in` / `demo123`, submit; expect redirect to `/dashboard` (already onboarded).
3. Verify dashboard shell renders with nav + sidebar + welcome bento.
4. Click avatar → Logout → expect redirect to `/`, cookie cleared.
5. Signup with a fresh email → lands on `/onboarding`.
6. In onboarding: select "Aspiring" → quiz appears → answer 5 questions → fit score card + roadmap → next step (subjects) → completion confetti → `/dashboard`.
7. Select non-Aspiring level (e.g., Foundation) → quiz skipped → subjects step → completion → `/dashboard`.

## Checklist
- [ ] `/api/openapi.json` is public (no auth required)
- [ ] `/api/auth/me` returns 401 when unauthenticated (not 403)
- [ ] `/api/auth/me` returns user with `user_id` (no `_id`)
- [ ] Session token cookie is httpOnly, secure, samesite=none
- [ ] Emergent redirect uses `window.location.origin` dynamically (no hardcoding)
- [ ] AppRouter processes `#session_id=...` synchronously before ProtectedRoute check
- [ ] AuthProvider skips `/api/auth/me` when `window.location.hash` contains `session_id=`

## Failure indicators
- 403 instead of 401 → FastAPI dependency issue
- Cookie not set after login → CORS/samesite/secure misconfigured
- Redirect loop between `/dashboard` and `/login` → race condition with session_id hash
