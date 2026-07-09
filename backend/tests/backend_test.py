"""Backend tests for The CA Grid API — auth, onboarding, syllabus, seed."""
import os
import time
import uuid
import pytest
import requests

BASE_URL = os.environ.get("REACT_APP_BACKEND_URL")
if not BASE_URL:
    # Attempt to load from frontend/.env
    from pathlib import Path
    fenv = Path("/app/frontend/.env")
    if fenv.exists():
        for line in fenv.read_text().splitlines():
            if line.startswith("REACT_APP_BACKEND_URL="):
                BASE_URL = line.split("=", 1)[1].strip()
                break

assert BASE_URL, "REACT_APP_BACKEND_URL is required"
BASE_URL = BASE_URL.rstrip("/")
API = f"{BASE_URL}/api"


# ---------- Fixtures ----------
@pytest.fixture(scope="session", autouse=True)
def ensure_seed():
    """Trigger idempotent seed so demo user exists."""
    r = requests.post(f"{API}/seed", timeout=15)
    assert r.status_code == 200, f"Seed failed: {r.status_code} {r.text}"
    data = r.json()
    assert data.get("ok") is True
    return data


@pytest.fixture()
def fresh_session():
    return requests.Session()


# ---------- Health / OpenAPI ----------
class TestHealthAndOpenAPI:
    def test_root_endpoint(self):
        r = requests.get(f"{API}/", timeout=10)
        assert r.status_code == 200
        assert r.json() == {"message": "The CA Grid API"}

    def test_openapi_public(self):
        # OpenAPI is served at /openapi.json (FastAPI default at app root)
        r = requests.get(f"{BASE_URL}/openapi.json", timeout=10)
        # accept either API-prefix mount or root; typical FastAPI: root
        if r.status_code == 404:
            r = requests.get(f"{API}/openapi.json", timeout=10)
        assert r.status_code == 200, f"OpenAPI not public: {r.status_code}"
        j = r.json()
        assert "paths" in j
        assert "/api/auth/login" in j["paths"] or "/auth/login" in j["paths"]


# ---------- Auth ----------
class TestAuth:
    def test_login_demo_user(self, fresh_session):
        r = fresh_session.post(
            f"{API}/auth/login",
            json={"email": "demo@cagrid.in", "password": "demo123"},
            timeout=15,
        )
        assert r.status_code == 200, f"{r.status_code} {r.text}"
        data = r.json()
        assert "user" in data and "session_token" in data
        assert data["user"]["email"] == "demo@cagrid.in"
        assert data["user"]["onboarded"] is True
        assert data["user"]["journey_level"] == "Foundation"
        # cookie set
        assert fresh_session.cookies.get("session_token"), "session_token cookie not set"

    def test_login_wrong_password(self):
        r = requests.post(
            f"{API}/auth/login",
            json={"email": "demo@cagrid.in", "password": "wrongpass"},
            timeout=15,
        )
        assert r.status_code == 401

    def test_signup_creates_user_and_cookie(self, fresh_session):
        email = f"test_{uuid.uuid4().hex[:10]}@cagrid.in"
        r = fresh_session.post(
            f"{API}/auth/signup",
            json={"email": email, "password": "testpass123", "name": "Test User"},
            timeout=15,
        )
        assert r.status_code == 200, f"{r.status_code} {r.text}"
        data = r.json()
        assert data["user"]["email"] == email
        assert data["user"]["onboarded"] is False
        assert data["session_token"]
        assert fresh_session.cookies.get("session_token")

    def test_signup_duplicate_email(self):
        email = f"dup_{uuid.uuid4().hex[:10]}@cagrid.in"
        payload = {"email": email, "password": "pass1234", "name": "Dup User"}
        r1 = requests.post(f"{API}/auth/signup", json=payload, timeout=15)
        assert r1.status_code == 200
        r2 = requests.post(f"{API}/auth/signup", json=payload, timeout=15)
        assert r2.status_code == 400

    def test_me_returns_401_when_unauthenticated(self):
        r = requests.get(f"{API}/auth/me", timeout=10)
        assert r.status_code == 401, f"expected 401, got {r.status_code}"

    def test_me_with_cookie(self, fresh_session):
        r = fresh_session.post(
            f"{API}/auth/login",
            json={"email": "demo@cagrid.in", "password": "demo123"},
            timeout=15,
        )
        assert r.status_code == 200
        r2 = fresh_session.get(f"{API}/auth/me", timeout=10)
        assert r2.status_code == 200
        data = r2.json()
        assert data["email"] == "demo@cagrid.in"
        # sanitize: no _id
        assert "_id" not in data
        assert "user_id" in data

    def test_me_with_bearer_token(self):
        # login via ephemeral session (no cookie jar reuse)
        r = requests.post(
            f"{API}/auth/login",
            json={"email": "demo@cagrid.in", "password": "demo123"},
            timeout=15,
        )
        token = r.json()["session_token"]
        r2 = requests.get(
            f"{API}/auth/me",
            headers={"Authorization": f"Bearer {token}"},
            timeout=10,
        )
        assert r2.status_code == 200
        assert r2.json()["email"] == "demo@cagrid.in"

    def test_logout_invalidates_session(self, fresh_session):
        r = fresh_session.post(
            f"{API}/auth/login",
            json={"email": "demo@cagrid.in", "password": "demo123"},
            timeout=15,
        )
        assert r.status_code == 200
        token = r.json()["session_token"]
        r2 = fresh_session.post(f"{API}/auth/logout", timeout=10)
        assert r2.status_code == 200
        # /me with old token should be 401
        r3 = requests.get(
            f"{API}/auth/me",
            headers={"Authorization": f"Bearer {token}"},
            timeout=10,
        )
        assert r3.status_code == 401


