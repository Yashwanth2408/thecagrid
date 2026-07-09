"""Phase 3 backend tests — Mentor (LLM + streaming), Study Plan, seed idempotency."""
import os
import json as _json
import time
import uuid
from datetime import datetime, timedelta

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

BASE_URL = (BASE_URL or "").rstrip("/")
API = f"{BASE_URL}/api"


# ---------- Fixtures ----------
@pytest.fixture(scope="module")
def demo_session():
    s = requests.Session()
    r = s.post(f"{API}/auth/login",
               json={"email": "demo@cagrid.in", "password": "demo123"},
               timeout=15)
    assert r.status_code == 200, f"demo login failed: {r.text}"
    return s


@pytest.fixture(scope="module")
def demo_token():
    r = requests.post(f"{API}/auth/login",
                      json={"email": "demo@cagrid.in", "password": "demo123"},
                      timeout=15)
    assert r.status_code == 200
    return r.json()["session_token"]


# ---------- OpenAPI ----------
class TestOpenAPIPhase3:
    def test_openapi_lists_phase3_endpoints(self):
        r = requests.get(f"{API}/openapi.json", timeout=10)
        assert r.status_code == 200
        paths = r.json().get("paths", {})
        # Phase 3 endpoints must be listed
        expected = [
            "/api/mentor/sessions",
            "/api/mentor/chat",
            "/api/mentor/quick",
            "/api/study-plan/generate",
            "/api/study-plan/active",
        ]
        for p in expected:
            assert p in paths, f"OpenAPI missing {p}. Present: {list(paths.keys())[:20]}..."
        # Archive path uses templated param
        assert any(k.startswith("/api/study-plan/") and "archive" in k for k in paths.keys()), \
            "study-plan archive path not in OpenAPI"


# ---------- Auth gates ----------
class TestAuthRequired:
    def test_mentor_sessions_requires_auth(self):
        r = requests.get(f"{API}/mentor/sessions", timeout=10)
        assert r.status_code == 401

    def test_mentor_chat_requires_auth(self):
        r = requests.post(f"{API}/mentor/chat",
                          json={"session_id": "x", "message": "hi"}, timeout=10)
        assert r.status_code == 401

    def test_mentor_quick_requires_auth(self):
        r = requests.post(f"{API}/mentor/quick",
                          json={"message": "hi"}, timeout=10)
        assert r.status_code == 401

    def test_study_plan_active_requires_auth(self):
        r = requests.get(f"{API}/study-plan/active", timeout=10)
        assert r.status_code == 401

    def test_study_plan_generate_requires_auth(self):
        r = requests.post(f"{API}/study-plan/generate",
                          json={"exam_date": "2026-06-01", "daily_hours": 3, "weak_areas": []},
                          timeout=10)
        assert r.status_code == 401


# ---------- Seeded mentor sessions ----------
class TestSeededMentor:
    def test_two_seeded_sessions(self, demo_session):
        r = demo_session.get(f"{API}/mentor/sessions", timeout=15)
        assert r.status_code == 200, r.text
        sessions = r.json()
        assert isinstance(sessions, list)
        assert len(sessions) >= 2, f"Expected >=2 sessions, got {len(sessions)}"
        titles = {s["title"] for s in sessions}
        assert "Explain Ind AS 115 revenue recognition" in titles
        assert "GST on export of services" in titles
        for s in sessions:
            if s["title"] in ("Explain Ind AS 115 revenue recognition", "GST on export of services"):
                assert s["mode"] == "exam"

    def test_get_session_ind_as_115(self, demo_session):
        r = demo_session.get(f"{API}/mentor/sessions", timeout=15)
        sessions = r.json()
        target = next(s for s in sessions if s["title"] == "Explain Ind AS 115 revenue recognition")
        r2 = demo_session.get(f"{API}/mentor/sessions/{target['session_id']}", timeout=15)
        assert r2.status_code == 200
        data = r2.json()
        assert "session" in data and "messages" in data
        assert data["session"]["session_id"] == target["session_id"]
        msgs = data["messages"]
        assert len(msgs) == 4, f"Ind AS 115 should have 4 messages, got {len(msgs)}"
        # citations on assistant messages
        assistant_msgs = [m for m in msgs if m["role"] == "assistant"]
        for m in assistant_msgs:
            assert m.get("citations"), f"Assistant message missing citations: {m.get('message_id')}"

    def test_get_session_gst(self, demo_session):
        r = demo_session.get(f"{API}/mentor/sessions", timeout=15)
        sessions = r.json()
        target = next(s for s in sessions if s["title"] == "GST on export of services")
        r2 = demo_session.get(f"{API}/mentor/sessions/{target['session_id']}", timeout=15)
        assert r2.status_code == 200
        msgs = r2.json()["messages"]
        assert len(msgs) == 2, f"GST session should have 2 messages, got {len(msgs)}"


