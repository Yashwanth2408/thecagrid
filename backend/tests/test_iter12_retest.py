"""Iteration 12 focused retest: two backend fixes + light regression.

Fix 1: GET /api/content/posts?tag=Foundation → >=4 posts for Intermediate demo.
Fix 2: GET /api/account/export includes mock_attempts, mock_answers, user_flashcard_progress.
Regressions:
  - /api/openapi.json public
  - Security headers on every response
  - demo login returns session cookie
  - Anonymous /api/content/posts returns all 22 posts
  - /mocks list, decks list still work (light)
"""
import os
import time
import pytest
import requests

# Load REACT_APP_BACKEND_URL from frontend/.env if not exported in env
def _load_backend_url():
    url = os.environ.get("REACT_APP_BACKEND_URL")
    if url:
        return url.rstrip("/")
    env_path = "/app/frontend/.env"
    if os.path.exists(env_path):
        with open(env_path) as f:
            for line in f:
                if line.startswith("REACT_APP_BACKEND_URL="):
                    return line.split("=", 1)[1].strip().rstrip("/")
    raise RuntimeError("REACT_APP_BACKEND_URL not found")

BASE_URL = _load_backend_url()


@pytest.fixture(scope="module")
def api():
    s = requests.Session()
    s.headers.update({"Content-Type": "application/json"})
    return s


@pytest.fixture(scope="module")
def demo_session():
    # Ensure demo user exists and demo123 is restored
    s = requests.Session()
    s.headers.update({"Content-Type": "application/json"})
    # Reseed to restore demo credentials
    r = s.post(f"{BASE_URL}/api/seed", timeout=30)
    assert r.status_code in (200, 201), f"seed failed: {r.status_code} {r.text[:200]}"
    # Small delay to avoid login rate-limit collisions with other tests
    time.sleep(2)
    r = s.post(f"{BASE_URL}/api/auth/login",
               json={"email": "demo@cagrid.in", "password": "demo123"},
               timeout=15)
    assert r.status_code == 200, f"login failed: {r.status_code} {r.text[:200]}"
    assert "session_token" in s.cookies, "session_token cookie not set"
    return s


# ---------- FIX 1: content posts tag cross-match ----------
class TestFixContentPostsTag:
    def test_tag_foundation_returns_at_least_4(self, demo_session):
        r = demo_session.get(f"{BASE_URL}/api/content/posts", params={"tag": "Foundation"}, timeout=10)
        assert r.status_code == 200, r.text[:200]
        data = r.json()
        assert "items" in data and "count" in data
        assert data["count"] >= 4, f"expected >=4 posts for ?tag=Foundation, got {data['count']}: {[p.get('slug') for p in data['items']]}"

    def test_tag_and_explicit_level_still_respected(self, demo_session):
        r = demo_session.get(f"{BASE_URL}/api/content/posts",
                             params={"tag": "Foundation", "level": "Foundation"}, timeout=10)
        assert r.status_code == 200, r.text[:200]
        data = r.json()
        # Every returned post should match Foundation on either level_filter or tags
        for p in data["items"]:
            lf = p.get("level_filter") or []
            tags = p.get("tags") or []
            assert "Foundation" in lf or "Foundation" in tags, \
                f"post {p.get('slug')} has neither Foundation level_filter nor Foundation tag: lf={lf} tags={tags}"
        assert data["count"] >= 1

    def test_anonymous_no_query_returns_all_22(self, api):
        # Regression: anonymous caller with no query params should see full list
        r = api.get(f"{BASE_URL}/api/content/posts", timeout=10)
        assert r.status_code == 200, r.text[:200]
        data = r.json()
        assert data["count"] >= 22, f"anonymous unfiltered should return >=22, got {data['count']}"


