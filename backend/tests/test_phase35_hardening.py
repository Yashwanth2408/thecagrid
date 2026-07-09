"""Phase 3.5 Production Hardening tests.

Covers:
- Password strength validation on signup
- Rate limiting on /api/auth/login (5/min per IP)
- Security headers on every response
- CORS allowlist regex (evil origin rejected)
- Password reset flow (stdout token → confirm → old fails → new works)
- Session rotation on login
- Account export (GDPR-lite)
- Account delete (throwaway user)
- /api/client-errors anonymous POST
- /api/openapi.json publicly accessible
- Structured JSON logging (auth.login.ok EVENT line)

The test file uses uuid-suffixed emails for signup to prevent collisions.
Rate limits (5/min) are respected — auth tests are grouped so we don't exceed
budget within a single minute. A cool-down window (~65s) is inserted where
needed via pytest markers or explicit sleeps.
"""
import os
import re
import time
import json
import uuid
import subprocess
import pytest
import requests

BASE_URL = os.environ.get("REACT_APP_BACKEND_URL", "").rstrip("/")
if not BASE_URL:
    from pathlib import Path
    for line in Path("/app/frontend/.env").read_text().splitlines():
        if line.startswith("REACT_APP_BACKEND_URL="):
            BASE_URL = line.split("=", 1)[1].strip().rstrip("/")
API = f"{BASE_URL}/api"

DEMO_EMAIL = "demo@cagrid.in"
DEMO_PASSWORD = "demo123"
STRONG_PASSWORD = "MyStr0ngP@ss"

BACKEND_LOG = "/var/log/supervisor/backend.err.log"


def _reseed():
    """Reset demo credentials/data to known state."""
    r = requests.post(f"{API}/seed", timeout=30)
    assert r.status_code == 200, f"seed failed: {r.status_code} {r.text[:200]}"


def _sleep_for_rate_reset():
    """Wait long enough for the 5/min auth window to elapse."""
    time.sleep(65)


# ---------------------------------------------------------------------------
# 1. Security headers on every response
# ---------------------------------------------------------------------------
class TestSecurityHeaders:
    def test_headers_present_on_root(self):
        r = requests.get(f"{API}/", timeout=15)
        assert r.status_code == 200
        h = {k.lower(): v for k, v in r.headers.items()}
        assert "max-age" in h.get("strict-transport-security", "")
        assert h.get("x-frame-options") == "DENY"
        assert h.get("x-content-type-options") == "nosniff"
        assert "referrer-policy" in h
        assert "permissions-policy" in h
        assert "cross-origin-opener-policy" in h
        assert "content-security-policy" in h
        csp = h["content-security-policy"]
        assert "default-src 'self'" in csp
        assert "frame-ancestors 'none'" in csp


# ---------------------------------------------------------------------------
# 2. CORS allowlist regex — evil origin rejected
# ---------------------------------------------------------------------------
class TestCORS:
    def test_evil_origin_rejected(self):
        r = requests.options(
            f"{API}/auth/me",
            headers={
                "Origin": "https://evil.example.com",
                "Access-Control-Request-Method": "GET",
            },
            timeout=15,
        )
        allow = r.headers.get("access-control-allow-origin", "")
        assert allow != "https://evil.example.com"
        assert allow != "*"

    def test_frontend_origin_allowed(self):
        r = requests.options(
            f"{API}/auth/me",
            headers={
                "Origin": BASE_URL,
                "Access-Control-Request-Method": "GET",
            },
            timeout=15,
        )
        allow = r.headers.get("access-control-allow-origin", "")
        assert allow == BASE_URL, f"Expected {BASE_URL}, got {allow!r}"
        assert r.headers.get("access-control-allow-credentials", "").lower() == "true"


# ---------------------------------------------------------------------------
# 3. Password strength on signup
# ---------------------------------------------------------------------------
class TestPasswordStrength:
    def test_short_password_rejected(self):
        email = f"TEST_short_{uuid.uuid4().hex[:8]}@example.com"
        r = requests.post(
            f"{API}/auth/signup",
            json={"email": email, "name": "T", "password": "1234567"},
            timeout=15,
        )
        assert 400 <= r.status_code < 500, f"expected 4xx, got {r.status_code}"

    def test_common_password_rejected(self):
        email = f"TEST_common_{uuid.uuid4().hex[:8]}@example.com"
        r = requests.post(
            f"{API}/auth/signup",
            json={"email": email, "name": "T", "password": "password123"},
            timeout=15,
        )
        assert r.status_code == 400
        detail = (r.json() or {}).get("detail", "").lower()
        assert "common" in detail, f"detail was {detail!r}"

    def test_strong_password_accepted(self):
        email = f"TEST_strong_{uuid.uuid4().hex[:8]}@example.com"
        r = requests.post(
            f"{API}/auth/signup",
            json={"email": email, "name": "Strong", "password": STRONG_PASSWORD},
            timeout=15,
        )
        assert r.status_code == 200, f"got {r.status_code}: {r.text[:200]}"
        body = r.json()
        assert "session_token" in body
        assert body["user"]["email"] == email.lower()
        # cleanup — delete via auth cookie
        sess = body["session_token"]
        requests.delete(
            f"{API}/account/delete",
            cookies={"session_token": sess},
            timeout=15,
        )