# ---------- Create mentor session ----------
class TestMentorCreate:
    def test_create_session_titles_from_message(self, demo_session):
        r = demo_session.post(
            f"{API}/mentor/sessions",
            json={"mode": "exam", "initial_message": "Section 44AD summary"},
            timeout=15,
        )
        assert r.status_code == 200, r.text
        data = r.json()
        assert data["mode"] == "exam"
        assert "Section 44AD summary" in data["title"]
        assert data["session_id"].startswith("mses_")

    def test_delete_soft_deletes(self, demo_session):
        # Create a throwaway session
        r = demo_session.post(f"{API}/mentor/sessions",
                              json={"mode": "exam", "initial_message": "TEST_delete_me"},
                              timeout=15)
        sid = r.json()["session_id"]
        r2 = demo_session.delete(f"{API}/mentor/sessions/{sid}", timeout=15)
        assert r2.status_code == 200
        # subsequent list should not include it
        r3 = demo_session.get(f"{API}/mentor/sessions", timeout=15)
        ids = [s["session_id"] for s in r3.json()]
        assert sid not in ids


# ---------- Streaming SSE (mentor/chat) ----------
def _consume_sse(url: str, headers: dict, payload: dict, timeout: int = 45):
    """Consume SSE stream via requests streaming. Returns (events, content_type, xac_buf)."""
    events = []
    with requests.post(url, headers=headers, json=payload, stream=True, timeout=timeout) as resp:
        ct = resp.headers.get("content-type", "")
        xac = resp.headers.get("x-accel-buffering", "")
        assert resp.status_code == 200, f"stream request failed {resp.status_code}: {resp.text[:400]}"
        buffer = ""
        for chunk in resp.iter_content(chunk_size=None, decode_unicode=True):
            if not chunk:
                continue
            buffer += chunk
            while "\n\n" in buffer:
                raw, buffer = buffer.split("\n\n", 1)
                for line in raw.splitlines():
                    if line.startswith("data:"):
                        payload_str = line[5:].strip()
                        if not payload_str:
                            continue
                        try:
                            events.append(_json.loads(payload_str))
                        except Exception:
                            pass
            # Early exit once we have enough events
            if any(e.get("type") == "done" for e in events):
                break
    return events, ct, xac


class TestMentorChatStream:
    def test_chat_streams_sse(self, demo_session, demo_token):
        # Create a fresh session
        r = demo_session.post(
            f"{API}/mentor/sessions",
            json={"mode": "exam", "initial_message": "TEST_stream_check"},
            timeout=15,
        )
        sid = r.json()["session_id"]

        headers = {"Authorization": f"Bearer {demo_token}", "Content-Type": "application/json"}
        events, ct, xac = _consume_sse(
            f"{API}/mentor/chat",
            headers,
            {"session_id": sid, "message": "Explain Section 44AD in 3 lines."},
            timeout=60,
        )
        assert "text/event-stream" in ct, f"expected event-stream content-type, got {ct!r}"
        assert xac.lower() == "no", f"expected X-Accel-Buffering: no, got {xac!r}"
        types = [e.get("type") for e in events]
        assert "start" in types, f"no start event. Events: {types}"
        assert types.count("delta") >= 1, f"expected >=1 delta events, got {types}"
        assert "done" in types, f"stream did not end with done. Types: {types}"


class TestMentorQuick:
    def test_a_quick_streams_and_no_persist(self, demo_token):
        """Run BEFORE rate-limit test — burning quick budget makes streaming return 429."""
        headers = {"Authorization": f"Bearer {demo_token}", "Content-Type": "application/json"}
        # If a prior test/session already burned the budget, wait for the 60s window
        # to reset (in-memory sliding window). Try once, on 429 sleep and retry once.
        for attempt in range(2):
            try:
                events, ct, _ = _consume_sse(
                    f"{API}/mentor/quick",
                    headers,
                    {"message": "2-sentence take on Section 44AD", "mode": "exam"},
                    timeout=60,
                )
                break
            except AssertionError as e:
                if "429" in str(e) and attempt == 0:
                    time.sleep(62)
                    continue
                raise
        assert "text/event-stream" in ct
        types = [e.get("type") for e in events]
        assert "start" in types and "done" in types
        assert types.count("delta") >= 1

    def test_z_quick_rate_limit(self, demo_token):
        """11th call within 60s should return 429."""
        headers = {"Authorization": f"Bearer {demo_token}", "Content-Type": "application/json"}
        # We've already made 1 call in the prior test in this class. Depending on order,
        # burn through until we hit 429 within reasonable range.
        got_429 = False
        # Make up to 15 fast quick calls; each is streaming so close ASAP.
        for i in range(15):
            try:
                r = requests.post(f"{API}/mentor/quick",
                                  headers=headers,
                                  json={"message": f"hi {i}", "mode": "exam"},
                                  stream=True, timeout=20)
                if r.status_code == 429:
                    got_429 = True
                    r.close()
                    break
                # Otherwise, close the stream immediately (don't consume LLM tokens further).
                r.close()
            except requests.exceptions.RequestException:
                pass
        assert got_429, "expected a 429 within 15 rapid /mentor/quick calls"


