"""Phase 7 — Referral / Invite loop.

Every user gets a unique referral code. Inviting via email uses SendGrid,
signing up with ?ref= attributes referrer. Onboarding-complete awards XP +
badges. Leaderboard.
"""
from fastapi import APIRouter, HTTPException, Request
from pydantic import BaseModel, Field, ConfigDict
from typing import Optional, List
from datetime import datetime, timezone, timedelta
import uuid
import hashlib
import re
import logging
import os

logger = logging.getLogger("referral")
router = APIRouter(prefix="/api")

EMAIL_RE = re.compile(r"^[^@\s]+@[^@\s]+\.[a-zA-Z]{2,}$")

SENDGRID_API_KEY = os.environ.get("SENDGRID_API_KEY", "")
SENDGRID_FROM_EMAIL = os.environ.get("SENDGRID_FROM_EMAIL", "noreply@cagrid.in")
SENDGRID_FROM_NAME = os.environ.get("SENDGRID_FROM_NAME", "The CA Grid")


def _now():
    return datetime.now(timezone.utc)


def get_deps(request: Request):
    from server import db, limiter, require_user, log_event
    return db, limiter, require_user, log_event


class InviteBody(BaseModel):
    model_config = ConfigDict(str_strip_whitespace=True)
    emails: List[str] = Field(min_length=1, max_length=5)


class RefLookupBody(BaseModel):
    code: str = Field(min_length=6, max_length=32)


def _make_code(user_id: str) -> str:
    h = hashlib.sha1(f"{user_id}::{_now().timestamp()}".encode()).hexdigest()[:6].upper()
    return f"CAGRID-{h}"


async def ensure_referral_code(db, user_id: str) -> str:
    """Return user's referral code — create if missing."""
    existing = await db.referral_codes.find_one({"user_id": user_id}, {"_id": 0})
    if existing:
        return existing["code"]
    for _ in range(6):
        code = _make_code(user_id + uuid.uuid4().hex)
        clash = await db.referral_codes.find_one({"code": code}, {"_id": 0})
        if not clash:
            await db.referral_codes.insert_one({"user_id": user_id, "code": code, "created_at": _now()})
            return code
    # fallback
    code = f"CAGRID-{uuid.uuid4().hex[:6].upper()}"
    await db.referral_codes.insert_one({"user_id": user_id, "code": code, "created_at": _now()})
    return code


@router.get("/referrals/me")
async def my_referral(request: Request):
    db, _, require_user, _ = get_deps(request)
    user = await require_user(request)
    code = await ensure_referral_code(db, user["user_id"])
    sent = await db.referral_events.count_documents({"referrer_id": user["user_id"], "status": {"$in": ["sent", "signed_up", "onboarded"]}})
    signed_up = await db.referral_events.count_documents({"referrer_id": user["user_id"], "status": {"$in": ["signed_up", "onboarded"]}})
    onboarded = await db.referral_events.count_documents({"referrer_id": user["user_id"], "status": "onboarded"})
    # XP earned (200 per onboarded)
    xp_earned = onboarded * 200
    # badges unlocked so far
    badges = []
    if onboarded >= 3:
        badges.append("grid_ambassador")
    if onboarded >= 10:
        badges.append("founder_circle")
    return {
        "code": code,
        "sent_count": sent,
        "signed_up_count": signed_up,
        "onboarded_count": onboarded,
        "xp_earned": xp_earned,
        "badges_unlocked": badges,
        "share_link": f"/signup?ref={code}",
    }


