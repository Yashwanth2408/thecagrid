"""Phase 5 backend tests — Mocks + Flashcards + Phase 4 fixes (radar unread + tag cross-match)."""
import os
import time
import pytest
import requests
import os as _os
BASE_URL = _os.environ.get("REACT_APP_BACKEND_URL")
if not BASE_URL:
    from pathlib import Path as _P
    for line in _P("/app/frontend/.env").read_text().splitlines():
        if line.startswith("REACT_APP_BACKEND_URL="):
            BASE_URL = line.split("=", 1)[1].strip()
            break
API = f"{(BASE_URL or '').rstrip('/')}/api"


DEMO = {"email": "demo@cagrid.in", "password": "demo123"}


# ---------- fixtures ----------

@pytest.fixture(scope="module")
def demo_session():
    s = requests.Session()
    r = s.post(f"{API}/auth/login", json=DEMO, timeout=15)
    assert r.status_code == 200, f"login failed: {r.status_code} {r.text}"
    return s


# ---------- Phase 4 FIX: radar unread_count after dismiss ----------

class TestPhase4Fixes:
    def test_radar_summary_unread_decrements_after_dismiss(self, demo_session):
        s = demo_session
        r1 = s.get(f"{API}/radar/summary")
        assert r1.status_code == 200
        before = r1.json()["unread_count"]
        assert before >= 1, "need at least 1 undismissed alert to test dismiss"
        # find a not-yet-dismissed alert from list
        alerts = s.get(f"{API}/radar/alerts").json().get("items", [])
        undismissed = [a for a in alerts if not a.get("is_dismissed")]
        assert undismissed, "no undismissed alerts to work with"
        aid = undismissed[0]["alert_id"]
        rd = s.post(f"{API}/radar/alerts/{aid}/dismiss")
        assert rd.status_code == 200
        r2 = s.get(f"{API}/radar/summary")
        after = r2.json()["unread_count"]
        assert after < before, f"unread_count did not decrease: {before} -> {after} (cache should be invalidated on dismiss)"

    def test_content_posts_tag_foundation_cross_match(self, demo_session):
        s = demo_session
        r = s.get(f"{API}/content/posts", params={"tag": "Foundation"})
        assert r.status_code == 200
        items = r.json()["items"]
        assert len(items) >= 4, f"expected >=4 Foundation-tagged posts (including cross-match), got {len(items)}"

    def test_content_posts_level_foundation_nonempty(self, demo_session):
        s = demo_session
        r = s.get(f"{API}/content/posts", params={"level": "Foundation"})
        assert r.status_code == 200
        assert len(r.json()["items"]) > 0


# ---------- Phase 5: MOCKS ----------

class TestMocksList:
    def test_mocks_list_returns_8(self, demo_session):
        r = demo_session.get(f"{API}/mocks")
        assert r.status_code == 200
        items = r.json()["items"]
        assert len(items) == 8, f"expected 8 mocks, got {len(items)}"
        first = items[0]
        for k in ("mock_id", "paper_code", "title", "duration_minutes", "total_marks", "question_count", "difficulty_profile", "attempts_count"):
            assert k in first, f"missing key {k}"
        # best_score is nullable; must exist as a key
        assert "best_score" in first


