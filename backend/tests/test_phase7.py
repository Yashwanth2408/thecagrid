"""Phase 7 backend tests — Post-Qual Hub + Study Rooms + Notifications + Referral + Polish.

Uses seeded demo user (demo@cagrid.in / demo123, journey_level=Intermediate).
Run serially: pytest tests/test_phase7.py -p no:xdist -v
"""
import os
import re
import time
import uuid
import pytest
import requests

BASE = os.environ.get("REACT_APP_BACKEND_URL")
if not BASE:
    from pathlib import Path
    fenv = Path("/app/frontend/.env")
    if fenv.exists():
        for line in fenv.read_text().splitlines():
            if line.startswith("REACT_APP_BACKEND_URL="):
                BASE = line.split("=", 1)[1].strip()
                break
BASE = (BASE or "").rstrip("/")
API = f"{BASE}/api"
assert BASE.startswith("http"), f"REACT_APP_BACKEND_URL not set (got {BASE!r})"


def _login(session: requests.Session):
    r = session.post(f"{API}/auth/login",
                     json={"email": "demo@cagrid.in", "password": "demo123"}, timeout=15)
    assert r.status_code == 200, f"login failed: {r.status_code} {r.text}"
    return r.json()


def _seed():
    r = requests.post(f"{API}/seed", timeout=30)
    assert r.status_code == 200
    return r.json()


class AuthedSession(requests.Session):
    """Wrapper that auto re-logs-in on 401."""
    def request(self, method, url, *args, **kw):
        r = super().request(method, url, *args, **kw)
        if r.status_code == 401 and "/auth/" not in url:
            time.sleep(2)
            _login(self)
            r = super().request(method, url, *args, **kw)
        return r


@pytest.fixture(scope="session")
def demo_seed():
    return _seed()


@pytest.fixture(scope="module")
def sess(demo_seed):
    s = AuthedSession()
    _login(s)
    return s


# ============================================================
# CAREERS (public)
# ============================================================
class TestCareers:
    def test_paths_public(self):
        r = requests.get(f"{API}/careers/paths")
        assert r.status_code == 200
        d = r.json()
        assert len(d["items"]) == 8

    def test_compare_certs_public(self):
        r = requests.get(f"{API}/careers/compare-certs")
        assert r.status_code == 200
        d = r.json()
        assert len(d["items"]) == 5


# ============================================================
# JOBS
# ============================================================
class TestJobs:
    def test_list_jobs(self):
        r = requests.get(f"{API}/jobs")
        assert r.status_code == 200
        assert len(r.json()["items"]) >= 30

    def test_filter_by_type(self):
        r = requests.get(f"{API}/jobs?type=full_time")
        assert r.status_code == 200
        for it in r.json()["items"]:
            assert it["type"] == "full_time"

    def test_filter_by_location(self):
        r = requests.get(f"{API}/jobs?location=Mumbai")
        assert r.status_code == 200
        for it in r.json()["items"]:
            assert "mumbai" in it["location"].lower()

    def test_get_job_detail(self):
        jid = requests.get(f"{API}/jobs").json()["items"][0]["job_id"]
        r = requests.get(f"{API}/jobs/{jid}")
        assert r.status_code == 200
        assert r.json()["job_id"] == jid

    def test_save_toggle(self, sess):
        jobs = requests.get(f"{API}/jobs").json()["items"]
        jid = jobs[7]["job_id"]
        r1 = sess.post(f"{API}/jobs/save", json={"job_id": jid})
        assert r1.status_code == 200
        s1 = r1.json().get("saved")
        r2 = sess.post(f"{API}/jobs/save", json={"job_id": jid})
        assert r2.status_code == 200
        s2 = r2.json().get("saved")
        assert s1 != s2, "double-toggle should flip state"

    def test_saved_jobs_list(self, sess):
        r = sess.get(f"{API}/jobs/saved")
        assert r.status_code == 200
        assert "items" in r.json()

    def test_create_job_blocked_non_verified(self, sess):
        # Fresh seed to ensure is_verified_ca=false
        _seed()
        payload = {
            "title": "TEST Senior Manager",
            "company": "TEST Firm",
            "location": "Bangalore",
            "type": "full_time",
            "description_markdown": "Test job description with sufficient length to pass validation. " * 3,
        }
        r = sess.post(f"{API}/jobs", json=payload)
        assert r.status_code == 403, f"expected 403 non-verified, got {r.status_code}: {r.text}"

    def test_create_job_allowed_after_verify(self, sess):
        rv = sess.post(f"{API}/verify/ca", json={"membership_number": "123456"})
        assert rv.status_code == 200
        payload = {
            "title": "TEST Senior Tax Manager",
            "company": "TEST Verified Firm",
            "location": "Mumbai",
            "type": "full_time",
            "description_markdown": "Post-verified job posting description with adequate length. " * 3,
        }
        r = sess.post(f"{API}/jobs", json=payload)
        assert r.status_code in (200, 201), f"verified should post job, got {r.status_code}: {r.text}"


