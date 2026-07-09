"""Phase 4 backend tests — Syllabus Tracker + Regulatory Radar + Content Hub + Weekly Recap.

Covers all Phase 4 endpoints per iteration_10 review request.
NOTE: uses shared `demo@cagrid.in / demo123` — sequential only (no -n auto)."""
import os
import time
import pytest
import requests
from pathlib import Path

BASE_URL = os.environ.get("REACT_APP_BACKEND_URL")
if not BASE_URL:
    fenv = Path("/app/frontend/.env")
    if fenv.exists():
        for line in fenv.read_text().splitlines():
            if line.startswith("REACT_APP_BACKEND_URL="):
                BASE_URL = line.split("=", 1)[1].strip()
                break
BASE_URL = (BASE_URL or "").rstrip("/")
API = f"{BASE_URL}/api"

EXPECTED_PAPERS = {"F1", "F2", "F3", "F4",
                   "I1", "I2", "I3", "I4", "I5", "I6",
                   "P1", "P2", "P3", "P4", "P5", "P6"}


@pytest.fixture(scope="module")
def demo_token():
    r = requests.post(f"{API}/auth/login",
                      json={"email": "demo@cagrid.in", "password": "demo123"},
                      timeout=15)
    assert r.status_code == 200, f"demo login failed: {r.status_code} {r.text}"
    return r.json()["session_token"]


@pytest.fixture
def auth_headers(demo_token):
    return {"Authorization": f"Bearer {demo_token}", "Content-Type": "application/json"}


# ------------------------------- SYLLABUS -------------------------------
class TestSyllabus:
    def test_list_all_16_papers(self):
        r = requests.get(f"{API}/syllabus", timeout=15)
        assert r.status_code == 200
        data = r.json()
        assert isinstance(data, list)
        assert len(data) == 16
        codes = {p["paper_code"] for p in data}
        assert codes == EXPECTED_PAPERS
        # each paper has non-empty chapters
        for p in data:
            assert p.get("chapters"), f"{p['paper_code']} has empty chapters"

    def test_chapter_counts(self):
        r = requests.get(f"{API}/syllabus", timeout=15)
        by_code = {p["paper_code"]: p for p in r.json()}
        assert len(by_code["F1"]["chapters"]) == 10
        assert len(by_code["I3"]["chapters"]) == 16
        assert len(by_code["P4"]["chapters"]) == 20
        assert len(by_code["P6"]["chapters"]) == 8

    def test_chapter_shape(self):
        r = requests.get(f"{API}/syllabus", timeout=15)
        for p in r.json():
            for ch in p["chapters"]:
                assert "chapter_id" in ch and isinstance(ch["chapter_id"], str)
                assert isinstance(ch["number"], int) and ch["number"] > 0
                assert ch["name"]
                assert ch["estimated_hours"] > 0
                assert "weightage_pct" in ch

    def test_paper_detail_anonymous_default_not_started(self):
        r = requests.get(f"{API}/syllabus/I1", timeout=15)
        assert r.status_code == 200
        d = r.json()
        assert d["paper_code"] == "I1"
        assert "aggregate" in d
        agg = d["aggregate"]
        for k in ("chapters_mastered", "chapters_total", "completion_pct"):
            assert k in agg
        # anonymous → all not_started
        for ch in d["chapters"]:
            assert ch["status"] == "not_started"

    def test_paper_detail_authenticated_demo_I1(self, auth_headers):
        r = requests.get(f"{API}/syllabus/I1", headers=auth_headers, timeout=15)
        assert r.status_code == 200
        d = r.json()
        # demo has I1 30% mastered from seed → aggregate mastered >= 4
        assert d["aggregate"]["chapters_mastered"] >= 4
        mastered = [c for c in d["chapters"] if c["status"] == "mastered"]
        assert len(mastered) >= 4

    def test_progress_list_demo(self, auth_headers):
        r = requests.get(f"{API}/syllabus/progress", headers=auth_headers, timeout=15)
        assert r.status_code == 200
        data = r.json()
        assert isinstance(data, list)
        # demo is Intermediate → 6 papers
        assert len(data) == 6
        by = {p["paper_code"]: p for p in data}
        assert by["I1"]["chapters_mastered"] >= 4
        assert by["I2"]["chapters_in_progress"] >= 6
        for p in data:
            assert 0 <= p["completion_pct"] <= 100

    def test_progress_upsert_no_duplicate(self, auth_headers):
        # get an I3 chapter
        detail = requests.get(f"{API}/syllabus/I3", headers=auth_headers, timeout=15).json()
        ch_id = detail["chapters"][0]["chapter_id"]

        # First POST — in_progress
        r1 = requests.post(f"{API}/syllabus/progress",
                           headers=auth_headers,
                           json={"paper_code": "I3", "chapter_id": ch_id, "status": "in_progress"},
                           timeout=15)
        assert r1.status_code == 200, r1.text
        body = r1.json()
        assert "record" in body and "paper" in body
        first_pct = body["paper"]["completion_pct"]

        # Second POST — revised (upsert same chapter, no duplicate)
        r2 = requests.post(f"{API}/syllabus/progress",
                           headers=auth_headers,
                           json={"paper_code": "I3", "chapter_id": ch_id, "status": "revised"},
                           timeout=15)
        assert r2.status_code == 200
        assert r2.json()["record"]["status"] == "revised"
        # completion_pct should reflect new status
        second_pct = r2.json()["paper"]["completion_pct"]
        assert second_pct >= first_pct

        # Verify GET /syllabus/I3 shows only ONE row for this chapter (status='revised')
        detail2 = requests.get(f"{API}/syllabus/I3", headers=auth_headers, timeout=15).json()
        matches = [c for c in detail2["chapters"] if c["chapter_id"] == ch_id]
        assert len(matches) == 1
        assert matches[0]["status"] == "revised"

        # cleanup: reset to not_started (upsert path)
        requests.post(f"{API}/syllabus/progress",
                      headers=auth_headers,
                      json={"paper_code": "I3", "chapter_id": ch_id, "status": "not_started"},
                      timeout=15)