# ---------------------------------------------------------------------------
# 4. openapi.json public
# ---------------------------------------------------------------------------
class TestOpenAPI:
    def test_openapi_public(self):
        r = requests.get(f"{API}/openapi.json", timeout=15)
        # Depending on FastAPI config, may be at /api/openapi.json or /openapi.json
        if r.status_code == 404:
            r = requests.get(f"{BASE_URL}/openapi.json", timeout=15)
        assert r.status_code == 200
        assert r.headers.get("content-type", "").startswith("application/json")
        assert "openapi" in r.json()


# ---------------------------------------------------------------------------
# 5. Account export (uses seeded demo credentials, does NOT delete demo)
# ---------------------------------------------------------------------------
class TestAccountExport:
    def test_export_returns_json_dump_with_headers_and_redactions(self):
        _reseed()  # ensure demo password is demo123 and unlimited
        # Fresh login (this also rotates any prior demo session)
        r = requests.post(
            f"{API}/auth/login",
            json={"email": DEMO_EMAIL, "password": DEMO_PASSWORD},
            timeout=15,
        )
        assert r.status_code == 200, r.text
        session_token = r.json()["session_token"]

        rex = requests.get(
            f"{API}/account/export",
            cookies={"session_token": session_token},
            timeout=20,
        )
        assert rex.status_code == 200, rex.text
        assert "attachment" in rex.headers.get("content-disposition", "").lower()
        data = rex.json()
        required = {
            "exported_at", "user_id", "profile", "user_stats",
            "sessions_redacted", "focus_sessions", "daily_focus",
            "achievements", "mentor_sessions", "mentor_messages", "study_plans",
        }
        missing = required - set(data.keys())
        assert not missing, f"missing keys: {missing}"
        # profile.password_hash redacted
        assert data["profile"]["password_hash"] == "[REDACTED]"
        # sessions_redacted: each session_token = '[REDACTED]'
        sessions = data["sessions_redacted"]
        assert isinstance(sessions, list) and len(sessions) >= 1
        for s in sessions:
            assert s.get("session_token") == "[REDACTED]"


# ---------------------------------------------------------------------------
# 6. Account delete — throwaway user
# ---------------------------------------------------------------------------
class TestAccountDelete:
    def test_delete_wipes_and_invalidates_session(self):
        email = f"TEST_del_{uuid.uuid4().hex[:8]}@example.com"
        # signup (rate-limited 5/min but signup+delete only counts 1 signup)
        r = requests.post(
            f"{API}/auth/signup",
            json={"email": email, "name": "Delete Me", "password": STRONG_PASSWORD},
            timeout=15,
        )
        assert r.status_code == 200, r.text
        session_token = r.json()["session_token"]

        rd = requests.delete(
            f"{API}/account/delete",
            cookies={"session_token": session_token},
            timeout=15,
        )
        assert rd.status_code == 200
        assert rd.json().get("ok") is True

        # /auth/me with old cookie should now 401
        rme = requests.get(
            f"{API}/auth/me",
            cookies={"session_token": session_token},
            timeout=15,
        )
        assert rme.status_code == 401

        # login with deleted email should 401
        rl = requests.post(
            f"{API}/auth/login",
            json={"email": email, "password": STRONG_PASSWORD},
            timeout=15,
        )
        assert rl.status_code == 401


# ---------------------------------------------------------------------------
# 7. Client-errors endpoint
# ---------------------------------------------------------------------------
class TestClientErrors:
    def test_anonymous_post_ok(self):
        r = requests.post(
            f"{API}/client-errors",
            json={"message": "TEST_client_error_" + uuid.uuid4().hex[:6]},
            timeout=15,
        )
        assert r.status_code == 200
        assert r.json().get("ok") is True


# ---------------------------------------------------------------------------
# 8. Session rotation on login
# ---------------------------------------------------------------------------
class TestSessionRotation:
    def test_second_login_invalidates_first_session(self):
        _reseed()
        r1 = requests.post(
            f"{API}/auth/login",
            json={"email": DEMO_EMAIL, "password": DEMO_PASSWORD},
            timeout=15,
        )
        assert r1.status_code == 200
        tok1 = r1.json()["session_token"]

        # Verify tok1 works
        me = requests.get(f"{API}/auth/me", cookies={"session_token": tok1}, timeout=15)
        assert me.status_code == 200

        # Re-login → new session, old should be invalidated
        r2 = requests.post(
            f"{API}/auth/login",
            json={"email": DEMO_EMAIL, "password": DEMO_PASSWORD},
            timeout=15,
        )
        assert r2.status_code == 200
        tok2 = r2.json()["session_token"]
        assert tok2 != tok1

        me_old = requests.get(
            f"{API}/auth/me", cookies={"session_token": tok1}, timeout=15
        )
        assert me_old.status_code == 401
        me_new = requests.get(
            f"{API}/auth/me", cookies={"session_token": tok2}, timeout=15
        )
        assert me_new.status_code == 200