# ---------- FIX 2: account export includes P5 collections ----------
class TestFixAccountExport:
    def test_export_includes_mock_and_flashcard_arrays(self, demo_session):
        r = demo_session.get(f"{BASE_URL}/api/account/export", timeout=20)
        assert r.status_code == 200, r.text[:200]
        # Content-Disposition still present
        assert "attachment" in r.headers.get("Content-Disposition", "").lower()
        payload = r.json()

        # New keys
        for key in ("mock_attempts", "mock_answers", "user_flashcard_progress"):
            assert key in payload, f"missing key '{key}' in export payload"
            assert isinstance(payload[key], list), f"'{key}' should be a list, got {type(payload[key])}"

        # Seeded volumes
        assert len(payload["mock_attempts"]) >= 3, \
            f"expected >=3 mock_attempts, got {len(payload['mock_attempts'])}"
        assert len(payload["user_flashcard_progress"]) >= 40, \
            f"expected >=40 user_flashcard_progress, got {len(payload['user_flashcard_progress'])}"
        # mock_answers must be a list; may be many rows from the seeded attempts
        assert isinstance(payload["mock_answers"], list)

        # _id must not leak into any row
        for k in ("mock_attempts", "mock_answers", "user_flashcard_progress"):
            for row in payload[k]:
                assert "_id" not in row, f"{k} row leaks _id"

    def test_export_prior_keys_still_present(self, demo_session):
        r = demo_session.get(f"{BASE_URL}/api/account/export", timeout=20)
        assert r.status_code == 200
        payload = r.json()
        expected_keys = [
            "profile", "user_stats", "sessions_redacted",
            "focus_sessions", "daily_focus", "achievements",
            "mentor_sessions", "mentor_messages", "study_plans",
            "syllabus_progress", "dismissed_alerts",
        ]
        for k in expected_keys:
            assert k in payload, f"missing prior key '{k}'"

    def test_export_session_tokens_redacted(self, demo_session):
        r = demo_session.get(f"{BASE_URL}/api/account/export", timeout=20)
        payload = r.json()
        for s in payload.get("sessions_redacted", []):
            assert s.get("session_token") == "[REDACTED]", \
                f"session_token not redacted: {s.get('session_token')}"


# ---------- REGRESSION: basic public endpoints ----------
class TestRegressionBasics:
    def test_openapi_public(self, api):
        r = api.get(f"{BASE_URL}/api/openapi.json", timeout=10)
        assert r.status_code == 200
        data = r.json()
        assert "openapi" in data and "paths" in data

    def test_security_headers_present(self, api):
        r = api.get(f"{BASE_URL}/api/openapi.json", timeout=10)
        for h in ("Strict-Transport-Security", "X-Frame-Options",
                  "X-Content-Type-Options", "Referrer-Policy",
                  "Content-Security-Policy"):
            assert h in r.headers, f"missing header {h}"
        assert r.headers.get("X-Frame-Options") == "DENY"
        assert r.headers.get("X-Content-Type-Options") == "nosniff"


# ---------- REGRESSION: Phase 5 endpoints ----------
class TestRegressionPhase5:
    def test_mocks_list(self, demo_session):
        r = demo_session.get(f"{BASE_URL}/api/mocks", timeout=10)
        assert r.status_code == 200
        data = r.json()
        assert "items" in data
        assert len(data["items"]) >= 1

    def test_flashcard_decks_list(self, demo_session):
        r = demo_session.get(f"{BASE_URL}/api/flashcards/decks", timeout=10)
        assert r.status_code == 200
        data = r.json()
        assert "items" in data or "decks" in data or isinstance(data, list)

    def test_flashcards_stats(self, demo_session):
        r = demo_session.get(f"{BASE_URL}/api/flashcards/stats", timeout=10)
        assert r.status_code == 200

    def test_mocks_history(self, demo_session):
        r = demo_session.get(f"{BASE_URL}/api/mocks/attempts/history", timeout=10)
        assert r.status_code == 200


# ---------- REGRESSION: radar cache invalidation basic ----------
class TestRegressionRadar:
    def test_radar_summary(self, demo_session):
        r = demo_session.get(f"{BASE_URL}/api/radar/summary", timeout=10)
        assert r.status_code == 200
        d = r.json()
        assert "unread_count" in d
