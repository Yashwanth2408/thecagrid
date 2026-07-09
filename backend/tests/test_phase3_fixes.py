"""Phase 3 targeted fix verification pass.

Verifies 4 fixes:
- FIX 1 (P0): POST /api/study-plan/generate is SSE with start/progress×N/done events
- FIX 1b: GET /api/study-plan/active returns the freshly generated plan
- FIX 2 (P1): live citation parser hardened — no stray 'Section:'/'Note:' in `act`
- FIX 3 (P1): GET /api/mentor/sessions/{id} returns flat title, message_count at top level
- FIX 4 (P2): GET /api/dashboard returns both stats.total_xp and stats.xp_total
"""
import os
import json as _json
import time
from datetime import datetime, timedelta

import pytest
import requests

BASE_URL = os.environ.get("REACT_APP_BACKEND_URL", "").rstrip("/")
if not BASE_URL:
    from pathlib import Path
    for line in Path("/app/frontend/.env").read_text().splitlines():
        if line.startswith("REACT_APP_BACKEND_URL="):
            BASE_URL = line.split("=", 1)[1].strip().rstrip("/")
            break
API = f"{BASE_URL}/api"


@pytest.fixture(scope="module")
def demo_session():
    s = requests.Session()
    r = s.post(f"{API}/auth/login",
               json={"email": "demo@cagrid.in", "password": "demo123"}, timeout=15)
    assert r.status_code == 200, f"login failed: {r.text}"
    return s


@pytest.fixture(scope="module")
def demo_token():
    r = requests.post(f"{API}/auth/login",
                      json={"email": "demo@cagrid.in", "password": "demo123"}, timeout=15)
    assert r.status_code == 200
    return r.json()["session_token"]


def _consume_sse(url, headers, payload, timeout=150):
    """Consume SSE stream, return (events, content_type, x_accel_buffering)."""
    events = []
    with requests.post(url, headers=headers, json=payload, stream=True, timeout=timeout) as resp:
        ct = resp.headers.get("content-type", "")
        xac = resp.headers.get("x-accel-buffering", "")
        assert resp.status_code == 200, f"stream failed {resp.status_code}: {resp.text[:400]}"
        buf = ""
        for chunk in resp.iter_content(chunk_size=None, decode_unicode=True):
            if not chunk:
                continue
            buf += chunk
            while "\n\n" in buf:
                raw, buf = buf.split("\n\n", 1)
                for line in raw.splitlines():
                    if line.startswith("data:"):
                        s = line[5:].strip()
                        if not s:
                            continue
                        try:
                            events.append(_json.loads(s))
                        except Exception:
                            pass
            if any(e.get("type") in ("done", "error") for e in events):
                break
    return events, ct, xac


# ---------- FIX 1 (P0): study-plan/generate is SSE ----------
# Note: k8s ingress kills SSE streams at ~60s. Study plan generation takes 60-90s.
# We verify functional correctness via localhost:8001 (bypassing ingress).
LOCAL_API = "http://localhost:8001/api"


