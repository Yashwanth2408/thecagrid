"""Phase 2 backend tests: focus, stats, achievements, dashboard, live pulse."""
import os
import time
import uuid
import pytest
import requests

BASE_URL = os.environ.get("REACT_APP_BACKEND_URL")
if not BASE_URL:
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


# ---------- Fixtures ---------- (session seed comes from conftest.py)
@pytest.fixture(scope="module")
def demo_token():
    r = requests.post(
        f"{API}/auth/login",
        json={"email": "demo@cagrid.in", "password": "demo123"},
        timeout=15,
    )
    assert r.status_code == 200
    return r.json()["session_token"]


@pytest.fixture()
def auth_headers(demo_token):
    return {"Authorization": f"Bearer {demo_token}"}


# ---------- PUBLIC endpoints ----------
class TestPublicEndpoints:
    def test_live_pulse_public(self):
        r = requests.get(f"{API}/live/pulse", timeout=15)
        assert r.status_code == 200
        d = r.json()
        for k in ("minutes_last_hour", "active_now", "streaks_at_risk",
                  "sessions_completed_today", "recent_sessions", "generated_at"):
            assert k in d, f"missing {k}"
        assert isinstance(d["recent_sessions"], list)
        assert len(d["recent_sessions"]) == 12
        row = d["recent_sessions"][0]
        for k in ("level", "subject", "minutes", "city", "completed_at_relative"):
            assert k in row

    def test_openapi_public(self):
        r = requests.get(f"{API}/openapi.json", timeout=15)
        assert r.status_code == 200, f"{r.status_code} {r.text[:200]}"
        j = r.json()
        assert "paths" in j
        for p in ("/api/focus/start", "/api/stats/me", "/api/achievements",
                  "/api/dashboard", "/api/live/pulse"):
            assert p in j["paths"], f"missing {p} in openapi"


# ---------- Auth (regression) ----------
class TestAuthRegression:
    def test_login_demo(self):
        s = requests.Session()
        r = s.post(f"{API}/auth/login",
                   json={"email": "demo@cagrid.in", "password": "demo123"}, timeout=15)
        assert r.status_code == 200
        assert s.cookies.get("session_token")
        assert r.json()["user"]["email"] == "demo@cagrid.in"


# ---------- Stats ----------
class TestStats:
    def test_stats_me(self, auth_headers):
        r = requests.get(f"{API}/stats/me", headers=auth_headers, timeout=15)
        assert r.status_code == 200
        d = r.json()
        assert d["current_streak"] == 14, f"streak={d['current_streak']}"
        assert d["best_streak"] == 14
        assert d["level"] >= 5, f"level={d['level']}"
        assert d["total_xp"] >= 2000, f"xp={d['total_xp']}"
        assert d["sessions_completed"] >= 30
        assert d["total_focus_minutes"] >= 1500

    def test_heatmap_365(self, auth_headers):
        r = requests.get(f"{API}/stats/heatmap?days=365", headers=auth_headers, timeout=15)
        assert r.status_code == 200
        d = r.json()
        assert len(d) == 365
        for row in d[:3]:
            assert "date" in row and "minutes" in row and "sessions" in row

    def test_weekly_7_ordered(self, auth_headers):
        r = requests.get(f"{API}/stats/weekly", headers=auth_headers, timeout=15)
        assert r.status_code == 200
        d = r.json()
        assert len(d) == 7
        dates = [row["date"] for row in d]
        assert dates == sorted(dates), "weekly not oldest-first"

    def test_monthly_30(self, auth_headers):
        r = requests.get(f"{API}/stats/monthly", headers=auth_headers, timeout=15)
        assert r.status_code == 200
        assert len(r.json()) == 30

    def test_subjects(self, auth_headers):
        r = requests.get(f"{API}/stats/subjects", headers=auth_headers, timeout=15)
        assert r.status_code == 200
        d = r.json()
        assert isinstance(d, list) and len(d) >= 3
        subjects = [row["subject"] for row in d]
        # From DEMO_SUBJECTS
        assert any(s in subjects for s in ["Advanced Accounts", "Business Law", "Auditing"])
        for row in d:
            assert "minutes" in row and "sessions" in row

    def test_hour_of_day(self, auth_headers):
        r = requests.get(f"{API}/stats/hour-of-day", headers=auth_headers, timeout=15)
        assert r.status_code == 200
        d = r.json()
        assert len(d) == 24
        for i, row in enumerate(d):
            assert row["hour"] == i
            assert "minutes" in row


# ---------- Achievements ----------
class TestAchievements:
    def test_achievements_shape(self, auth_headers):
        r = requests.get(f"{API}/achievements", headers=auth_headers, timeout=15)
        assert r.status_code == 200
        d = r.json()
        assert len(d) == 20
        unlocked = [b for b in d if b["unlocked"]]
        # Baseline seed unlocks 9. If any focus session is completed on the demo
        # user (in this suite or before), check_and_unlock_badges will also unlock
        # level_5 (demo user is level 8), giving 10. Accept 9-10.
        assert 9 <= len(unlocked) <= 10, f"expected 9-10 unlocked, got {len(unlocked)}"
        for b in unlocked:
            assert b.get("unlocked_at"), f"{b['badge_id']} missing unlocked_at"
        ids = {b["badge_id"] for b in unlocked}
        expected = {"founder_grid", "first_focus", "hour_one", "streak_3",
                    "streak_7", "hour_25", "night_owl", "weekend_warrior", "polymath"}
        assert expected <= ids, f"missing {expected - ids}"


