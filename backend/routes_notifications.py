"""Phase 7 — Notifications system + scheduled reminders.

- create_notification() helper for other modules
- CRUD endpoints for viewing/reading
- Preferences endpoints
- APScheduler jobs for streak-at-risk (20:00 IST), exam-1-week (08:00 IST), weekly-recap (Mon 08:00 IST)
- Uses stdout `[EMAIL]` prints as the "email" backend for MVP.
"""
from fastapi import APIRouter, HTTPException, Request
from pydantic import BaseModel, Field, ConfigDict
from typing import Optional, List, Literal
from datetime import datetime, timezone, timedelta, date
import uuid
import logging

logger = logging.getLogger("notifications")

router = APIRouter(prefix="/api")


VALID_TYPES = [
    "streak_at_risk", "exam_1_week", "weekly_recap", "mock_result",
    "badge_unlocked", "referral_signup", "mentor_booking_confirmed",
    "community_reply", "system",
]


def _now():
    return datetime.now(timezone.utc)


def get_deps(request: Request):
    from server import db, limiter, require_user, log_event
    return db, limiter, require_user, log_event


class NotifPrefsBody(BaseModel):
    model_config = ConfigDict(str_strip_whitespace=True)
    email_streak_reminders: Optional[bool] = None
    email_weekly_recap: Optional[bool] = None
    email_exam_reminders: Optional[bool] = None
    push_enabled: Optional[bool] = None


class PushSubscribeBody(BaseModel):
    endpoint: str = Field(min_length=6, max_length=800)
    keys: dict = Field(default_factory=dict)


# ---------- Helper (used by other modules) ----------
async def create_notification(user_id: str, type_: str, title: str, body_markdown: str, action_url: Optional[str] = None):
    from server import db
    if type_ not in VALID_TYPES:
        type_ = "system"
    doc = {
        "notification_id": f"ntf_{uuid.uuid4().hex[:12]}",
        "user_id": user_id,
        "type": type_,
        "title": title[:200],
        "body_markdown": body_markdown[:2000],
        "action_url": action_url,
        "is_read": False,
        "created_at": _now(),
        "read_at": None,
    }
    await db.notifications.insert_one(doc)
    doc.pop("_id", None)
    return doc


async def get_prefs(db, user_id: str) -> dict:
    p = await db.notification_preferences.find_one({"user_id": user_id}, {"_id": 0})
    if not p:
        return {
            "user_id": user_id,
            "email_streak_reminders": True,
            "email_weekly_recap": True,
            "email_exam_reminders": True,
            "push_enabled": False,
        }
    return p


# ---------- Endpoints ----------
@router.get("/notifications")
async def list_notifications(request: Request, unread: bool = False, limit: int = 50):
    db, _, require_user, _ = get_deps(request)
    user = await require_user(request)
    q = {"user_id": user["user_id"]}
    if unread:
        q["is_read"] = False
    items = await db.notifications.find(q, {"_id": 0}).sort("created_at", -1).limit(min(limit, 200)).to_list(200)
    total_unread = await db.notifications.count_documents({"user_id": user["user_id"], "is_read": False})
    return {"items": items, "count": len(items), "total_unread": total_unread}


@router.post("/notifications/{nid}/read")
async def mark_read(nid: str, request: Request):
    db, _, require_user, _ = get_deps(request)
    user = await require_user(request)
    res = await db.notifications.update_one(
        {"notification_id": nid, "user_id": user["user_id"]},
        {"$set": {"is_read": True, "read_at": _now()}},
    )
    if not res.matched_count:
        raise HTTPException(404, "Notification not found")
    return {"ok": True}


@router.post("/notifications/read-all")
async def mark_all_read(request: Request):
    db, _, require_user, _ = get_deps(request)
    user = await require_user(request)
    res = await db.notifications.update_many(
        {"user_id": user["user_id"], "is_read": False},
        {"$set": {"is_read": True, "read_at": _now()}},
    )
    return {"ok": True, "marked": res.modified_count}


@router.get("/notifications/preferences")
async def get_pref(request: Request):
    db, _, require_user, _ = get_deps(request)
    user = await require_user(request)
    return await get_prefs(db, user["user_id"])


@router.put("/notifications/preferences")
async def update_pref(body: NotifPrefsBody, request: Request):
    db, _, require_user, _ = get_deps(request)
    user = await require_user(request)
    upd = {k: v for k, v in body.model_dump().items() if v is not None}
    upd["user_id"] = user["user_id"]
    upd["updated_at"] = _now()
    await db.notification_preferences.update_one({"user_id": user["user_id"]}, {"$set": upd}, upsert=True)
    return await get_prefs(db, user["user_id"])