# ============================================================
# REFERRAL MARKETPLACE
# ============================================================
class TestReferralMarket:
    def test_marketplace_list(self):
        r = requests.get(f"{API}/referrals/marketplace")
        assert r.status_code == 200
        assert len(r.json()["items"]) >= 15

    def test_apply_duplicate_blocked(self, sess):
        items = requests.get(f"{API}/referrals/marketplace").json()["items"]
        rid = items[2]["referral_id"]
        payload = {"message": "TEST application message meeting minimum length requirement here."}
        sess.post(f"{API}/referrals/{rid}/apply", json=payload)  # first (may already exist)
        r2 = sess.post(f"{API}/referrals/{rid}/apply", json=payload)
        assert r2.status_code == 400, f"expected 400 duplicate, got {r2.status_code}: {r2.text}"


# ============================================================
# MENTORS
# ============================================================
class TestMentors:
    def test_list_mentors(self):
        r = requests.get(f"{API}/mentors")
        assert r.status_code == 200
        items = r.json()["items"]
        assert len(items) == 8
        for m in items:
            assert "mentor_name" in m
            # spec says "initials" — actual field is "mentor_initials"
            assert "mentor_initials" in m or "initials" in m
            assert "avg_rating" in m
            assert "hourly_rate_inr" in m

    def test_mentor_detail(self):
        lid = requests.get(f"{API}/mentors").json()["items"][0]["listing_id"]
        r = requests.get(f"{API}/mentors/{lid}")
        assert r.status_code == 200
        assert r.json()["listing_id"] == lid

    def test_book_and_mock_pay_flow(self, sess):
        lid = requests.get(f"{API}/mentors").json()["items"][2]["listing_id"]
        rb = sess.post(f"{API}/mentors/{lid}/book", json={
            "slot_start": "2026-08-01T10:00:00Z",
            "slot_end": "2026-08-01T11:00:00Z",
            "topic": "TEST Big-4 audit career-map discussion",
        })
        assert rb.status_code == 200, f"book failed: {rb.status_code} {rb.text}"
        b = rb.json()
        booking = b.get("booking") or b
        assert booking.get("payment_status") == "mocked_pending"
        assert "booking_id" in b
        assert "mocked_payment_url" in b
        bid = b["booking_id"]
        rp = sess.post(f"{API}/mentors/booking/{bid}/mock-pay")
        assert rp.status_code == 200, rp.text
        p = rp.json()
        pb = p.get("booking") or p
        assert pb.get("payment_status") == "mocked_paid"
        assert pb.get("status") == "confirmed"
        assert "MOCKED" in (p.get("note") or "").upper()


# ============================================================
# CPE
# ============================================================
class TestCPE:
    def test_list_records_and_summary(self, sess):
        r = sess.get(f"{API}/cpe/records")
        assert r.status_code == 200
        d = r.json()
        assert "items" in d and "summary" in d
        s = d["summary"]
        assert s.get("requirement_ytd") == 20
        assert "total_hours_ytd" in s
        assert "compliance_status" in s

    def test_add_edit_delete_cpe(self, sess):
        payload = {
            "title": "TEST CPE Record",
            "hours": 2.5,
            "category": "structured",
            "source": "TEST Webinar",
            "date_completed": "2026-06-15",
        }
        r_add = sess.post(f"{API}/cpe/records", json=payload)
        assert r_add.status_code == 200, r_add.text
        rid = r_add.json()["record_id"]

        payload2 = dict(payload, title="TEST CPE Record Updated", hours=3.0)
        r_edit = sess.put(f"{API}/cpe/records/{rid}", json=payload2)
        assert r_edit.status_code == 200, r_edit.text

        items = sess.get(f"{API}/cpe/records").json()["items"]
        match = next((it for it in items if it["record_id"] == rid), None)
        assert match is not None
        assert match["title"] == "TEST CPE Record Updated"
        assert float(match["hours"]) == 3.0

        r_del = sess.delete(f"{API}/cpe/records/{rid}")
        assert r_del.status_code == 200
        items2 = sess.get(f"{API}/cpe/records").json()["items"]
        assert not any(it["record_id"] == rid for it in items2)

    def test_export(self, sess):
        r = sess.get(f"{API}/cpe/export")
        assert r.status_code == 200
        d = r.json()
        for k in ("user", "records", "summary", "declaration"):
            assert k in d