# ---------- Dashboard ----------
class TestDashboard:
    def test_dashboard(self, auth_headers):
        r = requests.get(f"{API}/dashboard", headers=auth_headers, timeout=15)
        assert r.status_code == 200
        d = r.json()
        assert "stats" in d
        assert len(d["top_subjects"]) >= 3
        assert len(d["recent_sessions"]) >= 1
        assert len(d["latest_badges"]) >= 1
        assert len(d["heatmap_90"]) == 90
        # 9 baseline; +1 (level_5) if any completion happened; +1 (level_10) impossible baseline
        assert 9 <= d["badge_progress"]["unlocked"] <= 10
        assert d["badge_progress"]["total"] == 20


# ---------- Focus Flow ----------
class TestFocusFlow:
    def test_focus_start_active_complete(self):
        # Fresh session for demo user
        s = requests.Session()
        r = s.post(f"{API}/auth/login",
                   json={"email": "demo@cagrid.in", "password": "demo123"}, timeout=15)
        assert r.status_code == 200

        stats_before = s.get(f"{API}/stats/me", timeout=10).json()

        r = s.post(f"{API}/focus/start",
                   json={"subject": "Auditing", "planned_minutes": 1}, timeout=15)
        assert r.status_code == 200
        d = r.json()
        assert d["subject"] == "Auditing"
        assert d["planned_seconds"] == 60
        session_id = d["session_id"]

        # active fetch
        r2 = s.get(f"{API}/focus/active", timeout=10)
        assert r2.status_code == 200
        active = r2.json()
        assert active and active["session_id"] == session_id

        # complete immediately (min 30s, minutes=0 but xp still awarded)
        r3 = s.post(f"{API}/focus/complete", json={"session_id": session_id}, timeout=15)
        assert r3.status_code == 200, r3.text
        c = r3.json()
        assert c["xp_awarded"] > 0
        assert c["level"] >= 8, f"expected level>=8, got {c['level']}"
        assert isinstance(c["level_up"], bool)
        # streak unchanged or +1 (already active today so probably delta=0)
        assert c["current_streak"] >= 14
        # verify session marked completed
        active2 = s.get(f"{API}/focus/active", timeout=10).json()
        assert active2 is None, "session should no longer be active"

    def test_focus_cancel(self):
        s = requests.Session()
        r = s.post(f"{API}/auth/login",
                   json={"email": "demo@cagrid.in", "password": "demo123"}, timeout=15)
        assert r.status_code == 200

        stats_before = s.get(f"{API}/stats/me", timeout=10).json()

        r = s.post(f"{API}/focus/start",
                   json={"subject": "Costing", "planned_minutes": 5}, timeout=15)
        assert r.status_code == 200
        session_id = r.json()["session_id"]

        r2 = s.post(f"{API}/focus/cancel", json={"session_id": session_id}, timeout=15)
        assert r2.status_code == 200
        assert r2.json()["status"] == "cancelled"

        # No new active
        assert s.get(f"{API}/focus/active", timeout=10).json() is None

        # xp unchanged
        stats_after = s.get(f"{API}/stats/me", timeout=10).json()
        assert stats_after["total_xp"] == stats_before["total_xp"], \
            f"XP changed on cancel: {stats_before['total_xp']} -> {stats_after['total_xp']}"


# ---------- Onboarding w/ city + Founder badge ----------
class TestOnboardingAndFounder:
    def test_signup_unlocks_founder_and_onboarding_city(self):
        email = f"onb2_{uuid.uuid4().hex[:8]}@cagrid.in"
        s = requests.Session()
        r = s.post(f"{API}/auth/signup",
                   json={"email": email, "password": "pass1234", "name": "Onb Two"},
                   timeout=15)
        assert r.status_code == 200
        token = r.json()["session_token"]
        H = {"Authorization": f"Bearer {token}"}

        # Founder badge unlocked
        ach = requests.get(f"{API}/achievements", headers=H, timeout=15).json()
        founder = [b for b in ach if b["badge_id"] == "founder_grid"]
        assert founder and founder[0]["unlocked"] is True

        # onboarding w/ city
        r2 = requests.post(f"{API}/onboarding", headers=H, json={
            "journey_level": "Foundation", "daily_goal_minutes": 120,
            "subjects": ["Accounting"], "onboarded": True, "city": "Bangalore",
        }, timeout=15)
        assert r2.status_code == 200
        me = requests.get(f"{API}/auth/me", headers=H, timeout=15).json()
        assert me["city"] == "Bangalore"


# ---------- Seed idempotency ----------
class TestSeedIdempotency:
    def test_seed_idempotent_no_dup_sessions(self):
        r1 = requests.post(f"{API}/seed", timeout=30)
        assert r1.status_code == 200
        # login and count via focus/history
        s = requests.Session()
        s.post(f"{API}/auth/login",
               json={"email": "demo@cagrid.in", "password": "demo123"}, timeout=15)
        hist1 = s.get(f"{API}/focus/history?limit=200", timeout=15).json()
        # Seed again
        r2 = requests.post(f"{API}/seed", timeout=30)
        assert r2.status_code == 200
        hist2 = s.get(f"{API}/focus/history?limit=200", timeout=15).json()
        # completed session counts should be within ±5 (deterministic RNG so usually same)
        c1 = sum(1 for x in hist1 if x.get("status") == "completed")
        c2 = sum(1 for x in hist2 if x.get("status") == "completed")
        assert abs(c1 - c2) <= 5, f"seed produced very different counts: {c1} vs {c2}"
        assert 30 <= c2 <= 50, f"expected ~40 sessions, got {c2}"