class TestFix1StudyPlanSSE:
    def test_generate_streams_start_progress_done(self, demo_token):
        exam_date = (datetime.now().date() + timedelta(days=90)).strftime("%Y-%m-%d")
        headers = {"Authorization": f"Bearer {demo_token}", "Content-Type": "application/json"}
        payload = {"exam_date": exam_date, "daily_hours": 4,
                   "weak_areas": ["Taxation", "Auditing"]}
        t0 = time.time()
        # Use localhost — k8s ingress terminates SSE streams at ~60s (infrastructure limit)
        events, ct, xac = _consume_sse(f"{LOCAL_API}/study-plan/generate", headers, payload, timeout=150)
        elapsed = time.time() - t0
        # FIX 1 checks
        assert "text/event-stream" in ct, f"expected event-stream, got {ct!r}"
        assert xac.lower() == "no", f"expected X-Accel-Buffering: no, got {xac!r}"
        types = [e.get("type") for e in events]
        # (a) start emitted
        assert types[0] == "start", f"first event must be 'start', got {types[:3]}"
        # (b) at least 2 progress events
        progress = [e for e in events if e.get("type") == "progress"]
        assert len(progress) >= 2, f"expected >=2 progress events, got {len(progress)}. types={types}"
        for p in progress:
            assert isinstance(p.get("message"), str) and p["message"], f"bad progress: {p}"
        # (c) exactly one done with plan_json.weeks
        done = [e for e in events if e.get("type") == "done"]
        errs = [e for e in events if e.get("type") == "error"]
        assert not errs, f"unexpected error events: {errs}"
        assert len(done) == 1, f"expected 1 done, got {len(done)}"
        plan = done[0].get("plan") or {}
        assert plan.get("plan_id", "").startswith("plan_"), f"missing plan_id: {plan.get('plan_id')}"
        weeks = (plan.get("plan_json") or {}).get("weeks") or []
        assert isinstance(weeks, list) and len(weeks) >= 1, \
            f"plan_json.weeks empty/invalid: {weeks!r}"
        print(f"[fix1] study-plan SSE ok: {len(events)} events, {len(progress)} progress, elapsed={elapsed:.1f}s, weeks={len(weeks)}")
        # Stash for fix1b
        TestFix1StudyPlanSSE.last_plan = plan

    def test_1b_active_returns_freshly_generated(self, demo_session):
        # Runs after generate above — active should match
        r = demo_session.get(f"{API}/study-plan/active", timeout=20)
        assert r.status_code == 200
        active = r.json()
        assert active is not None, "active plan should exist"
        assert active.get("plan_id"), "active plan missing plan_id"
        assert active["daily_hours"] == 4
        assert set(active["weak_areas"]) == {"Taxation", "Auditing"}
        weeks = (active.get("plan_json") or {}).get("weeks") or []
        assert weeks, "active plan.plan_json.weeks should be non-empty"
        # exam_date ~90 days out
        exam_dt = datetime.strptime(active["exam_date"], "%Y-%m-%d").date()
        days = (exam_dt - datetime.now().date()).days
        assert 88 <= days <= 91, f"exam_date should be ~90 days, got {days}"


# ---------- FIX 2 (P1): citation parser hardened ----------
class TestFix2CitationsHardened:
    def test_live_chat_citations_have_clean_fields(self, demo_session, demo_token):
        # Create a fresh session for this test
        r = demo_session.post(f"{API}/mentor/sessions",
                              json={"mode": "exam", "initial_message": "TEST_cite_check"},
                              timeout=15)
        assert r.status_code == 200
        sid = r.json()["session_id"]

        headers = {"Authorization": f"Bearer {demo_token}", "Content-Type": "application/json"}
        prompt = ("Explain Section 44AD of Income Tax Act with proper citations. "
                  "Include SOURCES block with Act/Standard and Section/Para labels.")
        events, ct, _ = _consume_sse(
            f"{API}/mentor/chat", headers, {"session_id": sid, "message": prompt}, timeout=90,
        )
        assert "text/event-stream" in ct
        types = [e.get("type") for e in events]
        assert "done" in types, f"stream not done: {types}"

        # Fetch session to inspect persisted assistant message + citations
        r2 = demo_session.get(f"{API}/mentor/sessions/{sid}", timeout=15)
        assert r2.status_code == 200
        data = r2.json()
        msgs = data["messages"]
        assistants = [m for m in msgs if m["role"] == "assistant"]
        assert assistants, "no assistant message persisted"
        cits = assistants[-1].get("citations") or []
        assert cits, f"assistant has no citations. content preview: {assistants[-1].get('content','')[:400]}"
        c0 = cits[0]
        # FIX 2 assertions: act must not contain leaking labels
        assert c0.get("act"), f"citation[0].act empty: {c0}"
        act = c0["act"]
        assert "Section:" not in act, f"'Section:' leaked into act: {act!r}"
        assert "Note:" not in act, f"'Note:' leaked into act: {act!r}"
        assert "Section/Para:" not in act, f"'Section/Para:' leaked into act: {act!r}"
        # section must be populated (non-null)
        assert c0.get("section"), f"citation[0].section is null/empty: {c0}"
        print(f"[fix2] first citation clean: {c0}")

    def test_compact_form_parses_three_fields(self):
        """Unit-test the parser directly with compact form."""
        import sys
        sys.path.insert(0, "/app/backend")
        from server import parse_citations
        # compact form: - Act — §Section [Note]
        txt = "SOURCES:\n- Income Tax Act, 1961 — §44AD [DEEMED PROFITS]"
        out = parse_citations(txt)
        assert out, "compact parse returned empty"
        c = out[0]
        assert c["act"] == "Income Tax Act, 1961", f"act={c['act']!r}"
        assert c["section"] == "44AD", f"section={c['section']!r}"
        assert c["note"] == "DEEMED PROFITS", f"note={c['note']!r}"

    def test_labeled_form_parses_three_fields(self):
        import sys
        sys.path.insert(0, "/app/backend")
        from server import parse_citations
        txt = ("SOURCES:\n- Act/Standard: Income Tax Act, 1961; "
               "Section/Para: 44AD; Note: presumptive taxation for small businesses")
        out = parse_citations(txt)
        assert out
        c = out[0]
        assert c["act"] == "Income Tax Act, 1961", f"act={c['act']!r}"
        assert c["section"] == "44AD", f"section={c['section']!r}"
        assert "Section:" not in (c["act"] or "")
        assert "Note:" not in (c["act"] or "")


