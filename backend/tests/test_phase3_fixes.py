"""Phase 3 SECOND FIX PASS verification.

Verifies:
- FIX 1  (P0 REDO): POST /api/study-plan/generate returns {job_id} immediately,
  polling GET /study-plan/status/{job_id} shows progress transitions and eventually done.
- FIX 1b (P0): status endpoint returns 404 for other users' jobs.
- FIX 1c (P0): after done, /study-plan/active returns the freshly generated plan and prior
  active plan is archived.
- FIX 2  (P1 REDO): parse_citations groups multi-line labeled SOURCES entries into one
  citation with clean act/section/note.
- FIX 2b: no NEW citation self-test warnings after latest backend startup.
- FIX 3  (regression): GET /api/mentor/sessions/{id} still has top-level title & message_count.
- FIX 4  (regression): GET /api/dashboard.stats has both total_xp and xp_total equal & non-null.
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


# ---------- FIX 1 (P0 REDO): async-job study-plan/generate ----------
class TestFix1StudyPlanAsyncJob:
    last_plan = None
    prior_active_plan_id = None

    def test_1a_generate_returns_immediately_with_job_id(self, demo_session):
        # capture prior active plan id (should be archived after this test)
        r_prev = demo_session.get(f"{API}/study-plan/active", timeout=15)
        assert r_prev.status_code == 200
        prev = r_prev.json()
        if prev:
            TestFix1StudyPlanAsyncJob.prior_active_plan_id = prev.get("plan_id")

        exam_date = (datetime.now().date() + timedelta(days=90)).strftime("%Y-%m-%d")
        payload = {"exam_date": exam_date, "daily_hours": 4,
                   "weak_areas": ["Taxation", "Auditing"]}
        t0 = time.time()
        r = demo_session.post(f"{API}/study-plan/generate", json=payload, timeout=15)
        elapsed = time.time() - t0
        assert r.status_code == 200, f"generate failed: {r.status_code} {r.text[:400]}"
        body = r.json()
        assert "job_id" in body, f"missing job_id: {body}"
        assert body.get("status") == "pending", f"expected pending, got: {body}"
        assert elapsed < 3.0, f"generate should return <3s, took {elapsed:.2f}s"
        job_id = body["job_id"]
        assert job_id.startswith("pjob_"), f"unexpected job_id shape: {job_id}"
        print(f"[fix1a] generate returned in {elapsed:.2f}s job_id={job_id}")

        # Poll every 2s up to 4 minutes
        deadline = time.time() + 240
        progress_snapshots = []
        final = None
        while time.time() < deadline:
            time.sleep(2)
            sr = demo_session.get(f"{API}/study-plan/status/{job_id}", timeout=15)
            assert sr.status_code == 200, f"status returned {sr.status_code}: {sr.text[:200]}"
            s = sr.json()
            progress_snapshots.append((s.get("status"), s.get("progress")))
            if s.get("status") == "done":
                final = s
                break
            if s.get("status") == "error":
                pytest.fail(f"job errored: {s.get('error')}")
        assert final is not None, f"job did not complete in 4min. snapshots={progress_snapshots[-5:]}"
        plan = final.get("plan") or {}
        assert plan.get("plan_id", "").startswith("plan_"), f"bad plan_id: {plan.get('plan_id')}"
        weeks = (plan.get("plan_json") or {}).get("weeks") or []
        assert isinstance(weeks, list) and len(weeks) >= 1, f"plan_json.weeks empty: {weeks!r}"

        # Progress transitions: expect at least one 'drafting' phase and at least one 'generating…' phase
        progress_msgs = [p[1] for p in progress_snapshots if p[1]]
        assert any("drafting" in (m or "").lower() or "queued" in (m or "").lower() for m in progress_msgs), \
            f"expected early drafting/queued message, got: {progress_msgs[:5]}"
        assert any("generating" in (m or "").lower() for m in progress_msgs), \
            f"expected 'generating…' message, got: {progress_msgs[:10]}"
        elapsed_total = time.time() - t0
        print(f"[fix1a] job done in {elapsed_total:.1f}s, snapshots={len(progress_snapshots)}, weeks={len(weeks)}")
        TestFix1StudyPlanAsyncJob.last_plan = plan
        TestFix1StudyPlanAsyncJob.last_job_id = job_id

    def test_1b_status_returns_401_without_auth(self, demo_token):
        job_id = getattr(TestFix1StudyPlanAsyncJob, "last_job_id", None)
        assert job_id, "prior test did not run — skipping"
        # No auth cookie/header — should be 401
        r = requests.get(f"{API}/study-plan/status/{job_id}", timeout=15)
        assert r.status_code == 401, f"expected 401 without auth, got {r.status_code}: {r.text[:200]}"

    def test_1b2_status_404_for_other_user_job(self, demo_session):
        """Poll another user's job id → must 404 (not leak)."""
        job_id = getattr(TestFix1StudyPlanAsyncJob, "last_job_id", None)
        assert job_id, "prior test did not run — skipping"
        # create a second user
        import uuid as _u
        email = f"TEST_other_{_u.uuid4().hex[:8]}@cagrid.in"
        rs = requests.post(f"{API}/auth/signup",
                           json={"email": email, "password": "otherpass123", "name": "Other User"},
                           timeout=15)
        assert rs.status_code == 200, f"signup failed: {rs.status_code} {rs.text[:200]}"
        other = requests.Session()
        rl = other.post(f"{API}/auth/login",
                        json={"email": email, "password": "otherpass123"}, timeout=15)
        assert rl.status_code == 200, f"other login failed: {rl.text[:200]}"
        r = other.get(f"{API}/study-plan/status/{job_id}", timeout=15)
        assert r.status_code == 404, f"expected 404, got {r.status_code}: {r.text[:200]}"

    def test_1c_active_matches_and_archives_prior(self, demo_session):
        # after job done, /study-plan/active must return the newly generated plan
        r = demo_session.get(f"{API}/study-plan/active", timeout=15)
        assert r.status_code == 200
        active = r.json()
        assert active is not None, "active plan should exist"
        last = TestFix1StudyPlanAsyncJob.last_plan
        assert active.get("plan_id") == last.get("plan_id"), \
            f"active.plan_id={active.get('plan_id')} != freshly generated {last.get('plan_id')}"
        assert active["daily_hours"] == 4
        assert set(active["weak_areas"]) == {"Taxation", "Auditing"}
        weeks = (active.get("plan_json") or {}).get("weeks") or []
        assert weeks, "active plan.plan_json.weeks should be non-empty"
        exam_dt = datetime.strptime(active["exam_date"], "%Y-%m-%d").date()
        days = (exam_dt - datetime.now().date()).days
        assert 88 <= days <= 91, f"exam_date should be ~90 days, got {days}"
        # prior active (if existed) should now be archived — verify only ONE active plan exists
        # (we can't hit db directly, but active is a single item; older plan_id shouldn't equal)
        prior = TestFix1StudyPlanAsyncJob.prior_active_plan_id
        if prior and prior != last.get("plan_id"):
            assert active.get("plan_id") != prior, "old plan is still active — not archived"
            print(f"[fix1c] prior plan {prior} archived; new active = {active.get('plan_id')}")