@router.post("/notifications/push-subscribe")
async def push_subscribe(body: PushSubscribeBody, request: Request):
    """MOCKED — stores the subscription but does not send real push messages."""
    db, _, require_user, log_event = get_deps(request)
    user = await require_user(request)
    await db.push_subscriptions.update_one(
        {"user_id": user["user_id"]},
        {"$set": {"user_id": user["user_id"], "endpoint": body.endpoint, "keys": body.keys, "created_at": _now()}},
        upsert=True,
    )
    log_event("notifications.push_subscribed", user_id=user["user_id"], note="MOCKED")
    return {"ok": True, "note": "MOCKED — subscription saved but no push messages will actually fire."}


# ---------- Scheduled tasks ----------
SENDGRID_API_KEY = os.environ.get("SENDGRID_API_KEY", "")
SENDGRID_FROM_EMAIL = os.environ.get("SENDGRID_FROM_EMAIL", "noreply@cagrid.in")
SENDGRID_FROM_NAME = os.environ.get("SENDGRID_FROM_NAME", "The CA Grid")


async def _send_email(to: str, subject: str, body: str, html_body: Optional[str] = None):
    """Send email via SendGrid, fallback to logging if not configured."""
    if SENDGRID_API_KEY:
        try:
            import sendgrid
            from sendgrid.helpers.mail import Mail, Email, To, Content

            sg = sendgrid.SendGridAPIClient(api_key=SENDGRID_API_KEY)
            mail = Mail(
                from_email=Email(SENDGRID_FROM_EMAIL, SENDGRID_FROM_NAME),
                to_emails=To(to),
                subject=subject,
                plain_text_content=Content("text/plain", body),
            )
            if html_body:
                mail.html_content = Content("text/html", html_body)
            response = sg.send(mail)
            logger.info(f"[EMAIL] SendGrid status={response.status_code} to={to}")
            return True
        except Exception as e:
            logger.error(f"[EMAIL] SendGrid failed: {e}")
    # Fallback to logging
    logger.info(f"[EMAIL] to={to} subject=\"{subject}\" body=\"{body[:400]}...\"")
    return False


async def _send_streak_email(to: str, name: str, streak: int):
    """Send streak-at-risk email with premium template."""
    subject = f"Your {streak}-day streak needs 15 min tonight"
    body = f"Hi {name} — 15 focused minutes will save your {streak}-day streak. The grid is waiting."
    html_body = f"""
    <div style="font-family: 'Space Grotesk', system-ui, sans-serif; max-width: 600px; margin: 0 auto; background: #0A0A0C; color: #F2F2F2; padding: 32px; border-radius: 16px; border: 1px solid rgba(139,92,246,0.2);">
        <div style="text-align: center; margin-bottom: 24px;">
            <div style="display: inline-flex; align-items: center; gap: 8px; background: linear-gradient(135deg, #8B5CF6, #A855F7); padding: 8px 16px; border-radius: 999px; font-size: 12px; font-weight: 600; text-transform: uppercase; letter-spacing: 0.1em;">
                <span>🔥</span> The CA Grid
            </div>
        </div>
        <h1 style="font-family: 'Instrument Serif', serif; font-style: italic; font-size: 28px; line-height: 1.2; color: #F2F2F2; margin: 0 0 16px;">Your streak is at risk</h1>
        <p style="font-size: 15px; line-height: 1.6; color: #8B8B92; margin: 0 0 24px;">Hi {name}, you've built a {streak}-day streak. 15 focused minutes tonight will save it. The grid is waiting.</p>
        <div style="text-align: center; margin: 32px 0;">
            <a href="https://cagrid.in/focus" style="display: inline-block; background: linear-gradient(135deg, #8B5CF6, #A855F7); color: white; padding: 14px 28px; border-radius: 8px; font-weight: 600; text-decoration: none; font-size: 14px;">Save My Streak →</a>
        </div>
        <p style="font-size: 11px; color: #5A5A62; text-align: center; margin-top: 24px;">You're receiving this because you enabled streak reminders. <a href="https://cagrid.in/settings/notifications" style="color: #8B5CF6;">Manage preferences</a>.</p>
    </div>
    """
    await _send_email(to, subject, body, html_body)