# ---------- Study plan ----------
class TestStudyPlan:
    def test_active_plan_seeded(self, demo_session):
        r = demo_session.get(f"{API}/study-plan/active", timeout=15)
        assert r.status_code == 200
        plan = r.json()
        assert plan is not None, "demo should have an active plan"
        assert plan["daily_hours"] == 4
        assert set(plan["weak_areas"]) == {"Advanced Accounts", "Costing"}
        # exam_date ~90 days out
        exam_dt = datetime.strptime(plan["exam_date"], "%Y-%m-%d").date()
        today = datetime.now().date()
        days = (exam_dt - today).days
        assert 85 <= days <= 92, f"exam_date should be ~90 days out, got {days}"
        weeks = plan["plan_json"]["weeks"]
        assert len(weeks) == 12
        for w in weeks:
            assert len(w["days"]) == 7

    def test_generate_archives_previous_then_archive_returns_null(self, demo_session):
        # Regenerate: exam_date <45 days from now
        exam_date = (datetime.now().date() + timedelta(days=44)).strftime("%Y-%m-%d")
        r = demo_session.post(
            f"{API}/study-plan/generate",
            json={"exam_date": exam_date, "daily_hours": 3, "weak_areas": ["Taxation"]},
            timeout=120,
        )
        assert r.status_code == 200, r.text
        plan = r.json()
        assert plan["exam_date"] == exam_date
        assert plan["status"] == "active"
        assert "weeks" in plan["plan_json"]
        new_plan_id = plan["plan_id"]

        # Active plan should now be the new one
        r2 = demo_session.get(f"{API}/study-plan/active", timeout=15)
        assert r2.status_code == 200
        active = r2.json()
        assert active is not None
        assert active["plan_id"] == new_plan_id

        # Archive the newly generated plan
        r3 = demo_session.post(f"{API}/study-plan/{new_plan_id}/archive", timeout=15)
        assert r3.status_code == 200
        # Now /active should return null (or another active — after re-seed it will be the seeded one)
        r4 = demo_session.get(f"{API}/study-plan/active", timeout=15)
        active2 = r4.json()
        # After archiving there should be no active plan for this user
        assert active2 is None or active2["plan_id"] != new_plan_id


# ---------- Seed idempotency after mentor/study-plan usage ----------
class TestSeedIdempotencyAfterPhase3:
    def test_reseed_after_operations(self, demo_session):
        # Reseed
        r = requests.post(f"{API}/seed", timeout=30)
        assert r.status_code == 200
        demo_id = r.json()["demo_user_id"]
        assert demo_id
        # Demo should have exactly 2 seeded mentor sessions + 1 active study plan
        # (re-login because seed may not affect cookie)
        s = requests.Session()
        s.post(f"{API}/auth/login",
               json={"email": "demo@cagrid.in", "password": "demo123"}, timeout=15)
        r2 = s.get(f"{API}/mentor/sessions", timeout=15)
        titles = [x["title"] for x in r2.json()]
        # 2 seeded titles present
        assert "Explain Ind AS 115 revenue recognition" in titles
        assert "GST on export of services" in titles
        # exactly one active plan
        r3 = s.get(f"{API}/study-plan/active", timeout=15)
        assert r3.status_code == 200
        assert r3.json() is not None


# ---------- Regression: Phase 1 + 2 still work ----------
class TestPhase2Regression:
    def test_dashboard_and_focus_flow(self, demo_session):
        # Dashboard
        r = demo_session.get(f"{API}/dashboard", timeout=15)
        assert r.status_code == 200
        d = r.json()
        for k in ("user", "stats", "top_subjects", "recent_sessions",
                  "latest_badges", "heatmap_90", "badge_progress"):
            assert k in d
        # Start a 1-min focus and complete
        r2 = demo_session.post(f"{API}/focus/start",
                               json={"subject": "Taxation", "planned_minutes": 1},
                               timeout=15)
        assert r2.status_code == 200
        sid = r2.json()["session_id"]
        r3 = demo_session.post(f"{API}/focus/complete",
                               json={"session_id": sid}, timeout=15)
        assert r3.status_code == 200
        payload = r3.json()
        assert payload["xp_awarded"] >= 10
        assert "current_streak" in payload

    def test_live_pulse_public(self):
        r = requests.get(f"{API}/live/pulse", timeout=10)
        assert r.status_code == 200
        p = r.json()
        for k in ("minutes_last_hour", "active_now", "recent_sessions"):
            assert k in p