# ---------------------------------------------------------------------------
# 9. Structured logging — auth.login.ok EVENT line
# ---------------------------------------------------------------------------
class TestStructuredLogging:
    def test_login_emits_event_line(self):
        _reseed()
        # Fresh login
        r = requests.post(
            f"{API}/auth/login",
            json={"email": DEMO_EMAIL, "password": DEMO_PASSWORD},
            timeout=15,
        )
        assert r.status_code == 200
        time.sleep(1)
        # Read tail of backend log
        try:
            out = subprocess.check_output(
                ["tail", "-n", "500", BACKEND_LOG], text=True, timeout=10
            )
        except Exception as e:
            pytest.skip(f"cannot read {BACKEND_LOG}: {e}")
        events = [ln for ln in out.splitlines() if "auth.login.ok" in ln and "EVENT" in ln]
        assert events, "no 'EVENT ... auth.login.ok' line found in backend log tail"
        # Parse last one
        last = events[-1]
        m = re.search(r"EVENT\s+(\{.*\})", last)
        assert m, f"could not extract JSON from: {last[:200]}"
        payload = json.loads(m.group(1))
        assert payload["event"] == "auth.login.ok"
        assert "user_id" in payload
        assert payload.get("email") == DEMO_EMAIL
        assert "ip" in payload


# ---------------------------------------------------------------------------
# 10. Password reset flow (destructive to demo pw, so reseed at end)
# ---------------------------------------------------------------------------
class TestPasswordResetFlow:
    def test_reset_end_to_end(self):
        _reseed()
        # Request reset
        r = requests.post(
            f"{API}/auth/password-reset/request",
            json={"email": DEMO_EMAIL},
            headers={"Origin": BASE_URL},
            timeout=15,
        )
        assert r.status_code == 200
        # Log format check
        time.sleep(1)
        out = subprocess.check_output(
            ["tail", "-n", "500", BACKEND_LOG], text=True, timeout=10
        )
        lines = [ln for ln in out.splitlines() if "[PASSWORD RESET]" in ln and DEMO_EMAIL in ln]
        assert lines, "no [PASSWORD RESET] line for demo email"
        last = lines[-1]
        # Format: [PASSWORD RESET] email=<x> link=<origin>/reset-password?token=<t>
        m = re.search(r"\[PASSWORD RESET\] email=([\w@.\-+]+) link=(\S+)", last)
        assert m, f"format mismatch: {last}"
        assert m.group(1) == DEMO_EMAIL
        link = m.group(2)
        tok_m = re.search(r"token=([\w\-_]+)", link)
        assert tok_m, f"no token in link: {link}"
        token = tok_m.group(1)

        # Confirm reset
        rc = requests.post(
            f"{API}/auth/password-reset/confirm",
            json={"token": token, "new_password": STRONG_PASSWORD},
            timeout=15,
        )
        assert rc.status_code == 200
        assert rc.json().get("ok") is True

        # Sleep 65s before login checks — prior tests may have used the 5/min budget
        _sleep_for_rate_reset()

        # Old password should now fail (401)
        r_old = requests.post(
            f"{API}/auth/login",
            json={"email": DEMO_EMAIL, "password": DEMO_PASSWORD},
            timeout=15,
        )
        assert r_old.status_code == 401

        # New password works
        r_new = requests.post(
            f"{API}/auth/login",
            json={"email": DEMO_EMAIL, "password": STRONG_PASSWORD},
            timeout=15,
        )
        assert r_new.status_code == 200

        # Reseed to restore demo123 for downstream tests
        _reseed()


# ---------------------------------------------------------------------------
# 11. Rate limit on /api/auth/login — LAST test (burns the window)
# ---------------------------------------------------------------------------
class TestRateLimitLast:
    """Runs LAST — hits the 5/min ceiling and then sleeps.

    Ordered by the module ordering — pytest runs classes top-to-bottom.
    """
    def test_login_429_after_5_wrong(self):
        # Reseed to ensure a clean password reference
        _reseed()
        # Sleep 65s first to guarantee a fresh window (prior tests used the same IP)
        _sleep_for_rate_reset()
        got_429 = False
        codes = []
        for i in range(7):
            r = requests.post(
                f"{API}/auth/login",
                json={"email": DEMO_EMAIL, "password": "WRONG_pw_xyz"},
                timeout=15,
            )
            codes.append(r.status_code)
            if r.status_code == 429:
                assert (r.json() or {}).get("detail") == "Rate limit exceeded"
                got_429 = True
                break
        assert got_429, f"never got 429 in 7 attempts; codes={codes}"
        # Cool-down so downstream regressions can run
        _sleep_for_rate_reset()
        _reseed()