# ---------- Onboarding ----------
class TestOnboarding:
    def test_onboarding_requires_auth(self):
        r = requests.post(
            f"{API}/onboarding",
            json={
                "journey_level": "Foundation",
                "daily_goal_minutes": 180,
                "subjects": ["Accounting"],
                "fit_score": None,
                "onboarded": True,
            },
            timeout=10,
        )
        assert r.status_code == 401

    def test_onboarding_saves_updates(self):
        # create a fresh user via signup
        email = f"onb_{uuid.uuid4().hex[:10]}@cagrid.in"
        s = requests.Session()
        r = s.post(
            f"{API}/auth/signup",
            json={"email": email, "password": "pass1234", "name": "Onb User"},
            timeout=15,
        )
        assert r.status_code == 200
        assert r.json()["user"]["onboarded"] is False
        token = r.json()["session_token"]

        r2 = requests.post(
            f"{API}/onboarding",
            headers={"Authorization": f"Bearer {token}"},
            json={
                "journey_level": "Foundation",
                "daily_goal_minutes": 240,
                "subjects": ["Accounting", "Business Laws"],
                "fit_score": 75,
                "onboarded": True,
            },
            timeout=15,
        )
        assert r2.status_code == 200
        updated = r2.json()
        assert updated["journey_level"] == "Foundation"
        assert updated["daily_goal_minutes"] == 240
        assert updated["subjects"] == ["Accounting", "Business Laws"]
        assert updated["fit_score"] == 75
        assert updated["onboarded"] is True

        # verify persistence via /me
        me = requests.get(
            f"{API}/auth/me",
            headers={"Authorization": f"Bearer {token}"},
            timeout=10,
        ).json()
        assert me["onboarded"] is True
        assert me["daily_goal_minutes"] == 240


# ---------- Syllabus ----------
class TestSyllabus:
    def test_syllabus_returns_seeded_data(self):
        r = requests.get(f"{API}/syllabus", timeout=10)
        assert r.status_code == 200
        docs = r.json()
        assert isinstance(docs, list)
        # 4 + 6 + 6 = 16
        assert len(docs) >= 16
        levels = [d["level"] for d in docs]
        assert levels.count("Foundation") == 4
        assert levels.count("Intermediate") == 6
        assert levels.count("Final") == 6

    def test_syllabus_filter_by_level(self):
        r = requests.get(f"{API}/syllabus?level=Foundation", timeout=10)
        assert r.status_code == 200
        docs = r.json()
        assert len(docs) == 4
        assert all(d["level"] == "Foundation" for d in docs)


# ---------- Seed idempotent ----------
class TestSeedIdempotent:
    def test_seed_twice_no_duplicates(self):
        r1 = requests.post(f"{API}/seed", timeout=15)
        r2 = requests.post(f"{API}/seed", timeout=15)
        assert r1.status_code == 200
        assert r2.status_code == 200
        # Same demo_user_id both times
        assert r1.json().get("demo_user_id") == r2.json().get("demo_user_id")
        # Syllabus count unchanged
        docs = requests.get(f"{API}/syllabus", timeout=10).json()
        assert len(docs) == 16