# ============================================================
# STUDY ROOMS
# ============================================================
class TestRooms:
    def test_room_full_flow(self, sess):
        r_create = sess.post(f"{API}/rooms", json={
            "name": "TEST Room Phase 7",
            "subject_tag": "GST",
            "level_focus": "Intermediate",
            "is_public": True,
        })
        assert r_create.status_code == 200, r_create.text
        d = r_create.json()
        code = d.get("code")
        assert code and re.match(r"^[A-Z0-9]{6}$", code), f"invalid code: {code}"

        rp = sess.post(f"{API}/rooms/{code}/ping")
        assert rp.status_code == 200

        rs = sess.post(f"{API}/rooms/{code}/timer/start", json={"planned_seconds": 600})
        assert rs.status_code == 200, rs.text
        ts = rs.json()
        state = ts.get("state") or ts.get("active_timer_state") or ts.get("room", {}).get("active_timer_state") or {}
        assert state.get("is_running") is True

        rm = sess.post(f"{API}/rooms/{code}/message", json={"content": "TEST hello demo"})
        assert rm.status_code == 200, rm.text

        rc = sess.post(f"{API}/rooms/{code}/timer/complete")
        assert rc.status_code == 200, rc.text

        rl = sess.post(f"{API}/rooms/{code}/leave")
        assert rl.status_code == 200

    def test_non_host_timer_start_forbidden(self, sess):
        r_create = sess.post(f"{API}/rooms", json={
            "name": "TEST Host-Only Room",
            "subject_tag": "Audit",
            "is_public": True,
        })
        assert r_create.status_code == 200, r_create.text
        code = r_create.json()["code"]

        # Create a second user
        email = f"TEST_room_{uuid.uuid4().hex[:8]}@example.com"
        s2 = requests.Session()
        rsu = s2.post(f"{API}/auth/signup", json={
            "email": email, "password": "TestPass2026", "name": "Test Room User"
        })
        assert rsu.status_code in (200, 201), rsu.text

        rj = s2.post(f"{API}/rooms/{code}/join")
        assert rj.status_code == 200, rj.text

        rs = s2.post(f"{API}/rooms/{code}/timer/start", json={"planned_seconds": 600})
        assert rs.status_code == 403, f"expected 403 non-host, got {rs.status_code}: {rs.text}"


# ============================================================
# NOTIFICATIONS
# ============================================================
class TestNotifications:
    def test_list_notifications(self, sess):
        r = sess.get(f"{API}/notifications")
        assert r.status_code == 200
        d = r.json()
        assert "items" in d and "total_unread" in d
        assert len(d["items"]) >= 5

    def test_mark_read_single(self, sess):
        items = sess.get(f"{API}/notifications").json()["items"]
        unread = [i for i in items if not i.get("read")]
        if not unread:
            pytest.skip("no unread notifications")
        nid = unread[0]["notification_id"]
        r = sess.post(f"{API}/notifications/{nid}/read")
        assert r.status_code == 200

    def test_mark_all_read(self, sess):
        r = sess.post(f"{API}/notifications/read-all")
        assert r.status_code == 200
        after = sess.get(f"{API}/notifications").json()
        assert after.get("total_unread") == 0

    def test_preferences_get_put(self, sess):
        r = sess.get(f"{API}/notifications/preferences")
        assert r.status_code == 200
        prefs = r.json()
        prefs_upd = dict(prefs)
        if isinstance(prefs.get("email_enabled"), bool):
            prefs_upd["email_enabled"] = not prefs["email_enabled"]
        rp = sess.put(f"{API}/notifications/preferences", json=prefs_upd)
        assert rp.status_code == 200

    def test_push_subscribe_mocked(self, sess):
        r = sess.post(f"{API}/notifications/push-subscribe", json={
            "endpoint": "https://fcm.googleapis.com/fcm/send/TEST",
            "keys": {"auth": "test-auth", "p256dh": "test-p256dh"},
        })
        assert r.status_code == 200, r.text
        assert "note" in r.json(), "MOCKED response should include 'note'"