# ---------- FIX 2 (P1 REDO): citation parser groups multi-line labeled entries ----------
class TestFix2CitationsHardened:
    def test_multiline_labeled_grouped_into_one_citation(self):
        """Direct unit test — the real Claude output pattern:
        **Act/Standard:** Income Tax Act, 1961
        **Section/Para:** Section 44AD
        **Note:** presumptive taxation for eligible businesses
        must produce ONE citation with all three fields populated cleanly.
        """
        import sys
        sys.path.insert(0, "/app/backend")
        from server import parse_citations
        txt = (
            "SOURCES:\n"
            "**Act/Standard:** Income Tax Act, 1961\n"
            "**Section/Para:** Section 44AD\n"
            "**Note:** presumptive taxation for eligible businesses\n"
        )
        out = parse_citations(txt)
        assert out, "parser returned empty for multi-line labeled block"
        # Must be grouped into ONE citation, not three
        assert len(out) == 1, f"expected 1 grouped citation, got {len(out)}: {out}"
        c = out[0]
        assert c["act"] == "Income Tax Act, 1961", f"act={c['act']!r}"
        # section should contain 44AD (leading 'Section ' is fine, but no 'Section:' label)
        assert c["section"] and "44AD" in c["section"], f"section={c['section']!r}"
        assert "Section:" not in (c.get("act") or "")
        assert "Section/Para:" not in (c.get("act") or "")
        assert "Note:" not in (c.get("act") or "")
        assert c.get("note") and "presumptive" in c["note"].lower(), f"note={c.get('note')!r}"

    def test_multiline_dash_bullet_variant_grouped(self):
        """Variant: dash-prefixed labels on separate lines."""
        import sys
        sys.path.insert(0, "/app/backend")
        from server import parse_citations
        txt = (
            "SOURCES:\n"
            "- Act/Standard: Ind AS 115\n"
            "- Section/Para: Para 22-30\n"
            "- Note: revenue recognition five-step model\n"
        )
        out = parse_citations(txt)
        assert out, "empty out"
        assert len(out) == 1, f"expected 1 grouped citation, got {len(out)}: {out}"
        c = out[0]
        assert c["act"] == "Ind AS 115", f"act={c['act']!r}"
        assert c["section"] and "22" in c["section"], f"section={c['section']!r}"
        assert c.get("note") and "revenue" in c["note"].lower()

    def test_compact_form_still_parses(self):
        import sys
        sys.path.insert(0, "/app/backend")
        from server import parse_citations
        txt = "SOURCES:\n- Income Tax Act, 1961 — §44AD [DEEMED PROFITS]"
        out = parse_citations(txt)
        assert out, "compact parse returned empty"
        c = out[0]
        assert c["act"] == "Income Tax Act, 1961", f"act={c['act']!r}"
        assert c["section"] == "44AD", f"section={c['section']!r}"
        assert c["note"] == "DEEMED PROFITS", f"note={c['note']!r}"

    def test_single_line_labeled_still_parses(self):
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

    def test_live_chat_multiline_labeled_prompt(self, demo_session, demo_token):
        """Live end-to-end: ask Claude for multi-line labeled SOURCES, then verify persisted citations."""
        r = demo_session.post(f"{API}/mentor/sessions",
                              json={"mode": "exam", "initial_message": "TEST_multiline_cite"},
                              timeout=15)
        assert r.status_code == 200
        sid = r.json()["session_id"]
        headers = {"Authorization": f"Bearer {demo_token}", "Content-Type": "application/json"}
        prompt = (
            "Explain Section 44AD of Income Tax Act. Use a SOURCES block at the end "
            "with the Act/Standard, Section/Para, and Note labels on SEPARATE LINES "
            "(one label per line)."
        )
        events, ct, _ = _consume_sse(
            f"{API}/mentor/chat", headers, {"session_id": sid, "message": prompt}, timeout=120,
        )
        assert "text/event-stream" in ct
        types = [e.get("type") for e in events]
        assert "done" in types, f"stream not done: {types[-5:]}"

        r2 = demo_session.get(f"{API}/mentor/sessions/{sid}", timeout=15)
        assert r2.status_code == 200
        msgs = r2.json()["messages"]
        assistants = [m for m in msgs if m["role"] == "assistant"]
        assert assistants, "no assistant message"
        cits = assistants[-1].get("citations") or []
        content_preview = assistants[-1].get("content", "")[-800:]
        assert cits, f"no citations. content tail: {content_preview!r}"
        c0 = cits[0]
        act = (c0.get("act") or "")
        # Must NOT start with a leaking label
        assert not act.lower().startswith(("section:", "section/para:", "note:")), \
            f"leaking label in act: {act!r} — content: {content_preview!r}"
        assert c0.get("section"), \
            f"citation[0].section null — grouping failed. c0={c0}, all cits={cits}, content_tail={content_preview!r}"
        print(f"[fix2-live] multiline SOURCES grouped ok: {c0}")

    def test_live_chat_compact_form_prompt(self, demo_session, demo_token):
        """Live end-to-end: ask for compact `— §` form and verify parse still works."""
        r = demo_session.post(f"{API}/mentor/sessions",
                              json={"mode": "exam", "initial_message": "TEST_compact_cite"},
                              timeout=15)
        assert r.status_code == 200
        sid = r.json()["session_id"]
        headers = {"Authorization": f"Bearer {demo_token}", "Content-Type": "application/json"}
        prompt = (
            "In one paragraph, define presumptive taxation. End with a SOURCES block using "
            "the COMPACT form exactly like: `- Income Tax Act, 1961 — §44AD [presumptive taxation]` "
            "with an em-dash and the § symbol."
        )
        events, ct, _ = _consume_sse(
            f"{API}/mentor/chat", headers, {"session_id": sid, "message": prompt}, timeout=90,
        )
        assert "text/event-stream" in ct
        assert "done" in [e.get("type") for e in events]

        r2 = demo_session.get(f"{API}/mentor/sessions/{sid}", timeout=15)
        assert r2.status_code == 200
        msgs = r2.json()["messages"]
        assistants = [m for m in msgs if m["role"] == "assistant"]
        cits = assistants[-1].get("citations") or []
        content_preview = assistants[-1].get("content", "")[-500:]
        assert cits, f"no citations. content tail: {content_preview!r}"
        c0 = cits[0]
        act = c0.get("act") or ""
        assert not act.lower().startswith(("section:", "section/para:", "note:")), \
            f"leaking label in act: {act!r}"
        # For compact form we accept either section populated or note populated
        assert c0.get("section") or c0.get("note") or "Act" in act, \
            f"compact form parse yielded empty citation: {c0}"
        print(f"[fix2-live-compact] compact SOURCES parsed ok: {c0}")


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