async def _send_exam_email(to: str, name: str, exam_date: str):
    """Send exam reminder email."""
    subject = f"Your exam is in 7 days"
    body = f"Hi {name} — your exam on {exam_date} is 7 days away. Time to run last-week revision drills."
    html_body = f"""
    <div style="font-family: 'Space Grotesk', system-ui, sans-serif; max-width: 600px; margin: 0 auto; background: #0A0A0C; color: #F2F2F2; padding: 32px; border-radius: 16px; border: 1px solid rgba(139,92,246,0.2);">
        <div style="text-align: center; margin-bottom: 24px;">
            <div style="display: inline-flex; align-items: center; gap: 8px; background: linear-gradient(135deg, #F59E0B, #FBBF24); padding: 8px 16px; border-radius: 999px; font-size: 12px; font-weight: 600; text-transform: uppercase; letter-spacing: 0.1em;">
                <span>📅</span> The CA Grid
            </div>
        </div>
        <h1 style="font-family: 'Instrument Serif', serif; font-style: italic; font-size: 28px; line-height: 1.2; color: #F2F2F2; margin: 0 0 16px;">7 days to go</h1>
        <p style="font-size: 15px; line-height: 1.6; color: #8B8B92; margin: 0 0 24px;">Hi {name}, your exam on {exam_date} is 7 days away. Time to run last-week revision drills.</p>
        <div style="text-align: center; margin: 32px 0;">
            <a href="https://cagrid.in/mocks" style="display: inline-block; background: linear-gradient(135deg, #F59E0B, #FBBF24); color: white; padding: 14px 28px; border-radius: 8px; font-weight: 600; text-decoration: none; font-size: 14px;">Start Revision Drills →</a>
        </div>
        <p style="font-size: 11px; color: #5A5A62; text-align: center; margin-top: 24px;">You're receiving this because you enabled exam reminders. <a href="https://cagrid.in/settings/notifications" style="color: #8B5CF6;">Manage preferences</a>.</p>
    </div>
    """
    await _send_email(to, subject, body, html_body)


async def _send_weekly_email(to: str, name: str, minutes: int, sessions: int, streak: int):
    """Send weekly recap email."""
    subject = f"Your week — {minutes} min · {sessions} sessions · {streak}-day streak"
    body = f"You focused {minutes} minutes across {sessions} sessions this week. Streak: {streak}. Keep it going."
    html_body = f"""
    <div style="font-family: 'Space Grotesk', system-ui, sans-serif; max-width: 600px; margin: 0 auto; background: #0A0A0C; color: #F2F2F2; padding: 32px; border-radius: 16px; border: 1px solid rgba(139,92,246,0.2);">
        <div style="text-align: center; margin-bottom: 24px;">
            <div style="display: inline-flex; align-items: center; gap: 8px; background: linear-gradient(135deg, #8B5CF6, #A855F7); padding: 8px 16px; border-radius: 999px; font-size: 12px; font-weight: 600; text-transform: uppercase; letter-spacing: 0.1em;">
                <span>📊</span> The CA Grid
            </div>
        </div>
        <h1 style="font-family: 'Instrument Serif', serif; font-style: italic; font-size: 28px; line-height: 1.2; color: #F2F2F2; margin: 0 0 16px;">Your weekly recap</h1>
        <p style="font-size: 15px; line-height: 1.6; color: #8B8B92; margin: 0 0 24px;">Hi {name}, you focused {minutes} minutes across {sessions} sessions this week. Streak: {streak}. Keep it going.</p>
        <div style="text-align: center; margin: 32px 0;">
            <a href="https://cagrid.in/analytics" style="display: inline-block; background: linear-gradient(135deg, #8B5CF6, #A855F7); color: white; padding: 14px 28px; border-radius: 8px; font-weight: 600; text-decoration: none; font-size: 14px;">View Full Analytics →</a>
        </div>
        <p style="font-size: 11px; color: #5A5A62; text-align: center; margin-top: 24px;">You're receiving this because you enabled weekly recaps. <a href="https://cagrid.in/settings/notifications" style="color: #8B5CF6;">Manage preferences</a>.</p>
    </div>
    """
    await _send_email(to, subject, body, html_body)


async def task_streak_at_risk():
    """Every day 20:00 IST — find users w/ streak>=3 who haven't focused today. Send in-app + email."""
    from server import db, IST
    from datetime import datetime as _dt
    today_ist = _dt.now(IST).date().strftime("%Y-%m-%d")
    logger.info("[scheduler] running task_streak_at_risk")
    n_sent = 0
    async for stats in db.user_stats.find({"current_streak": {"$gte": 3}}, {"_id": 0}):
        uid = stats["user_id"]
        # any completed session today (IST)?
        did_focus = await db.focus_sessions.find_one({
            "user_id": uid, "status": "completed",
            "ended_at": {"$gte": _now() - timedelta(hours=20)},
        }, {"_id": 0})
        if did_focus:
            continue
        user = await db.users.find_one({"user_id": uid}, {"_id": 0, "email": 1, "name": 1})
        if not user:
            continue
        prefs = await get_prefs(db, uid)
        streak = stats.get("current_streak", 0)
        title = f"Your {streak}-day streak needs 15 min tonight"
        body = f"Hi {user.get('name','there')} — 15 focused minutes will save your {streak}-day streak. The grid is waiting."
        await create_notification(uid, "streak_at_risk", title, body, action_url="/focus")
        if prefs.get("email_streak_reminders"):
            await _send_streak_email(user.get("email", "?"), user.get("name", "there"), streak)
        n_sent += 1
    logger.info(f"[scheduler] task_streak_at_risk sent {n_sent}")