@router.post("/referrals/invite")
async def invite(body: InviteBody, request: Request):
    db, _, require_user, log_event = get_deps(request)
    user = await require_user(request)
    # per-user hourly rate: 20/hour via header check would be nicer; here we count events in last 1h
    since = _now() - timedelta(hours=1)
    prior = await db.referral_events.count_documents({"referrer_id": user["user_id"], "sent_at": {"$gte": since}})
    if prior + len(body.emails) > 20:
        raise HTTPException(429, "Referral invite rate limit (20/hour)")
    code = await ensure_referral_code(db, user["user_id"])
    referrer_name = user.get("name") or "A CA aspirant"
    origin = (request.headers.get("origin") or "").strip("/")
    if not origin:
        origin = "https://cagrid.example"
    sent_docs = []
    for em in body.emails:
        em = em.strip().lower()
        if not EMAIL_RE.match(em):
            continue
        existing = await db.referral_events.find_one({"referrer_id": user["user_id"], "invitee_email": em}, {"_id": 0})
        if existing:
            continue
        doc = {
            "event_id": f"rvt_{uuid.uuid4().hex[:12]}",
            "referrer_id": user["user_id"],
            "invitee_email": em,
            "invitee_user_id": None,
            "status": "sent",
            "sent_at": _now(),
            "signed_up_at": None,
            "onboarded_at": None,
            "xp_awarded_referrer": False,
        }
        await db.referral_events.insert_one(doc)
        link = f"{origin}/signup?ref={code}"

        # Send actual email via SendGrid
        if SENDGRID_API_KEY:
            try:
                import sendgrid
                from sendgrid.helpers.mail import Mail, Email, To, Content

                sg = sendgrid.SendGridAPIClient(api_key=SENDGRID_API_KEY)
                mail = Mail(
                    from_email=Email(SENDGRID_FROM_EMAIL, SENDGRID_FROM_NAME),
                    to_emails=To(em),
                    subject=f"{referrer_name} invited you to The CA Grid",
                    plain_text_content=Content("text/plain", f"Join The CA Grid — India's premium prep platform. Get +100 XP welcome bonus when you sign up via {link}"),
                    html_content=Content("text/html", f"""
                        <div style="font-family: 'Space Grotesk', system-ui, sans-serif; max-width: 600px; margin: 0 auto; background: #0A0A0C; color: #F2F2F2; padding: 32px; border-radius: 16px; border: 1px solid rgba(139,92,246,0.2);">
                            <div style="text-align: center; margin-bottom: 24px;">
                                <div style="display: inline-flex; align-items: center; gap: 8px; background: linear-gradient(135deg, #8B5CF6, #A855F7); padding: 8px 16px; border-radius: 999px; font-size: 12px; font-weight: 600; text-transform: uppercase; letter-spacing: 0.1em;">
                                    <span>🎓</span> The CA Grid
                                </div>
                            </div>
                            <h1 style="font-family: 'Instrument Serif', serif; font-style: italic; font-size: 28px; line-height: 1.2; color: #F2F2F2; margin: 0 0 16px;">You've been invited</h1>
                            <p style="font-size: 15px; line-height: 1.6; color: #8B8B92; margin: 0 0 24px;">{referrer_name} thinks you'd love The CA Grid — a premium dark-mode-first productivity platform for Indian CA aspirants. Focus timer, streaks, AI mentor citing Ind AS at 2am, and analytics.</p>
                            <div style="text-align: center; margin: 32px 0;">
                                <a href="{link}" style="display: inline-block; background: linear-gradient(135deg, #8B5CF6, #A855F7); color: white; padding: 14px 28px; border-radius: 8px; font-weight: 600; text-decoration: none; font-size: 14px;">Claim +100 XP & Join →</a>
                            </div>
                            <p style="font-size: 11px; color: #5A5A62; text-align: center; margin-top: 24px;">This link expires in 30 days. If you didn't expect this, you can safely ignore this email.</p>
                        </div>
                    """),
                )
                response = sg.send(mail)
                logger.info(f"[EMAIL] SendGrid status={response.status_code} to={em}")
            except Exception as e:
                logger.error(f"[EMAIL] SendGrid failed: {e}")
                # Fallback to stdout logging
                logger.info(f"[EMAIL] to={em} subject=\"{referrer_name} invited you to The CA Grid\" body=\"Join The CA Grid — India's premium prep platform. Get +100 XP welcome bonus when you sign up via {link}\"")
        else:
            # No SendGrid configured - fallback to stdout logging
            logger.info(f"[EMAIL] to={em} subject=\"{referrer_name} invited you to The CA Grid\" body=\"Join The CA Grid — India's premium prep platform. Get +100 XP welcome bonus when you sign up via {link}\"")

        doc.pop("_id", None)
        sent_docs.append(doc)
    log_event("referral.invited", user_id=user["user_id"], count=len(sent_docs))
    return {"ok": True, "sent": len(sent_docs), "code": code, "events": sent_docs}


@router.get("/referrals/leaderboard")
async def leaderboard(request: Request, scope: str = "all-time", limit: int = 20):
    db, *_ = get_deps(request)
    match = {"status": "onboarded"}
    if scope == "weekly":
        match["onboarded_at"] = {"$gte": _now() - timedelta(days=7)}
    pipeline = [
        {"$match": match},
        {"$group": {"_id": "$referrer_id", "count": {"$sum": 1}}},
        {"$sort": {"count": -1}},
        {"$limit": min(limit, 50)},
    ]
    rows = []
    async for r in db.referral_events.aggregate(pipeline):
        u = await db.users.find_one({"user_id": r["_id"]}, {"_id": 0, "name": 1, "city": 1, "journey_level": 1, "is_verified_ca": 1})
        if not u:
            continue
        nm = u.get("name") or "?"
        rows.append({
            "user_id": r["_id"],
            "initials": "".join([p[0].upper() for p in nm.split()][:2]) or "?",
            "name_first": nm.split(" ")[0] if nm else "?",
            "city": u.get("city"),
            "is_verified_ca": bool(u.get("is_verified_ca")),
            "onboarded_count": int(r["count"]),
        })
    return {"items": rows, "count": len(rows), "scope": scope}