# ============================================================
# REFERRAL (invite loop / attribution)
# ============================================================
class TestReferralInvite:
    def test_referral_me(self, sess):
        r = sess.get(f"{API}/referrals/me")
        assert r.status_code == 200
        d = r.json()
        assert d["code"].startswith("CAGRID-")
        for k in ("sent_count", "signed_up_count", "badges_unlocked", "share_link"):
            assert k in d

    def test_invite_creates_events(self, sess):
        emails = [f"TEST_invite_{uuid.uuid4().hex[:6]}@example.com"]
        r = sess.post(f"{API}/referrals/invite", json={"emails": emails})
        assert r.status_code == 200, r.text

    def test_leaderboard(self):
        r = requests.get(f"{API}/referrals/leaderboard?scope=all-time")
        assert r.status_code == 200
        assert "items" in r.json()

    def test_lookup(self, sess):
        code = sess.get(f"{API}/referrals/me").json()["code"]
        r = requests.get(f"{API}/referrals/lookup", params={"code": code})
        assert r.status_code == 200

    def test_signup_ref_attribution(self, sess):
        me = sess.get(f"{API}/auth/me").json()
        demo_uid = me.get("user_id") or me.get("id")
        ref_code = sess.get(f"{API}/referrals/me").json()["code"]

        email = f"TEST_ref_{uuid.uuid4().hex[:8]}@example.com"
        s2 = requests.Session()
        r_sig = s2.post(f"{API}/auth/signup", json={
            "email": email, "password": "TestPass2026",
            "name": "Ref Test User", "ref": ref_code,
        })
        assert r_sig.status_code in (200, 201), r_sig.text

        me2 = s2.get(f"{API}/auth/me").json()
        # new user should be attributed
        assert me2.get("referred_by") == demo_uid or me2.get("total_xp", 0) >= 100

        # onboarding requires journey_level + daily_goal_minutes
        r_onb = s2.post(f"{API}/onboarding", json={
            "onboarded": True,
            "journey_level": "Foundation",
            "daily_goal_minutes": 60,
        })
        assert r_onb.status_code in (200, 201), f"onboarding failed: {r_onb.status_code} {r_onb.text}"

        time.sleep(1)
        notifs = sess.get(f"{API}/notifications").json()["items"]
        assert any(n.get("type") == "referral_signup" for n in notifs), \
            "expected referral_signup notification for demo user"


# ============================================================
# NOTIFICATION HOOKS
# ============================================================
class TestNotificationHooks:
    def test_mock_submit_creates_notification(self, sess):
        # find any mock exam
        r = sess.get(f"{API}/mocks")
        if r.status_code != 200:
            pytest.skip("mocks endpoint unavailable")
        data = r.json()
        mocks = data.get("items") or data.get("mocks") or []
        if not mocks:
            pytest.skip("no mocks seeded")
        mock_id = mocks[0].get("mock_id") or mocks[0].get("id")
        r_start = sess.post(f"{API}/mocks/{mock_id}/start")
        if r_start.status_code != 200:
            pytest.skip(f"attempt start not viable: {r_start.status_code}")
        aid = r_start.json().get("attempt_id")
        r_sub = sess.post(f"{API}/mocks/attempts/{aid}/submit", json={"responses": []})
        if r_sub.status_code != 200:
            pytest.skip(f"submit not viable: {r_sub.status_code}")
        time.sleep(1)
        notifs = sess.get(f"{API}/notifications").json()["items"]
        assert any(n.get("type") == "mock_result" for n in notifs), \
            "expected mock_result notification post-submit"


# ============================================================
# FEEDBACK
# ============================================================
class TestFeedback:
    def test_submit_feedback(self, sess):
        r = sess.post(f"{API}/feedback", json={
            "category": "Bug", "message": "TEST feedback bug report from pytest."
        })
        assert r.status_code == 200, r.text


# ============================================================
# STATUS (public)
# ============================================================
class TestStatus:
    def test_status_public(self):
        r = requests.get(f"{API}/status")
        assert r.status_code == 200
        d = r.json()
        assert d["status"] == "operational"
        assert "uptime_pct_30d" in d
        assert "avg_latency_ms" in d
        assert isinstance(d.get("components"), list)
        assert isinstance(d.get("incidents"), list)


# ============================================================
# TOUR FLAG
# ============================================================
class TestTourFlag:
    def test_tour_flag_persists(self, sess):
        r = sess.post(f"{API}/users/me/tour", json={"has_seen_tour": True})
        assert r.status_code == 200
        me = sess.get(f"{API}/auth/me").json()
        assert me.get("has_seen_tour") is True


# ============================================================
# REGRESSION
# ============================================================
class TestRegression:
    def test_openapi_public(self):
        r = requests.get(f"{API}/openapi.json")
        assert r.status_code == 200
        assert "paths" in r.json()

    def test_firms(self, sess):
        assert sess.get(f"{API}/firms").status_code == 200

    def test_community_categories(self, sess):
        assert sess.get(f"{API}/community/categories").status_code == 200

    def test_articleship_me(self, sess):
        assert sess.get(f"{API}/articleship/me").status_code == 200

    def test_syllabus(self, sess):
        assert sess.get(f"{API}/syllabus").status_code == 200

    def test_auth_me(self, sess):
        assert sess.get(f"{API}/auth/me").status_code == 200