async def task_exam_1_week():
    """Every day 08:00 IST — for users with study_plan.exam_date in [6.5, 7.5) days from now."""
    from server import db
    logger.info("[scheduler] running task_exam_1_week")
    now = _now()
    lo = now + timedelta(days=6, hours=12)
    hi = now + timedelta(days=7, hours=12)
    n_sent = 0
    async for sp in db.study_plans.find({"exam_date": {"$gte": lo, "$lt": hi}, "is_active": True}, {"_id": 0}):
        uid = sp.get("user_id")
        if not uid:
            continue
        user = await db.users.find_one({"user_id": uid}, {"_id": 0, "email": 1, "name": 1})
        if not user:
            continue
        prefs = await get_prefs(db, uid)
        edate = sp["exam_date"].strftime("%d %b %Y") if isinstance(sp.get("exam_date"), datetime) else str(sp.get("exam_date"))
        title = f"Your exam is in 7 days"
        body = f"Hi {user.get('name','there')} — your exam on {edate} is 7 days away. Time to run last-week revision drills."
        await create_notification(uid, "exam_1_week", title, body, action_url="/mocks")
        if prefs.get("email_exam_reminders"):
            await _send_exam_email(user.get("email", "?"), user.get("name", "there"), edate)
        n_sent += 1
    logger.info(f"[scheduler] task_exam_1_week sent {n_sent}")


async def task_weekly_recap():
    """Every Monday 08:00 IST — for users active in the last 30 days."""
    from server import db
    logger.info("[scheduler] running task_weekly_recap")
    since = _now() - timedelta(days=30)
    n_sent = 0
    active_ids = set()
    async for s in db.focus_sessions.find({"ended_at": {"$gte": since}, "status": "completed"}, {"_id": 0, "user_id": 1}):
        active_ids.add(s["user_id"])
    for uid in list(active_ids):
        user = await db.users.find_one({"user_id": uid}, {"_id": 0, "email": 1, "name": 1})
        if not user:
            continue
        # weekly summary
        wk_start = _now() - timedelta(days=7)
        wk_sessions = await db.focus_sessions.count_documents({"user_id": uid, "status": "completed", "ended_at": {"$gte": wk_start}})
        wk_minutes = 0
        async for s in db.focus_sessions.find({"user_id": uid, "status": "completed", "ended_at": {"$gte": wk_start}}, {"_id": 0, "actual_duration_seconds": 1}):
            wk_minutes += (s.get("actual_duration_seconds") or 0) // 60
        stats = await db.user_stats.find_one({"user_id": uid}, {"_id": 0}) or {}
        streak = stats.get("current_streak", 0)
        title = f"Your week — {wk_minutes} min · {wk_sessions} sessions · {streak}-day streak"
        body = f"You focused {wk_minutes} minutes across {wk_sessions} sessions this week. Streak: {streak}. Keep it going."
        await create_notification(uid, "weekly_recap", title, body, action_url="/analytics")
        prefs = await get_prefs(db, uid)
        if prefs.get("email_weekly_recap"):
            await _send_weekly_email(user.get("email", "?"), user.get("name", "there"), wk_minutes, wk_sessions, streak)
        n_sent += 1
    logger.info(f"[scheduler] task_weekly_recap sent {n_sent}")


def register_scheduler():
    """Register the three daily/weekly jobs on the shared APScheduler instance.
    Called once from server.py on startup.
    """
    from apscheduler.schedulers.asyncio import AsyncIOScheduler
    from apscheduler.triggers.cron import CronTrigger
    import pytz
    ist = pytz.timezone("Asia/Kolkata")
    sched = AsyncIOScheduler(timezone=ist)
    sched.add_job(task_streak_at_risk, CronTrigger(hour=20, minute=0, timezone=ist), id="streak_at_risk", replace_existing=True)
    sched.add_job(task_exam_1_week, CronTrigger(hour=8, minute=0, timezone=ist), id="exam_1_week", replace_existing=True)
    sched.add_job(task_weekly_recap, CronTrigger(day_of_week="mon", hour=8, minute=0, timezone=ist), id="weekly_recap", replace_existing=True)
    sched.start()
    logger.info("[scheduler] Phase 7 scheduler started (streak_at_risk, exam_1_week, weekly_recap).")
    return sched