@router.get("/referrals/lookup")
async def lookup_code(request: Request, code: str):
    """Public lookup — used by landing page to show 'X invited you' banner."""
    db, *_ = get_deps(request)
    rc = await db.referral_codes.find_one({"code": code}, {"_id": 0})
    if not rc:
        raise HTTPException(404, "Invalid code")
    u = await db.users.find_one({"user_id": rc["user_id"]}, {"_id": 0, "name": 1, "city": 1, "is_verified_ca": 1, "journey_level": 1})
    if not u:
        raise HTTPException(404, "Referrer not found")
    nm = u.get("name") or "A CA aspirant"
    return {
        "code": code,
        "referrer_first_name": nm.split(" ")[0],
        "referrer_initials": "".join([p[0].upper() for p in nm.split()][:2]) or "?",
        "referrer_city": u.get("city"),
        "referrer_is_verified_ca": bool(u.get("is_verified_ca")),
        "welcome_bonus_xp": 100,
    }


# --- Helpers called from server.py signup/onboarding hooks ---
async def attribute_signup(db, new_user_id: str, ref_code: str) -> Optional[str]:
    """Attribute a signup to a referrer. Returns referrer_id if matched."""
    if not ref_code:
        return None
    rc = await db.referral_codes.find_one({"code": ref_code}, {"_id": 0})
    if not rc:
        return None
    referrer_id = rc["user_id"]
    if referrer_id == new_user_id:
        return None
    # attach to user
    await db.users.update_one({"user_id": new_user_id}, {"$set": {"referred_by": referrer_id, "referred_via_code": ref_code}})
    # find matching invite event by email (best-effort)
    user_row = await db.users.find_one({"user_id": new_user_id}, {"_id": 0, "email": 1})
    if user_row and user_row.get("email"):
        upd = await db.referral_events.update_one(
            {"referrer_id": referrer_id, "invitee_email": user_row["email"].lower(), "status": "sent"},
            {"$set": {"invitee_user_id": new_user_id, "signed_up_at": _now(), "status": "signed_up"}},
        )
        if not upd.matched_count:
            # create a new event (organic signup via shared code)
            await db.referral_events.insert_one({
                "event_id": f"rvt_{uuid.uuid4().hex[:12]}",
                "referrer_id": referrer_id,
                "invitee_email": user_row["email"].lower(),
                "invitee_user_id": new_user_id,
                "status": "signed_up",
                "sent_at": _now(),
                "signed_up_at": _now(),
                "onboarded_at": None,
                "xp_awarded_referrer": False,
            })
    # award invitee +100 XP welcome bonus
    await db.user_stats.update_one({"user_id": new_user_id}, {"$inc": {"total_xp": 100}}, upsert=True)
    logger.info(f"[referral] signup attributed: {new_user_id} <- {referrer_id} ({ref_code})")
    return referrer_id


async def award_referrer_on_onboarding(db, user_id: str):
    """Called when a user completes onboarding. If they were referred and referrer hasn't
    been awarded, +200 XP to referrer + notification + badge check."""
    u = await db.users.find_one({"user_id": user_id}, {"_id": 0, "referred_by": 1, "email": 1, "name": 1})
    if not u or not u.get("referred_by"):
        return None
    referrer_id = u["referred_by"]
    ev = await db.referral_events.find_one({"invitee_user_id": user_id, "status": "signed_up"}, {"_id": 0})
    if not ev:
        return None
    if ev.get("xp_awarded_referrer"):
        return None
    await db.referral_events.update_one({"event_id": ev["event_id"]}, {"$set": {"status": "onboarded", "onboarded_at": _now(), "xp_awarded_referrer": True}})
    await db.user_stats.update_one({"user_id": referrer_id}, {"$inc": {"total_xp": 200}}, upsert=True)
    # Notify
    try:
        from routes_notifications import create_notification
        await create_notification(
            user_id=referrer_id,
            type_="referral_signup",
            title=f"{u.get('name') or 'Your invitee'} just joined The Grid",
            body_markdown=f"+200 XP awarded. Keep inviting to unlock badges.",
            action_url="/invite",
        )
    except Exception:
        pass
    # Badge checks
    onboarded_count = await db.referral_events.count_documents({"referrer_id": referrer_id, "status": "onboarded"})
    try:
        from server import unlock_badge
        if onboarded_count >= 3:
            b = await unlock_badge(referrer_id, "grid_ambassador")
            if b:
                try:
                    from routes_notifications import create_notification
                    await create_notification(referrer_id, "badge_unlocked", f"Badge unlocked · Grid Ambassador",
                                              f"3 successful referrals. You're helping build The Grid.", action_url="/profile")
                except Exception:
                    pass
        if onboarded_count >= 10:
            b = await unlock_badge(referrer_id, "founder_circle")
            if b:
                try:
                    from routes_notifications import create_notification
                    await create_notification(referrer_id, "badge_unlocked", f"Badge unlocked · Founder's Circle",
                                              f"10+ CAs joined via you. Founder-tier community.", action_url="/profile")
                except Exception:
                    pass
    except Exception as e:
        logger.warning(f"badge check failed: {e}")
    logger.info(f"[referral] onboarding attributed: referrer={referrer_id}, invitee={user_id}, awarded +200 XP")
    return referrer_id