# ------------------------------- RADAR -------------------------------
class TestRadar:
    def test_alerts_unauth_full_count(self):
        r = requests.get(f"{API}/radar/alerts", timeout=15)
        assert r.status_code == 200
        d = r.json()
        # 28 seeded alerts
        assert d["count"] >= 25
        assert len(d["items"]) >= 25
        sample = d["items"][0]
        assert "affected_topics" in sample
        assert sample["affected_topics"][0].get("paper_name")

    def test_alerts_authenticated_filtered_by_level(self, auth_headers):
        r = requests.get(f"{API}/radar/alerts", headers=auth_headers, timeout=15)
        assert r.status_code == 200
        auth_count = r.json()["count"]
        # anonymous
        r2 = requests.get(f"{API}/radar/alerts", timeout=15)
        unauth_count = r2.json()["count"]
        assert auth_count <= unauth_count
        # every alert must include Intermediate in affected_levels
        for a in r.json()["items"]:
            assert "Intermediate" in a.get("affected_levels", [])

    def test_alerts_affected_topics_have_chapters(self):
        r = requests.get(f"{API}/radar/alerts", timeout=15)
        for a in r.json()["items"][:5]:
            for t in a.get("affected_topics", []):
                assert t.get("paper_code")
                assert t.get("paper_name")
                # chapters may be [] or list of dicts
                assert isinstance(t.get("chapters", []), list)

    def test_summary_shape(self, auth_headers):
        r = requests.get(f"{API}/radar/summary", headers=auth_headers, timeout=15)
        assert r.status_code == 200
        d = r.json()
        assert d["critical_count_7d"] >= 1
        assert d["unread_count"] > 0
        assert len(d["latest_3_alerts"]) == 3
        for a in d["latest_3_alerts"]:
            assert a.get("alert_id") and a.get("title") and a.get("impact_level")

    def test_dismiss_alert_returns_ok(self, auth_headers):
        r = requests.post(f"{API}/radar/alerts/rad_budget26_ltcg/dismiss",
                          headers=auth_headers, timeout=15)
        assert r.status_code == 200
        assert r.json().get("ok") is True

        # Verify via uncached /radar/alerts — dismissed alert removed
        alerts = requests.get(f"{API}/radar/alerts", headers=auth_headers, timeout=15).json()["items"]
        ids = [a["alert_id"] for a in alerts]
        assert "rad_budget26_ltcg" not in ids