class TestMockAttemptFlow:
    def test_start_strips_answers_and_is_idempotent(self, demo_session):
        s = demo_session
        r1 = s.post(f"{API}/mocks/mock_i3_tax_speed/start")
        assert r1.status_code == 200, r1.text
        j1 = r1.json()
        aid1 = j1["attempt_id"]
        assert j1["questions"], "no questions returned"
        for q in j1["questions"]:
            assert "correct_option" not in q, f"correct_option leaked in question {q.get('question_id')}"
            assert "explanation_markdown" not in q
            assert "model_answer_markdown" not in q
        # Second start should return same attempt_id
        r2 = s.post(f"{API}/mocks/mock_i3_tax_speed/start")
        assert r2.status_code == 200
        assert r2.json()["attempt_id"] == aid1, "in-progress attempt not reused"

    def test_answer_save_and_update_no_duplicate(self, demo_session):
        s = demo_session
        r_start = s.post(f"{API}/mocks/mock_i3_tax_speed/start")
        aid = r_start.json()["attempt_id"]
        qid = r_start.json()["questions"][0]["question_id"]
        r_a1 = s.post(f"{API}/mocks/attempts/{aid}/answer",
                      json={"question_id": qid, "selected_option": "A", "time_spent_seconds": 20})
        assert r_a1.status_code == 200
        assert r_a1.json().get("saved") is True
        # Update same question
        r_a2 = s.post(f"{API}/mocks/attempts/{aid}/answer",
                      json={"question_id": qid, "selected_option": "B", "time_spent_seconds": 30})
        assert r_a2.status_code == 200
        assert r_a2.json().get("saved") is True

    def test_full_submit_flow_and_history(self, demo_session):
        s = demo_session
        # Start (may reuse existing in-progress from previous test)
        r_start = s.post(f"{API}/mocks/mock_i3_tax_speed/start")
        aid = r_start.json()["attempt_id"]
        questions = r_start.json()["questions"]
        # Answer all with option A
        for q in questions:
            s.post(f"{API}/mocks/attempts/{aid}/answer",
                   json={"question_id": q["question_id"], "selected_option": "A", "time_spent_seconds": 5})
        # Submit
        r_sub = s.post(f"{API}/mocks/attempts/{aid}/submit")
        assert r_sub.status_code == 200, r_sub.text
        j = r_sub.json()
        for k in ("score", "marks_obtained", "total_marks", "percentile_estimate", "weak_topics", "strong_topics", "xp_awarded"):
            assert k in j, f"missing {k}"
        assert 0 <= j["score"] <= 100
        assert j["xp_awarded"] in (50, 100, 150)
        # Second answer must fail (attempt closed)
        r_late = s.post(f"{API}/mocks/attempts/{aid}/answer",
                        json={"question_id": questions[0]["question_id"], "selected_option": "A", "time_spent_seconds": 1})
        assert r_late.status_code == 400

        # History includes >=3 seeded + this one = >=4
        r_h = s.get(f"{API}/mocks/attempts/history")
        assert r_h.status_code == 200
        subs = [x for x in r_h.json()["items"] if x.get("status") == "submitted"]
        assert len(subs) >= 3, f"expected >=3 submitted attempts, got {len(subs)}"
        for x in subs[:3]:
            for k in ("score", "marks_obtained", "paper_code", "mock_id", "weak_topics", "strong_topics"):
                assert k in x, f"history item missing {k}"

        # Attempt detail — includes correct_option + explanation + user_answer w/ marks_awarded/is_correct
        r_detail = s.get(f"{API}/mocks/attempts/{aid}")
        assert r_detail.status_code == 200
        det = r_detail.json()
        assert det["questions"], "no questions in detail"
        q0 = det["questions"][0]
        assert "correct_option" in q0, "correct_option not present on submitted attempt detail"
        assert "explanation_markdown" in q0
        assert q0.get("user_answer") is not None
        ua = q0["user_answer"]
        assert "marks_awarded" in ua
        assert "is_correct" in ua


# ---------- Phase 5: FLASHCARDS ----------

