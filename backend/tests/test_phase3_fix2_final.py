"""Iteration 8 — FIX 2 FINAL retest.

Scope (per review_request):
  - FIX 2 FINAL live end-to-end (2 mentor chats max to save Claude credits)
  - REGRESSION FIX 1 smoke — /api/study-plan/generate returns {job_id} immediately;
    poll /status/{job_id} a couple of times to confirm contract; NO full 90s wait.
  - SELF-TEST log check — no 'citation self-test mismatch' after latest startup.
"""
import os
import json as _json
import time
from datetime import datetime, timedelta
from pathlib import Path

import pytest
import requests

BASE_URL = os.environ.get("REACT_APP_BACKEND_URL", "").rstrip("/")
if not BASE_URL:
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
    events = []
    with requests.post(url, headers=headers, json=payload, stream=True, timeout=timeout) as resp:
        ct = resp.headers.get("content-type", "")
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
    return events, ct


def _assert_citations_clean(cits, content_tail):
    """Assertions per review_request:
       (a) at least one citation
       (b) citations[0].act does NOT contain 'Act/Standard:' / 'Section:' / 'Note:' substrings
           and is not the standalone 'Act/Standard:' string
       (c) citations[0].section populated when the response includes any section reference
       (d) no ghost half-citations like {act:'Section/Para:'}"""
    assert cits, f"no citations. tail: {content_tail!r}"
    c0 = cits[0]
    act = (c0.get("act") or "").strip()
    # (b) label substring leak check
    for bad in ("Act/Standard:", "Section:", "Section/Para:", "Note:"):
        assert bad not in act, f"c0.act contains leaked label {bad!r}: act={act!r}"
    # standalone label check
    assert act.rstrip(":").lower() not in (
        "act/standard", "section", "section/para", "note", "act", "standard", "circular"
    ), f"c0.act is a standalone label: {act!r}"

    # (d) ghost half-citation scan across ALL citations
    ghost_labels = {
        "act/standard:", "section:", "section/para:", "note:", "para:",
        "act/standard", "section", "section/para", "note",
    }
    for i, c in enumerate(cits):
        a = ((c.get("act") or "").strip()).lower()
        if a in ghost_labels:
            pytest.fail(f"ghost half-citation at index {i}: {c}")

    # (c) if response text references a Section, c0.section should be populated
    tail_lower = content_tail.lower()
    if "section" in tail_lower or "§" in content_tail or "para" in tail_lower:
        assert c0.get("section"), \
            f"content mentions section but c0.section is empty. c0={c0}, tail={content_tail!r}"


# ---------- FIX 2 FINAL live tests (2 chats max) ----------
class TestFix2Final:
    def test_live_multiline_labeled_section_44AD(self, demo_session, demo_token):
        """Chat #1 — the exact prompt style from the review_request."""
        r = demo_session.post(f"{API}/mentor/sessions",
                              json={"mode": "exam", "initial_message": "TEST_final_44AD"},
                              timeout=15)
        assert r.status_code == 200
        sid = r.json()["session_id"]
        headers = {"Authorization": f"Bearer {demo_token}", "Content-Type": "application/json"}
        prompt = (
            "Explain Section 44AD of Income Tax Act. End with a SOURCES block using "
            "Act/Standard, Section/Para, and Note labels — one per entry."
        )
        events, ct = _consume_sse(
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
        content = assistants[-1].get("content", "")
        cits = assistants[-1].get("citations") or []
        content_tail = content[-1000:]
        # Print for RCA/logging
        print(f"[fix2-final] session={sid} cits={cits}")
        print(f"[fix2-final] content_tail={content_tail!r}")
        _assert_citations_clean(cits, content_tail)

    def test_live_multiline_labeled_ind_as_115(self, demo_session, demo_token):
        """Chat #2 — variation on standards (Ind AS instead of Act) to probe different Claude formatting quirks."""
        r = demo_session.post(f"{API}/mentor/sessions",
                              json={"mode": "exam", "initial_message": "TEST_final_indas"},
                              timeout=15)
        assert r.status_code == 200
        sid = r.json()["session_id"]
        headers = {"Authorization": f"Bearer {demo_token}", "Content-Type": "application/json"}
        prompt = (
            "Briefly explain Ind AS 115 revenue recognition. End your answer with a SOURCES block "
            "listing the Act/Standard, Section/Para, and Note labels — one per entry."
        )
        events, ct = _consume_sse(
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
        content = assistants[-1].get("content", "")
        cits = assistants[-1].get("citations") or []
        content_tail = content[-1000:]
        print(f"[fix2-final-indas] session={sid} cits={cits}")
        print(f"[fix2-final-indas] content_tail={content_tail!r}")
        _assert_citations_clean(cits, content_tail)


# ---------- FIX 1 smoke — /generate contract only ----------
class TestFix1SmokeGenerate:
    def test_generate_returns_job_id_immediately(self, demo_session):
        exam_date = (datetime.now().date() + timedelta(days=90)).strftime("%Y-%m-%d")
        payload = {"exam_date": exam_date, "daily_hours": 4,
                   "weak_areas": ["Taxation"]}
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

        # Poll a few times just to confirm status endpoint contract (no full wait)
        for _ in range(3):
            time.sleep(1.5)
            sr = demo_session.get(f"{API}/study-plan/status/{job_id}", timeout=15)
            assert sr.status_code == 200, f"status returned {sr.status_code}: {sr.text[:200]}"
            s = sr.json()
            assert "status" in s
            assert s["status"] in ("pending", "running", "done", "error"), f"bad status: {s['status']}"
            if s["status"] == "error":
                pytest.fail(f"job errored early: {s.get('error')}")
        print(f"[fix1-smoke] job_id={job_id} contract OK, last status={s.get('status')}, progress={s.get('progress')}")


# ---------- SELF-TEST log ----------
class TestNoCitationSelftestWarnings:
    def test_after_last_startup_no_mismatch(self):
        log = Path("/var/log/supervisor/backend.err.log").read_text().splitlines()
        last_start = -1
        for i, ln in enumerate(log):
            if "Application startup complete." in ln:
                last_start = i
        assert last_start >= 0, "no 'Application startup complete.' found"
        tail = log[last_start:]
        warnings = [ln for ln in tail if "citation self-test" in ln]
        assert not warnings, f"self-test warnings after last startup: {warnings[:3]}"