# ---------- FIX 3 (P1): mentor session flat shape ----------
class TestFix3SessionFlatShape:
    def test_get_session_has_top_level_title_and_message_count(self, demo_session):
        r = demo_session.get(f"{API}/mentor/sessions", timeout=15)
        sessions = r.json()
        target = next(s for s in sessions if s["title"] == "Explain Ind AS 115 revenue recognition")
        r2 = demo_session.get(f"{API}/mentor/sessions/{target['session_id']}", timeout=15)
        assert r2.status_code == 200
        d = r2.json()
        # Top-level fields
        for k in ("session_id", "title", "mode", "message_count", "created_at", "updated_at",
                  "session", "messages"):
            assert k in d, f"top-level missing {k}. keys={list(d.keys())}"
        assert d["title"] is not None and d["title"] != ""
        assert isinstance(d["message_count"], int) and d["message_count"] > 0
        assert d["title"] == "Explain Ind AS 115 revenue recognition"
        # Backward compat: session sub-object preserved
        assert d["session"] is not None
        assert d["session"]["session_id"] == target["session_id"]
        # messages array preserved
        assert isinstance(d["messages"], list) and len(d["messages"]) == 4


# ---------- FIX 4 (P2): dashboard stats.xp_total alias ----------
class TestFix4DashboardXpAlias:
    def test_dashboard_has_both_xp_fields(self, demo_session):
        r = demo_session.get(f"{API}/dashboard", timeout=15)
        assert r.status_code == 200
        d = r.json()
        stats = d.get("stats") or {}
        assert "total_xp" in stats, f"stats.total_xp missing. stats keys={list(stats.keys())}"
        assert "xp_total" in stats, f"stats.xp_total missing. stats keys={list(stats.keys())}"
        assert isinstance(stats["total_xp"], int), f"total_xp not int: {type(stats['total_xp'])}"
        assert isinstance(stats["xp_total"], int)
        assert stats["total_xp"] == stats["xp_total"], \
            f"total_xp={stats['total_xp']} != xp_total={stats['xp_total']}"
        assert stats["total_xp"] is not None
        # Cross-check against /api/stats/me
        r2 = demo_session.get(f"{API}/stats/me", timeout=15)
        assert r2.status_code == 200
        me = r2.json()
        assert me["total_xp"] == stats["total_xp"], \
            f"/stats/me.total_xp={me['total_xp']} != /dashboard.stats.total_xp={stats['total_xp']}"


# ---------- Backend log — citation self-test emits no NEW warnings after current startup ----------
class TestNoCitationSelftestWarnings:
    def test_current_startup_no_warnings(self):
        """After the latest 'Application startup complete', no citation self-test warnings should follow."""
        from pathlib import Path
        log = Path("/var/log/supervisor/backend.err.log").read_text().splitlines()
        # find last startup index
        last_start = -1
        for i, ln in enumerate(log):
            if "Application startup complete." in ln:
                last_start = i
        assert last_start >= 0, "no application startup found in log"
        tail = log[last_start:]
        warnings = [ln for ln in tail if "citation self-test" in ln]
        assert not warnings, f"self-test warnings after last startup: {warnings[:3]}"