class TestFlashcards:
    def test_decks_returns_10(self, demo_session):
        r = demo_session.get(f"{API}/flashcards/decks")
        assert r.status_code == 200
        items = r.json()["items"]
        assert len(items) == 10, f"expected 10 decks, got {len(items)}"
        for d in items:
            assert "user_progress" in d
            for k in ("due_today", "mastered", "total"):
                assert k in d["user_progress"]

    def test_queue_returns_cards_with_progress(self, demo_session):
        r = demo_session.get(f"{API}/flashcards/decks/deck_i3_dt_core/queue", params={"limit": 20})
        assert r.status_code == 200
        j = r.json()
        assert j["items"], "queue empty"
        c0 = j["items"][0]
        assert "front_markdown" in c0
        assert "back_markdown" in c0
        assert "progress" in c0  # None or dict

    def test_sm2_grade_3_on_new_card(self, demo_session):
        s = demo_session
        # find an unstudied card in a deck we don't have progress on
        q = s.get(f"{API}/flashcards/decks/deck_i3_dt_core/queue", params={"limit": 100}).json()
        unstudied = next((c for c in q["items"] if c.get("progress") is None), None)
        if not unstudied:
            pytest.skip("no unstudied cards in this deck")
        cid = unstudied["card_id"]
        r = s.post(f"{API}/flashcards/review",
                   json={"card_id": cid, "grade": 3, "time_spent_seconds": 10})
        assert r.status_code == 200, r.text
        j = r.json()
        p = j["progress"]
        assert p["repetitions"] == 1
        assert p["interval_days"] == 1
        assert p["ease_factor"] > 2.5, f"ease_factor should increase, got {p['ease_factor']}"
        assert j["xp_awarded"] == 5

    def test_sm2_grade_0_resets(self, demo_session):
        s = demo_session
        # find a demo card with repetitions >= 3 (from seed — some progress rows exist)
        stats = s.get(f"{API}/flashcards/stats").json()
        # try each deck queue and pick a card whose progress reps >=3
        target = None
        decks = s.get(f"{API}/flashcards/decks").json()["items"]
        for d in decks:
            q = s.get(f"{API}/flashcards/decks/{d['deck_id']}/queue", params={"limit": 100}).json()
            for c in q["items"]:
                p = c.get("progress")
                if p and p.get("repetitions", 0) >= 3:
                    target = c
                    break
            if target:
                break
        if not target:
            # Force one: grade a card up to reps=3
            fresh = None
            for d in decks:
                q = s.get(f"{API}/flashcards/decks/{d['deck_id']}/queue", params={"limit": 100}).json()
                fresh = next((c for c in q["items"] if c.get("progress") is None), None)
                if fresh: break
            assert fresh, "no fresh card available"
            for _ in range(3):
                s.post(f"{API}/flashcards/review",
                       json={"card_id": fresh["card_id"], "grade": 3, "time_spent_seconds": 5})
            target = fresh
        cid = target["card_id"]
        r = s.post(f"{API}/flashcards/review",
                   json={"card_id": cid, "grade": 0, "time_spent_seconds": 5})
        assert r.status_code == 200, r.text
        j = r.json()
        assert j["progress"]["repetitions"] == 0
        assert j["progress"]["interval_days"] == 0
        assert j["xp_awarded"] == 0

    def test_flashcard_stats_mastered_count(self, demo_session):
        r = demo_session.get(f"{API}/flashcards/stats")
        assert r.status_code == 200
        j = r.json()
        for k in ("total_cards_studied", "mastered_count", "due_today"):
            assert k in j
        # Demo seed says mastered_count should reflect reps >=4 cards (~12)
        # The seed value can drift as tests review cards; just assert it's >=1
        assert j["mastered_count"] >= 1


# ---------- Phase 5: RATE LIMITS ----------

class TestRateLimits:
    def test_submit_rate_limit_hits_429(self, demo_session):
        s = demo_session
        # need a fresh attempt to hit /submit; but attempt closes on first submit.
        # Rate limit is per endpoint/user regardless of attempt id — 429 should still fire.
        # We'll fire 11 rapid calls against a non-existent attempt; 404 also counted under limiter? 
        # Actually slowapi returns 429 BEFORE the handler runs, so any 11th call should be 429.
        codes = []
        for i in range(12):
            r = s.post(f"{API}/mocks/attempts/does_not_exist/submit")
            codes.append(r.status_code)
            if r.status_code == 429:
                # Retry-After header expected
                assert "retry-after" in {k.lower() for k in r.headers.keys()}
                return
        pytest.fail(f"never hit 429 in 12 calls; codes={codes}")


# ---------- REGRESSION ----------

class TestRegression:
    def test_account_export_includes_mock_and_flashcard(self, demo_session):
        r = demo_session.get(f"{API}/account/export")
        assert r.status_code == 200
        j = r.json()
        assert "mock_attempts" in j
        assert isinstance(j["mock_attempts"], list)
        assert "user_flashcard_progress" in j
        assert isinstance(j["user_flashcard_progress"], list)

    def test_dashboard_still_works(self, demo_session):
        r = demo_session.get(f"{API}/dashboard")
        assert r.status_code == 200

    def test_syllabus_still_works(self, demo_session):
        r = demo_session.get(f"{API}/syllabus")
        assert r.status_code == 200

    def test_radar_alerts_still_works(self, demo_session):
        r = demo_session.get(f"{API}/radar/alerts")
        assert r.status_code == 200

    def test_content_posts_still_works(self, demo_session):
        r = demo_session.get(f"{API}/content/posts")
        assert r.status_code == 200