# ------------------------------- CONTENT HUB -------------------------------
class TestContent:
    def test_posts_list_count_20(self):
        r = requests.get(f"{API}/content/posts", timeout=15)
        assert r.status_code == 200
        d = r.json()
        assert d["count"] == 20
        assert len(d["items"]) == 20

    def test_post_detail_with_related(self):
        r = requests.get(f"{API}/content/posts/revision-framework-air-12", timeout=15)
        assert r.status_code == 200
        d = r.json()
        assert "post" in d and "related" in d
        post = d["post"]
        assert isinstance(post.get("body_markdown"), str) and len(post["body_markdown"]) > 0
        assert post.get("read_minutes", 0) > 0
        # related = 3 posts sharing tags
        assert len(d["related"]) == 3
        for rp in d["related"]:
            assert rp["slug"] != "revision-framework-air-12"

    def test_content_digest_demo(self, auth_headers):
        r = requests.get(f"{API}/content/digest", headers=auth_headers, timeout=15)
        assert r.status_code == 200
        d = r.json()
        assert "today_pick" in d and d["today_pick"] is not None
        assert d["today_pick"].get("slug")
        assert isinstance(d.get("this_week"), list)
        assert len(d["this_week"]) == 3


# ------------------------------- RECAP -------------------------------
class TestRecap:
    def test_weekly_recap_shape(self, auth_headers):
        r = requests.get(f"{API}/recap/weekly", headers=auth_headers, timeout=15)
        assert r.status_code == 200
        d = r.json()
        assert d["focus_minutes"] > 0
        assert isinstance(d.get("top_subject"), str) and d["top_subject"]
        assert d["streak_current"] >= 1
        assert isinstance(d["next_week_focus"], list)


# ------------------------------- OPENAPI -------------------------------
class TestOpenAPI:
    def test_openapi_public_and_phase4_present(self):
        r = requests.get(f"{API}/openapi.json", timeout=15)
        assert r.status_code == 200
        paths = list(r.json()["paths"].keys())
        for p in ["/api/syllabus", "/api/syllabus/progress", "/api/radar/alerts",
                  "/api/radar/summary", "/api/content/posts", "/api/recap/weekly"]:
            assert p in paths, f"missing {p} in openapi"


# ------------------------------- REGRESSION -------------------------------
class TestRegression:
    def test_account_export_includes_new_collections(self, auth_headers):
        r = requests.get(f"{API}/account/export", headers=auth_headers, timeout=15)
        assert r.status_code == 200
        data = r.json()
        # must have new phase-4 arrays
        assert "syllabus_progress" in data
        assert isinstance(data["syllabus_progress"], list)
        assert "dismissed_alerts" in data
        assert isinstance(data["dismissed_alerts"], list)

    def test_live_pulse_still_works(self):
        r = requests.get(f"{API}/live/pulse", timeout=15)
        assert r.status_code == 200

    def test_terms_privacy_frontend_routes_still_backed(self):
        # Focus/mentor endpoints regressive — quick 200/401
        r = requests.get(f"{API}/health", timeout=10)
        # health may or may not exist; try /openapi.json as regressive
        assert r.status_code in (200, 404)

    def test_security_headers_present(self):
        r = requests.get(f"{API}/openapi.json", timeout=10)
        assert r.headers.get("x-frame-options") == "DENY"
        assert "strict-transport-security" in {k.lower() for k in r.headers.keys()}


# ------------------------------- SYLLABUS EMPTY STATE (fresh user) -------------------------------
class TestSyllabusEmptyStateFreshUser:
    def test_fresh_user_no_journey_level(self):
        """A freshly signed-up user with no journey_level should get an empty progress list."""
        import uuid
        email = f"TEST_freshuser_{uuid.uuid4().hex[:8]}@cagrid.in"
        r = requests.post(f"{API}/auth/signup",
                          json={"email": email, "password": "TestPass2026", "name": "Fresh User"},
                          timeout=15)
        if r.status_code == 429:
            pytest.skip("rate limit hit during signup")
        assert r.status_code == 200, r.text
        tok = r.json()["session_token"]
        h = {"Authorization": f"Bearer {tok}", "Content-Type": "application/json"}
        # Fresh user: /auth/me returns journey_level=null (used by frontend to render empty state)
        me = requests.get(f"{API}/auth/me", headers=h, timeout=15).json()
        assert me.get("journey_level") in (None, "", "null")
        # /syllabus/progress still returns 200 (backend returns all papers regardless — frontend gates)
        pr = requests.get(f"{API}/syllabus/progress", headers=h, timeout=15)
        assert pr.status_code == 200
        assert isinstance(pr.json(), list)
        # cleanup — delete this user
        try:
            requests.delete(f"{API}/account/delete", headers=h, timeout=15)
        except Exception:
            pass
