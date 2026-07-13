"""
The CA Grid — FastAPI backend
Phase 1: Auth (Emergent + email/password) + onboarding
Phase 2: Focus sessions + XP/level + streaks + badges + analytics
"""
from fastapi import FastAPI, APIRouter, HTTPException, Request, Response, Header
from dotenv import load_dotenv
from starlette.middleware.cors import CORSMiddleware
from starlette.middleware.base import BaseHTTPMiddleware
from motor.motor_asyncio import AsyncIOMotorClient
import os
import logging
import uuid
import secrets
import math
import random
from pathlib import Path
from pydantic import BaseModel, EmailStr, Field, ConfigDict
from typing import Optional, List, Literal
from datetime import datetime, timezone, timedelta, date
import asyncio
import httpx
import bcrypt
import pytz
import re
import json as _json
from collections import defaultdict, deque
from fastapi.responses import StreamingResponse, JSONResponse
from slowapi import Limiter
from slowapi.errors import RateLimitExceeded
from emergentintegrations.llm.chat import LlmChat, UserMessage, TextDelta, StreamDone
from prompts import build_exam_prompt, build_practice_prompt, build_study_plan_prompt
from common_passwords import is_common_password

ROOT_DIR = Path(__file__).parent
load_dotenv(ROOT_DIR / '.env')

mongo_url = os.environ['MONGO_URL']
client = AsyncIOMotorClient(mongo_url)
db = client[os.environ['DB_NAME']]

app = FastAPI(
    title="The CA Grid API",
    openapi_url="/api/openapi.json",
    docs_url="/api/docs",
    redoc_url="/api/redoc",
)
api_router = APIRouter(prefix="/api")

logging.basicConfig(level=logging.INFO, format='%(asctime)s - %(name)s - %(levelname)s - %(message)s')
logger = logging.getLogger(__name__)

# ---------- Constants ----------
SESSION_TTL_DAYS = 7
EMERGENT_SESSION_URL = "https://demobackend.emergentagent.com/auth/v1/env/oauth/session-data"
IST = pytz.timezone("Asia/Kolkata")
EMERGENT_LLM_KEY = os.environ.get("EMERGENT_LLM_KEY", "")
MENTOR_MODEL = ("anthropic", "claude-sonnet-4-5-20250929")

# ---------- Structured JSON logging ----------
def log_event(event: str, **fields):
    payload = {"event": event, "ts": datetime.now(timezone.utc).isoformat(), **fields}
    logger.info("EVENT " + _json.dumps(payload, default=str))

# ---------- Rate limiter (slowapi) ----------
def _rate_key(request: Request) -> str:
    """Key rate limits by user_id when authenticated, else remote IP."""
    tok = request.cookies.get("session_token")
    if not tok:
        auth = request.headers.get("authorization") or ""
        if auth.lower().startswith("bearer "):
            tok = auth.split(" ", 1)[1].strip()
    if tok:
        return f"tok:{tok[:24]}"
    # X-Forwarded-For for proxies
    xff = request.headers.get("x-forwarded-for")
    if xff:
        return f"ip:{xff.split(',')[0].strip()}"
    return f"ip:{request.client.host if request.client else 'unknown'}"

limiter = Limiter(key_func=_rate_key, default_limits=["100/minute"])

# ---------- Password strength ----------
PASSWORD_MIN = 8
PASSWORD_MAX = 200
_letter_re = re.compile(r"[A-Za-z]")
_digit_re = re.compile(r"\d")

def validate_password_strength(pw: str) -> Optional[str]:
    """Return an error string if the password is too weak, else None."""
    if not pw or len(pw) < PASSWORD_MIN:
        return f"Password must be at least {PASSWORD_MIN} characters"
    if len(pw) > PASSWORD_MAX:
        return f"Password must be at most {PASSWORD_MAX} characters"
    if not _letter_re.search(pw):
        return "Password must contain at least one letter"
    if not _digit_re.search(pw):
        return "Password must contain at least one number"
    if is_common_password(pw):
        return "Password is too common — pick something less predictable"
    return None

# In-memory rate limiter for /mentor/quick (10/min/user)
_QUICK_RATE: dict = defaultdict(deque)
def check_quick_rate(user_id: str) -> bool:
    now = datetime.now(timezone.utc).timestamp()
    q = _QUICK_RATE[user_id]
    while q and now - q[0] > 60:
        q.popleft()
    if len(q) >= 10:
        return False
    q.append(now)
    return True

# ---------- Utils ----------
def now_utc() -> datetime:
    return datetime.now(timezone.utc)

def now_ist() -> datetime:
    return datetime.now(IST)

def today_ist_str() -> str:
    return now_ist().strftime("%Y-%m-%d")

def date_ist_str(dt: datetime) -> str:
    if dt.tzinfo is None:
        dt = dt.replace(tzinfo=timezone.utc)
    return dt.astimezone(IST).strftime("%Y-%m-%d")

def monday_of_week_ist(ref: Optional[datetime] = None) -> str:
    """Return YYYY-MM-DD of the Monday IST of the week containing ref (default: now)."""
    ref = ref or now_ist()
    if ref.tzinfo is None:
        ref = IST.localize(ref)
    d = ref.astimezone(IST)
    monday = d - timedelta(days=d.weekday())
    return monday.strftime("%Y-%m-%d")

def new_user_id() -> str:
    return f"user_{uuid.uuid4().hex[:12]}"

def new_session_id() -> str:
    return f"sess_{uuid.uuid4().hex[:14]}"

def hash_password(plain: str) -> str:
    return bcrypt.hashpw(plain.encode("utf-8"), bcrypt.gensalt()).decode("utf-8")

def verify_password(plain: str, hashed: str) -> bool:
    try:
        return bcrypt.checkpw(plain.encode("utf-8"), hashed.encode("utf-8"))
    except Exception:
        return False

def sanitize_user(u: dict) -> dict:
    if not u:
        return u
    return {
        "user_id": u.get("user_id"),
        "email": u.get("email"),
        "name": u.get("name"),
        "picture": u.get("picture"),
        "auth_provider": u.get("auth_provider"),
        "journey_level": u.get("journey_level"),
        "daily_goal_minutes": u.get("daily_goal_minutes"),
        "subjects": u.get("subjects", []),
        "fit_score": u.get("fit_score"),
        "onboarded": bool(u.get("onboarded", False)),
        "city": u.get("city"),
        "created_at": u.get("created_at"),
    }

# ---------- XP + Level ----------
def compute_level(xp: int) -> int:
    return int(math.floor(math.sqrt(max(0, xp) / 50))) + 1

def xp_for_level(level: int) -> int:
    return (level - 1) ** 2 * 50

def xp_to_next(xp: int) -> dict:
    lvl = compute_level(xp)
    next_lvl_xp = xp_for_level(lvl + 1)
    cur_lvl_xp = xp_for_level(lvl)
    return {
        "level": lvl,
        "xp_to_next_level": max(0, next_lvl_xp - xp),
        "xp_in_level": xp - cur_lvl_xp,
        "xp_per_level": next_lvl_xp - cur_lvl_xp,
    }

# ---------- Session/auth ----------
async def get_current_user(request: Request) -> Optional[dict]:
    token = request.cookies.get("session_token")
    if not token:
        auth_header = request.headers.get("authorization") or request.headers.get("Authorization")
        if auth_header and auth_header.lower().startswith("bearer "):
            token = auth_header.split(" ", 1)[1].strip()
    if not token:
        return None
    session_doc = await db.user_sessions.find_one({"session_token": token}, {"_id": 0})
    if not session_doc:
        return None
    expires_at = session_doc.get("expires_at")
    if isinstance(expires_at, str):
        expires_at = datetime.fromisoformat(expires_at)
    if expires_at and expires_at.tzinfo is None:
        expires_at = expires_at.replace(tzinfo=timezone.utc)
    if expires_at and expires_at < now_utc():
        await db.user_sessions.delete_one({"session_token": token})
        return None
    return await db.users.find_one({"user_id": session_doc["user_id"]}, {"_id": 0})

def set_session_cookie(response: Response, session_token: str):
    max_age = SESSION_TTL_DAYS * 24 * 60 * 60
    response.set_cookie(
        key="session_token", value=session_token,
        max_age=max_age, expires=max_age, path="/",
        httponly=True, secure=True, samesite="none",
    )

async def create_session_for_user(user_id: str) -> str:
    session_token = secrets.token_urlsafe(48)
    await db.user_sessions.insert_one({
        "user_id": user_id, "session_token": session_token,
        "expires_at": now_utc() + timedelta(days=SESSION_TTL_DAYS),
        "created_at": now_utc(),
    })
    return session_token

async def require_user(request: Request) -> dict:
    u = await get_current_user(request)
    if not u:
        raise HTTPException(status_code=401, detail="Not authenticated")
    return u

# ---------- Models ----------
class SignupBody(BaseModel):
    model_config = ConfigDict(str_strip_whitespace=True)
    email: EmailStr
    password: str = Field(min_length=8, max_length=200)
    name: str = Field(min_length=1, max_length=120)

class LoginBody(BaseModel):
    model_config = ConfigDict(str_strip_whitespace=True)
    email: EmailStr
    password: str = Field(min_length=1, max_length=200)

class PasswordResetRequestBody(BaseModel):
    model_config = ConfigDict(str_strip_whitespace=True)
    email: EmailStr

class PasswordResetConfirmBody(BaseModel):
    model_config = ConfigDict(str_strip_whitespace=True)
    token: str = Field(min_length=8, max_length=200)
    new_password: str = Field(min_length=8, max_length=200)

class ClientErrorBody(BaseModel):
    model_config = ConfigDict(str_strip_whitespace=True)
    message: str = Field(min_length=1, max_length=2000)
    stack: Optional[str] = Field(default=None, max_length=8000)
    url: Optional[str] = Field(default=None, max_length=500)
    user_agent: Optional[str] = Field(default=None, max_length=500)

class AccountDeleteRequest(BaseModel):
    """Confirmation body required to delete an account.

    The literal string forces the client to send the exact phrase, and the
    resulting OpenAPI schema advertises the guard to API consumers.
    """
    confirm: Literal["DELETE MY ACCOUNT"]

class OnboardingBody(BaseModel):
    journey_level: str
    daily_goal_minutes: int = Field(ge=15, le=720)
    subjects: List[str] = []
    fit_score: Optional[int] = None
    onboarded: bool = True
    city: Optional[str] = Field(default=None, max_length=80)

class FocusStart(BaseModel):
    subject: str = Field(min_length=1, max_length=80)
    planned_minutes: int = Field(ge=1, le=180)
    ambient_track: Optional[str] = None

class FocusIdBody(BaseModel):
    session_id: str

# ---------- Health ----------
@api_router.get("/")
async def root():
    return {"message": "The CA Grid API"}

# ---------- Auth ----------
@api_router.post("/auth/signup")
@limiter.limit("5/minute")
async def auth_signup(body: SignupBody, request: Request, response: Response):
    err = validate_password_strength(body.password)
    if err:
        raise HTTPException(status_code=400, detail=err)
    existing = await db.users.find_one({"email": body.email.lower()}, {"_id": 0})
    if existing:
        raise HTTPException(status_code=400, detail="Email already registered")
    user_id = new_user_id()
    doc = {
        "user_id": user_id, "email": body.email.lower(), "name": body.name.strip(),
        "picture": None, "auth_provider": "email",
        "password_hash": hash_password(body.password),
        "journey_level": None, "daily_goal_minutes": 180,
        "subjects": [], "fit_score": None, "onboarded": False,
        "created_at": now_utc(),
    }
    await db.users.insert_one(doc)
    await init_user_stats(user_id, unlock_founder=True)
    # Session rotation: signup is a fresh account, no prior sessions to purge
    token = await create_session_for_user(user_id)
    set_session_cookie(response, token)
    log_event("auth.signup.ok", user_id=user_id, email=doc["email"], ip=_client_ip(request))
    return {"user": sanitize_user(doc), "session_token": token}

@api_router.post("/auth/login")
@limiter.limit("5/minute")
async def auth_login(body: LoginBody, request: Request, response: Response):
    user = await db.users.find_one({"email": body.email.lower()}, {"_id": 0})
    if not user or not user.get("password_hash"):
        log_event("auth.login.fail", email=body.email.lower(), reason="no_user", ip=_client_ip(request))
        raise HTTPException(status_code=401, detail="Invalid credentials")
    if not verify_password(body.password, user["password_hash"]):
        log_event("auth.login.fail", email=body.email.lower(), reason="bad_password", ip=_client_ip(request))
        raise HTTPException(status_code=401, detail="Invalid credentials")
    # Session rotation: invalidate all existing sessions for this user
    await db.user_sessions.delete_many({"user_id": user["user_id"]})
    token = await create_session_for_user(user["user_id"])
    set_session_cookie(response, token)
    log_event("auth.login.ok", user_id=user["user_id"], email=user["email"], ip=_client_ip(request))
    return {"user": sanitize_user(user), "session_token": token}

def _client_ip(request: Request) -> str:
    xff = request.headers.get("x-forwarded-for")
    if xff:
        return xff.split(",")[0].strip()
    return request.client.host if request.client else "unknown"

@api_router.post("/auth/google/session")
async def auth_google_session(request: Request, response: Response, x_session_id: Optional[str] = Header(None, alias="X-Session-ID")):
    if not x_session_id:
        raise HTTPException(status_code=400, detail="Missing X-Session-ID header")
    async with httpx.AsyncClient(timeout=15.0) as hc:
        r = await hc.get(EMERGENT_SESSION_URL, headers={"X-Session-ID": x_session_id})
    if r.status_code != 200:
        raise HTTPException(status_code=401, detail="Invalid session_id")
    data = r.json()
    email = (data.get("email") or "").lower()
    name = data.get("name") or email.split("@")[0]
    picture = data.get("picture")
    session_token = data.get("session_token") or secrets.token_urlsafe(48)
    if not email:
        raise HTTPException(status_code=400, detail="Emergent did not return email")
    existing = await db.users.find_one({"email": email}, {"_id": 0})
    if existing:
        user_id = existing["user_id"]
        await db.users.update_one({"user_id": user_id}, {"$set": {"name": name, "picture": picture}})
        user_doc = await db.users.find_one({"user_id": user_id}, {"_id": 0})
    else:
        user_id = new_user_id()
        user_doc = {
            "user_id": user_id, "email": email, "name": name, "picture": picture,
            "auth_provider": "google", "password_hash": None,
            "journey_level": None, "daily_goal_minutes": 180,
            "subjects": [], "fit_score": None, "onboarded": False,
            "created_at": now_utc(),
        }
        await db.users.insert_one(user_doc)
        await init_user_stats(user_id, unlock_founder=True)
    await db.user_sessions.update_one(
        {"session_token": session_token},
        {"$set": {"user_id": user_id, "session_token": session_token,
                  "expires_at": now_utc() + timedelta(days=SESSION_TTL_DAYS),
                  "created_at": now_utc()}},
        upsert=True,
    )
    set_session_cookie(response, session_token)
    return {"user": sanitize_user(user_doc), "session_token": session_token}

@api_router.get("/auth/me")
async def auth_me(request: Request):
    user = await get_current_user(request)
    if not user:
        raise HTTPException(status_code=401, detail="Not authenticated")
    return sanitize_user(user)

@api_router.post("/auth/logout")
async def auth_logout(request: Request, response: Response):
    token = request.cookies.get("session_token")
    if not token:
        auth_header = request.headers.get("authorization") or ""
        if auth_header.lower().startswith("bearer "):
            token = auth_header.split(" ", 1)[1].strip()
    uid = None
    if token:
        sess = await db.user_sessions.find_one({"session_token": token}, {"_id": 0, "user_id": 1})
        uid = sess.get("user_id") if sess else None
        await db.user_sessions.delete_one({"session_token": token})
    response.delete_cookie("session_token", path="/", samesite="none", secure=True)
    log_event("auth.logout", user_id=uid, ip=_client_ip(request))
    return {"ok": True}


# ---------- Password reset (stdout-delivered link) ----------
@api_router.post("/auth/password-reset/request")
@limiter.limit("5/minute")
async def auth_password_reset_request(body: PasswordResetRequestBody, request: Request):
    email = body.email.lower()
    user = await db.users.find_one({"email": email}, {"_id": 0})
    # Always return 200 to avoid email enumeration
    if user and user.get("auth_provider") == "email":
        token = secrets.token_urlsafe(32)
        expires = now_utc() + timedelta(minutes=60)
        await db.password_reset_tokens.insert_one({
            "token": token, "user_id": user["user_id"], "email": email,
            "expires_at": expires, "used": False, "created_at": now_utc(),
        })
        origin = request.headers.get("origin") or request.headers.get("referer") or ""
        origin = origin.rstrip("/")
        link = f"{origin}/reset-password?token={token}"
        # TODO: Phase 4 — wire SendGrid or Amazon SES here.
        logger.info(f"[PASSWORD RESET] email={email} link={link}")
        log_event("password.reset.request", user_id=user["user_id"], email=email, ip=_client_ip(request))
    else:
        log_event("password.reset.request.miss", email=email, ip=_client_ip(request))
    return {"ok": True, "message": "If that email exists, a reset link has been sent."}


@api_router.post("/auth/password-reset/confirm")
@limiter.limit("5/minute")
async def auth_password_reset_confirm(body: PasswordResetConfirmBody, request: Request, response: Response):
    err = validate_password_strength(body.new_password)
    if err:
        raise HTTPException(status_code=400, detail=err)
    doc = await db.password_reset_tokens.find_one({"token": body.token}, {"_id": 0})
    if not doc or doc.get("used"):
        raise HTTPException(status_code=400, detail="Invalid or expired token")
    expires = doc.get("expires_at")
    if isinstance(expires, str):
        expires = datetime.fromisoformat(expires)
    if expires and expires.tzinfo is None:
        expires = expires.replace(tzinfo=timezone.utc)
    if expires and expires < now_utc():
        raise HTTPException(status_code=400, detail="Invalid or expired token")
    user_id = doc["user_id"]
    await db.users.update_one({"user_id": user_id}, {"$set": {"password_hash": hash_password(body.new_password)}})
    await db.password_reset_tokens.update_one({"token": body.token}, {"$set": {"used": True, "used_at": now_utc()}})
    # Session rotation: kill all existing sessions after reset
    await db.user_sessions.delete_many({"user_id": user_id})
    # Auto-login user via new session
    token = await create_session_for_user(user_id)
    set_session_cookie(response, token)
    log_event("password.reset.confirm", user_id=user_id, ip=_client_ip(request))
    return {"ok": True}

@api_router.post("/onboarding")
async def save_onboarding(body: OnboardingBody, request: Request):
    user = await require_user(request)
    update = {
        "journey_level": body.journey_level,
        "daily_goal_minutes": body.daily_goal_minutes,
        "subjects": body.subjects,
        "fit_score": body.fit_score,
        "onboarded": body.onboarded,
    }
    if body.city is not None:
        city = body.city.strip()
        if city:
            update["city"] = city[:60]
    await db.users.update_one({"user_id": user["user_id"]}, {"$set": update})
    updated = await db.users.find_one({"user_id": user["user_id"]}, {"_id": 0})
    return sanitize_user(updated)

@api_router.get("/syllabus")
async def get_syllabus(level: Optional[str] = None):
    q = {"level": level} if level else {}
    return await db.syllabus.find(q, {"_id": 0}).to_list(200)


# ============================================================
# PHASE 4 — Syllabus Tracker, Regulatory Radar, Content Hub
# ============================================================

class SyllabusProgressBody(BaseModel):
    model_config = ConfigDict(str_strip_whitespace=True)
    paper_code: str = Field(min_length=1, max_length=8)
    chapter_id: str = Field(min_length=1, max_length=32)
    status: Literal["not_started", "in_progress", "revised", "mastered"]
    notes: Optional[str] = Field(default=None, max_length=500)


def _paper_aggregate(paper: dict, progress_by_chap: dict) -> dict:
    chapters = paper.get("chapters", []) or []
    total = len(chapters)
    mastered = sum(1 for c in chapters if progress_by_chap.get(c["chapter_id"], {}).get("status") == "mastered")
    revised = sum(1 for c in chapters if progress_by_chap.get(c["chapter_id"], {}).get("status") == "revised")
    in_prog = sum(1 for c in chapters if progress_by_chap.get(c["chapter_id"], {}).get("status") == "in_progress")
    hrs_remaining = sum(
        c.get("estimated_hours", 0)
        for c in chapters
        if progress_by_chap.get(c["chapter_id"], {}).get("status") not in ("mastered",)
    )
    # completion pct: mastered=1.0, revised=0.75, in_progress=0.4
    weighted = mastered + 0.75 * revised + 0.4 * in_prog
    pct = round((weighted / total) * 100, 1) if total else 0
    return {
        "paper_code": paper["paper_code"],
        "paper_name": paper["paper_name"],
        "level": paper.get("level"),
        "chapters_total": total,
        "chapters_mastered": mastered,
        "chapters_revised": revised,
        "chapters_in_progress": in_prog,
        "completion_pct": pct,
        "estimated_hours_remaining": hrs_remaining,
    }


@api_router.get("/syllabus/progress")
async def get_syllabus_progress(request: Request, level: Optional[str] = None):
    user = await require_user(request)
    lvl = level or user.get("journey_level")
    if lvl == "all":
        lvl = None
    q = {"level": lvl} if lvl else {}
    papers = await db.syllabus.find(q, {"_id": 0}).to_list(50)
    prog_rows = await db.user_syllabus_progress.find(
        {"user_id": user["user_id"]}, {"_id": 0}
    ).to_list(2000)
    prog_by_chap = {p["chapter_id"]: p for p in prog_rows}
    return [_paper_aggregate(p, prog_by_chap) for p in papers]


@api_router.get("/syllabus/{paper_code}")
async def get_syllabus_paper(paper_code: str, request: Request):
    paper = await db.syllabus.find_one({"paper_code": paper_code}, {"_id": 0})
    if not paper:
        raise HTTPException(status_code=404, detail="Paper not found")
    user = await get_current_user(request)
    prog_by_chap: dict = {}
    if user:
        rows = await db.user_syllabus_progress.find(
            {"user_id": user["user_id"], "paper_code": paper_code}, {"_id": 0}
        ).to_list(500)
        prog_by_chap = {r["chapter_id"]: r for r in rows}
    # decorate chapters
    chapters_out = []
    for c in paper.get("chapters", []):
        p = prog_by_chap.get(c["chapter_id"])
        chapters_out.append({
            **c,
            "status": (p or {}).get("status", "not_started"),
            "notes": (p or {}).get("notes"),
            "revised_count": (p or {}).get("revised_count", 0),
            "updated_at": (p or {}).get("updated_at"),
        })
    return {
        **{k: v for k, v in paper.items() if k != "chapters"},
        "chapters": chapters_out,
        "aggregate": _paper_aggregate(paper, prog_by_chap),
    }


@api_router.post("/syllabus/progress")
async def post_syllabus_progress(body: SyllabusProgressBody, request: Request):
    user = await require_user(request)
    paper = await db.syllabus.find_one({"paper_code": body.paper_code}, {"_id": 0})
    if not paper:
        raise HTTPException(status_code=404, detail="Paper not found")
    chap = next((c for c in paper.get("chapters", []) if c["chapter_id"] == body.chapter_id), None)
    if not chap:
        raise HTTPException(status_code=404, detail="Chapter not found")
    existing = await db.user_syllabus_progress.find_one(
        {"user_id": user["user_id"], "chapter_id": body.chapter_id}, {"_id": 0}
    )
    revised_count = (existing or {}).get("revised_count", 0)
    if body.status == "revised" and (existing or {}).get("status") != "revised":
        revised_count += 1
    doc = {
        "user_id": user["user_id"],
        "paper_code": body.paper_code,
        "chapter_id": body.chapter_id,
        "status": body.status,
        "notes": body.notes if body.notes is not None else (existing or {}).get("notes"),
        "revised_count": revised_count,
        "updated_at": now_utc(),
    }
    await db.user_syllabus_progress.update_one(
        {"user_id": user["user_id"], "chapter_id": body.chapter_id},
        {"$set": doc},
        upsert=True,
    )
    # Compute updated paper aggregate
    rows = await db.user_syllabus_progress.find(
        {"user_id": user["user_id"], "paper_code": body.paper_code}, {"_id": 0}
    ).to_list(500)
    prog_by_chap = {r["chapter_id"]: r for r in rows}
    return {"record": doc, "paper": _paper_aggregate(paper, prog_by_chap)}


# ---------- REGULATORY RADAR ----------

def _resolve_alert_chapters(alert: dict, papers_by_code: dict) -> dict:
    """Convert affected_topics chapter_numbers → chapter_ids + chapter names."""
    resolved = []
    for t in alert.get("affected_topics", []) or []:
        pcode = t.get("paper_code")
        paper = papers_by_code.get(pcode)
        if not paper:
            continue
        chap_nums = t.get("chapter_numbers", []) or []
        chapters = []
        for c in paper.get("chapters", []):
            if not chap_nums or c["number"] in chap_nums:
                chapters.append({
                    "chapter_id": c["chapter_id"],
                    "number": c["number"],
                    "name": c["name"],
                })
        resolved.append({
            "paper_code": pcode,
            "paper_name": paper.get("paper_name"),
            "chapters": chapters,
        })
    return {**alert, "affected_topics": resolved}


IMPACT_ORDER = {"info": 0, "moderate": 1, "critical": 2}


@api_router.get("/radar/alerts")
async def radar_alerts(
    request: Request,
    level: Optional[str] = None,
    impact: Optional[str] = None,
    days: Optional[int] = None,
    limit: int = 50,
):
    user = await get_current_user(request)
    q: dict = {}
    if not level and user:
        level = user.get("journey_level")
    if level and level != "all":
        q["affected_levels"] = level
    if impact and impact in IMPACT_ORDER:
        min_imp = IMPACT_ORDER[impact]
        q["impact_level"] = {"$in": [k for k, v in IMPACT_ORDER.items() if v >= min_imp]}
    if days and days > 0:
        cutoff = now_utc() - timedelta(days=days)
        q["published_at"] = {"$gte": cutoff}
    alerts = await db.regulatory_alerts.find(q, {"_id": 0}).sort("published_at", -1).limit(min(limit, 200)).to_list(200)
    # Filter dismissed
    dismissed_ids = set()
    if user:
        dr = await db.user_dismissed_alerts.find({"user_id": user["user_id"]}, {"_id": 0}).to_list(1000)
        dismissed_ids = {d["alert_id"] for d in dr}
    # Resolve chapters
    papers = await db.syllabus.find({}, {"_id": 0}).to_list(50)
    pmap = {p["paper_code"]: p for p in papers}
    out = []
    for a in alerts:
        if a["alert_id"] in dismissed_ids:
            continue
        out.append(_resolve_alert_chapters(a, pmap))
    return {"items": out, "count": len(out)}


@api_router.get("/radar/alerts/{alert_id}")
async def radar_alert_detail(alert_id: str, request: Request):
    alert = await db.regulatory_alerts.find_one({"alert_id": alert_id}, {"_id": 0})
    if not alert:
        raise HTTPException(status_code=404, detail="Alert not found")
    papers = await db.syllabus.find({}, {"_id": 0}).to_list(50)
    pmap = {p["paper_code"]: p for p in papers}
    return _resolve_alert_chapters(alert, pmap)


@api_router.post("/radar/alerts/{alert_id}/dismiss")
async def radar_alert_dismiss(alert_id: str, request: Request):
    user = await require_user(request)
    alert = await db.regulatory_alerts.find_one({"alert_id": alert_id}, {"_id": 0})
    if not alert:
        raise HTTPException(status_code=404, detail="Alert not found")
    await db.user_dismissed_alerts.update_one(
        {"user_id": user["user_id"], "alert_id": alert_id},
        {"$set": {"dismissed_at": now_utc()}},
        upsert=True,
    )
    # Invalidate this user's summary cache so the next call is fresh
    _RADAR_SUMMARY_CACHE.pop(user["user_id"], None)
    return {"ok": True}


# 60s in-memory cache for radar/summary
_RADAR_SUMMARY_CACHE: dict = {}


@api_router.get("/radar/summary")
async def radar_summary(request: Request):
    user = await get_current_user(request)
    cache_key = user["user_id"] if user else "anon"
    cached = _RADAR_SUMMARY_CACHE.get(cache_key)
    if cached and (now_utc() - cached["at"]).total_seconds() < 60:
        return cached["data"]
    level = user.get("journey_level") if user else None
    q: dict = {}
    if level:
        q["affected_levels"] = level
    all_alerts = await db.regulatory_alerts.find(q, {"_id": 0}).sort("published_at", -1).to_list(500)
    dismissed = set()
    if user:
        dr = await db.user_dismissed_alerts.find({"user_id": user["user_id"]}, {"_id": 0}).to_list(1000)
        dismissed = {d["alert_id"] for d in dr}
    cutoff_7d = now_utc() - timedelta(days=7)
    critical_7d = [a for a in all_alerts if a.get("impact_level") == "critical" and a.get("published_at") and (a["published_at"].replace(tzinfo=timezone.utc) if a["published_at"].tzinfo is None else a["published_at"]) >= cutoff_7d]
    undismissed = [a for a in all_alerts if a["alert_id"] not in dismissed]
    latest3 = undismissed[:3]
    # slim latest3 for card display
    slim = [{
        "alert_id": a["alert_id"], "title": a["title"], "impact_level": a["impact_level"],
        "source": a["source"], "published_at": a["published_at"],
    } for a in latest3]
    data = {
        "unread_count": len(undismissed),
        "critical_count_7d": len([a for a in critical_7d if a["alert_id"] not in dismissed]),
        "latest_3_alerts": slim,
    }
    _RADAR_SUMMARY_CACHE[cache_key] = {"at": now_utc(), "data": data}
    return data


# ---------- CONTENT HUB ----------

@api_router.get("/content/posts")
async def content_posts(request: Request, level: Optional[str] = None, tag: Optional[str] = None, limit: int = 30):
    user = await get_current_user(request)
    q_and = []
    lvl = level or (user.get("journey_level") if user else None)
    if lvl and lvl != "all":
        # Match level in either level_filter OR tags (belt & suspenders)
        q_and.append({"$or": [{"level_filter": lvl}, {"tags": lvl}]})
    if tag:
        # Match tag in either tags OR level_filter (so ?tag=Foundation returns Foundation-level posts too)
        q_and.append({"$or": [{"tags": tag}, {"level_filter": tag}]})
    q = {"$and": q_and} if q_and else {}
    posts = await db.content_posts.find(q, {"_id": 0, "body_markdown": 0}).sort("published_at", -1).limit(min(limit, 100)).to_list(100)
    return {"items": posts, "count": len(posts)}


@api_router.get("/content/posts/{slug}")
async def content_post_detail(slug: str):
    post = await db.content_posts.find_one({"slug": slug}, {"_id": 0})
    if not post:
        raise HTTPException(status_code=404, detail="Post not found")
    # Related posts by shared tags
    related_q = {"slug": {"$ne": slug}, "tags": {"$in": post.get("tags", [])}}
    related = await db.content_posts.find(related_q, {"_id": 0, "body_markdown": 0}).limit(3).to_list(3)
    return {"post": post, "related": related}


_CONTENT_DIGEST_CACHE: dict = {}


@api_router.get("/content/digest")
async def content_digest(request: Request):
    user = await get_current_user(request)
    cache_key = user["user_id"] if user else "anon"
    cached = _CONTENT_DIGEST_CACHE.get(cache_key)
    if cached and (now_utc() - cached["at"]).total_seconds() < 300:
        return cached["data"]
    lvl = user.get("journey_level") if user else None
    q: dict = {}
    if lvl and lvl != "all":
        q["level_filter"] = lvl
    posts = await db.content_posts.find(q, {"_id": 0, "body_markdown": 0}).sort("published_at", -1).to_list(50)
    if not posts:
        posts = await db.content_posts.find({}, {"_id": 0, "body_markdown": 0}).sort("published_at", -1).to_list(10)
    today_pick = posts[0] if posts else None
    this_week = posts[1:4]
    data = {"today_pick": today_pick, "this_week": this_week}
    _CONTENT_DIGEST_CACHE[cache_key] = {"at": now_utc(), "data": data}
    return data


# ---------- WEEKLY RECAP ----------

@api_router.get("/recap/weekly")
async def recap_weekly(request: Request):
    user = await require_user(request)
    uid = user["user_id"]
    now = now_utc()
    week_start = now - timedelta(days=7)
    prev_week_start = now - timedelta(days=14)

    # Focus minutes this week
    focus_this = await db.focus_sessions.find(
        {"user_id": uid, "status": "completed", "started_at": {"$gte": week_start}}, {"_id": 0}
    ).to_list(500)
    focus_prev = await db.focus_sessions.find(
        {"user_id": uid, "status": "completed", "started_at": {"$gte": prev_week_start, "$lt": week_start}}, {"_id": 0}
    ).to_list(500)

    def _sum_min(rows):
        return sum(r.get("actual_duration_seconds", 0) for r in rows) // 60

    focus_minutes = _sum_min(focus_this)
    focus_minutes_prev = _sum_min(focus_prev)
    delta_pct = 0
    if focus_minutes_prev > 0:
        delta_pct = round(((focus_minutes - focus_minutes_prev) / focus_minutes_prev) * 100)
    elif focus_minutes > 0:
        delta_pct = 100

    # Top subject
    subj_min: dict = {}
    for r in focus_this:
        s = r.get("subject") or "General"
        subj_min[s] = subj_min.get(s, 0) + r.get("actual_duration_seconds", 0)
    top_subject = max(subj_min.items(), key=lambda x: x[1])[0] if subj_min else None

    # Stats
    stats = await db.user_stats.find_one({"user_id": uid}, {"_id": 0}) or {}
    streak_current = stats.get("current_streak", 0)

    # Chapters completed (moved to mastered) this week
    chap_rows = await db.user_syllabus_progress.find(
        {"user_id": uid, "status": "mastered", "updated_at": {"$gte": week_start}}, {"_id": 0}
    ).to_list(500)
    chapters_completed = len(chap_rows)

    # Mentor asks
    mentor_asks = await db.mentor_messages.count_documents(
        {"user_id": uid, "role": "user", "created_at": {"$gte": week_start}}
    )

    # Badges earned this week
    badges = await db.user_achievements.find(
        {"user_id": uid, "unlocked_at": {"$gte": week_start}}, {"_id": 0}
    ).to_list(200)
    badges_earned = [b.get("badge_id") for b in badges]

    # Regulatory unread critical
    critical_unread = 0
    lvl = user.get("journey_level")
    if lvl:
        crit_q: dict = {"impact_level": "critical", "affected_levels": lvl}
        crits = await db.regulatory_alerts.find(crit_q, {"_id": 0, "alert_id": 1}).to_list(200)
        dismissed = set()
        dr = await db.user_dismissed_alerts.find({"user_id": uid}, {"_id": 0}).to_list(1000)
        dismissed = {d["alert_id"] for d in dr}
        critical_unread = sum(1 for a in crits if a["alert_id"] not in dismissed)

    # Next-week focus suggestions — first 2 not_started high-weight chapters
    next_focus = []
    papers = await db.syllabus.find({"level": lvl}, {"_id": 0}).to_list(20) if lvl else []
    prog_rows = await db.user_syllabus_progress.find({"user_id": uid}, {"_id": 0}).to_list(2000)
    started_ids = {p["chapter_id"] for p in prog_rows if p.get("status") != "not_started"}
    candidates = []
    for p in papers:
        for c in p.get("chapters", []):
            if c["chapter_id"] not in started_ids:
                candidates.append((c.get("weightage_pct", 0), f"{p['paper_code']} — {c['name']}"))
    candidates.sort(reverse=True)
    next_focus = [c[1] for c in candidates[:2]]

    return {
        "week_of": week_start.date().isoformat(),
        "focus_minutes": focus_minutes,
        "focus_minutes_delta_pct": delta_pct,
        "sessions_completed": len(focus_this),
        "streak_current": streak_current,
        "top_subject": top_subject,
        "chapters_completed": chapters_completed,
        "mentor_asks": mentor_asks,
        "badges_earned": badges_earned,
        "regulatory_critical_unread": critical_unread,
        "next_week_focus": next_focus,
    }


# ============================================================
# PHASE 5 — Assessment Engine (Mocks + Flashcards + SM-2)
# ============================================================

class MockAnswerBody(BaseModel):
    model_config = ConfigDict(str_strip_whitespace=True)
    question_id: str = Field(min_length=1, max_length=32)
    selected_option: Optional[str] = Field(default=None, max_length=4)
    subjective_text: Optional[str] = Field(default=None, max_length=8000)
    time_spent_seconds: int = Field(ge=0, le=100000)


class FlashcardReviewBody(BaseModel):
    model_config = ConfigDict()
    card_id: str = Field(min_length=1, max_length=32)
    grade: int = Field(ge=0, le=3)
    time_spent_seconds: int = Field(ge=0, le=100000)


def _strip_question_for_attempt(q: dict) -> dict:
    """Remove correct_option and explanation from question for in-progress attempts."""
    return {k: v for k, v in q.items() if k not in ("correct_option", "explanation_markdown", "model_answer_markdown")}


@api_router.get("/mocks")
async def mocks_list(request: Request, paper: Optional[str] = None):
    user = await require_user(request)
    q: dict = {}
    if paper:
        q["paper_code"] = paper
    mocks = await db.mock_tests.find(q, {"_id": 0}).to_list(200)
    # Enrich with user's best score
    out = []
    for m in mocks:
        attempts = await db.mock_attempts.find(
            {"user_id": user["user_id"], "mock_id": m["mock_id"], "status": "submitted"},
            {"_id": 0, "score": 1}
        ).to_list(200)
        best = max([a.get("score") or 0 for a in attempts], default=None)
        out.append({
            "mock_id": m["mock_id"], "paper_code": m["paper_code"], "title": m["title"],
            "duration_minutes": m["duration_minutes"], "total_marks": m["total_marks"],
            "question_count": len(m.get("question_ids", [])),
            "difficulty_profile": m.get("difficulty_profile", "balanced"),
            "attempts_count": len(attempts),
            "best_score": best,
        })
    return {"items": out, "count": len(out)}


@api_router.post("/mocks/{mock_id}/start")
async def mock_start(mock_id: str, request: Request):
    user = await require_user(request)
    mock = await db.mock_tests.find_one({"mock_id": mock_id}, {"_id": 0})
    if not mock:
        raise HTTPException(status_code=404, detail="Mock not found")
    # If in-progress attempt exists, return it
    existing = await db.mock_attempts.find_one(
        {"user_id": user["user_id"], "mock_id": mock_id, "status": "in_progress"}, {"_id": 0}
    )
    if existing:
        attempt_id = existing["attempt_id"]
    else:
        attempt_id = f"att_{uuid.uuid4().hex[:14]}"
        await db.mock_attempts.insert_one({
            "attempt_id": attempt_id,
            "user_id": user["user_id"],
            "mock_id": mock_id,
            "paper_code": mock["paper_code"],
            "started_at": now_utc(),
            "submitted_at": None,
            "status": "in_progress",
            "time_taken_seconds": 0,
            "score": None, "marks_obtained": None,
            "total_marks": mock["total_marks"],
            "percentile_estimate": None,
            "weak_topics": [], "strong_topics": [],
        })
    # Fetch questions in order
    q_ids = mock.get("question_ids", [])
    docs = await db.question_bank.find({"question_id": {"$in": q_ids}}, {"_id": 0}).to_list(500)
    docs_by_id = {d["question_id"]: d for d in docs}
    questions = [_strip_question_for_attempt(docs_by_id[qid]) for qid in q_ids if qid in docs_by_id]
    return {
        "attempt_id": attempt_id,
        "mock_id": mock_id, "title": mock["title"],
        "started_at": (existing or {}).get("started_at") or now_utc(),
        "duration_minutes": mock["duration_minutes"],
        "total_marks": mock["total_marks"],
        "questions": questions,
    }


async def _get_attempt_owned(attempt_id: str, user_id: str, allow_submitted: bool = False):
    att = await db.mock_attempts.find_one({"attempt_id": attempt_id, "user_id": user_id}, {"_id": 0})
    if not att:
        raise HTTPException(status_code=404, detail="Attempt not found")
    if not allow_submitted and att["status"] != "in_progress":
        raise HTTPException(status_code=400, detail="Attempt already submitted")
    return att


@api_router.post("/mocks/attempts/{attempt_id}/answer")
async def mock_answer(attempt_id: str, body: MockAnswerBody, request: Request):
    user = await require_user(request)
    await _get_attempt_owned(attempt_id, user["user_id"])
    doc = {
        "attempt_id": attempt_id,
        "question_id": body.question_id,
        "selected_option": body.selected_option,
        "subjective_text": body.subjective_text,
        "time_spent_seconds": body.time_spent_seconds,
        "updated_at": now_utc(),
    }
    await db.mock_answers.update_one(
        {"attempt_id": attempt_id, "question_id": body.question_id},
        {"$set": doc},
        upsert=True,
    )
    return {"saved": True}


@api_router.post("/mocks/attempts/{attempt_id}/submit")
@limiter.limit("10/minute")
async def mock_submit(attempt_id: str, request: Request):
    user = await require_user(request)
    att = await _get_attempt_owned(attempt_id, user["user_id"])
    mock = await db.mock_tests.find_one({"mock_id": att["mock_id"]}, {"_id": 0})
    if not mock:
        raise HTTPException(status_code=404, detail="Mock definition missing")
    q_ids = mock.get("question_ids", [])
    docs = await db.question_bank.find({"question_id": {"$in": q_ids}}, {"_id": 0}).to_list(500)
    q_by_id = {d["question_id"]: d for d in docs}
    ans_docs = await db.mock_answers.find({"attempt_id": attempt_id}, {"_id": 0}).to_list(500)
    ans_by_qid = {a["question_id"]: a for a in ans_docs}

    marks_obtained = 0.0
    total_marks = 0
    topic_totals: dict = {}
    topic_correct: dict = {}
    for qid in q_ids:
        q = q_by_id.get(qid)
        if not q:
            continue
        total_marks += q.get("marks", 2)
        ans = ans_by_qid.get(qid)
        awarded = 0.0
        is_correct = None
        auto_graded = False
        if not ans:
            marks_awarded = 0.0
        elif q["type"] == "mcq":
            if ans.get("selected_option") is None:
                marks_awarded = 0.0
            elif ans["selected_option"] == q.get("correct_option"):
                marks_awarded = float(q.get("marks", 2))
                is_correct = True
            else:
                marks_awarded = -float(q.get("negative_marks", 0) or 0)
                is_correct = False
        else:  # subjective / case_study — auto-grade at 60% as placeholder
            if ans.get("subjective_text"):
                marks_awarded = 0.6 * float(q.get("marks", 5))
                auto_graded = True
                is_correct = None
            else:
                marks_awarded = 0.0
        marks_obtained += marks_awarded
        # Update answer with grading
        await db.mock_answers.update_one(
            {"attempt_id": attempt_id, "question_id": qid},
            {"$set": {"is_correct": is_correct, "marks_awarded": marks_awarded, "auto_graded": auto_graded}},
            upsert=True,
        )
        # Topic aggregation
        for tag in q.get("topic_tags", []) or []:
            topic_totals[tag] = topic_totals.get(tag, 0) + 1
            if is_correct:
                topic_correct[tag] = topic_correct.get(tag, 0) + 1

    weak_topics = [t for t, tot in topic_totals.items() if (topic_correct.get(t, 0) / tot) < 0.5]
    strong_topics = [t for t, tot in topic_totals.items() if (topic_correct.get(t, 0) / tot) >= 0.8]

    score = round(max(0.0, marks_obtained) / total_marks * 100, 1) if total_marks > 0 else 0.0
    # Percentile — rank vs other submitted attempts on this mock
    all_scores = await db.mock_attempts.find(
        {"mock_id": att["mock_id"], "status": "submitted"}, {"_id": 0, "score": 1}
    ).to_list(2000)
    scores = [s.get("score") or 0 for s in all_scores]
    rank_below = sum(1 for s in scores if s < score)
    percentile = round(rank_below / max(1, len(scores) + 1) * 100)
    time_taken = int((now_utc() - att["started_at"].replace(tzinfo=timezone.utc) if att["started_at"].tzinfo is None else now_utc() - att["started_at"]).total_seconds())

    await db.mock_attempts.update_one(
        {"attempt_id": attempt_id},
        {"$set": {
            "status": "submitted", "submitted_at": now_utc(),
            "marks_obtained": round(marks_obtained, 2),
            "total_marks": total_marks,
            "score": score,
            "time_taken_seconds": time_taken,
            "percentile_estimate": percentile,
            "weak_topics": weak_topics, "strong_topics": strong_topics,
        }},
    )
    # XP awards
    xp = 50
    if score >= 70: xp += 50
    if score >= 85: xp += 50
    await db.user_stats.update_one(
        {"user_id": user["user_id"]},
        {"$inc": {"total_xp": xp}}, upsert=True,
    )
    return {
        "attempt_id": attempt_id, "score": score,
        "marks_obtained": round(marks_obtained, 2), "total_marks": total_marks,
        "percentile_estimate": percentile,
        "weak_topics": weak_topics, "strong_topics": strong_topics,
        "xp_awarded": xp,
    }


@api_router.get("/mocks/attempts/history")
async def mocks_attempts_history(request: Request, limit: int = 20):
    user = await require_user(request)
    rows = await db.mock_attempts.find(
        {"user_id": user["user_id"]}, {"_id": 0}
    ).sort("started_at", -1).limit(min(limit, 100)).to_list(100)
    return {"items": rows, "count": len(rows)}


@api_router.get("/mocks/attempts/{attempt_id}")
async def mock_attempt_detail(attempt_id: str, request: Request):
    user = await require_user(request)
    att = await _get_attempt_owned(attempt_id, user["user_id"], allow_submitted=True)
    mock = await db.mock_tests.find_one({"mock_id": att["mock_id"]}, {"_id": 0})
    q_ids = mock.get("question_ids", []) if mock else []
    docs = await db.question_bank.find({"question_id": {"$in": q_ids}}, {"_id": 0}).to_list(500)
    q_by_id = {d["question_id"]: d for d in docs}
    ans_docs = await db.mock_answers.find({"attempt_id": attempt_id}, {"_id": 0}).to_list(500)
    ans_by_qid = {a["question_id"]: a for a in ans_docs}
    is_submitted = att["status"] == "submitted"
    questions_out = []
    for qid in q_ids:
        q = q_by_id.get(qid)
        if not q:
            continue
        item = _strip_question_for_attempt(q) if not is_submitted else q
        item["user_answer"] = ans_by_qid.get(qid)
        questions_out.append(item)
    return {
        "attempt": att,
        "mock": {"title": (mock or {}).get("title"), "paper_code": att.get("paper_code"), "duration_minutes": (mock or {}).get("duration_minutes")},
        "questions": questions_out,
    }


# ---------- FLASHCARDS ----------

@api_router.get("/flashcards/decks")
async def flashcards_decks(request: Request, paper: Optional[str] = None):
    user = await require_user(request)
    q: dict = {}
    if paper:
        q["paper_code"] = paper
    decks = await db.flashcard_decks.find(q, {"_id": 0}).to_list(100)
    today = now_utc()
    out = []
    for d in decks:
        # Cards in deck
        card_ids = [c["card_id"] for c in await db.flashcards.find({"deck_id": d["deck_id"]}, {"_id": 0, "card_id": 1}).to_list(500)]
        # User's progress on those cards
        prog = await db.user_flashcard_progress.find({"user_id": user["user_id"], "card_id": {"$in": card_ids}}, {"_id": 0}).to_list(500)
        prog_by_id = {p["card_id"]: p for p in prog}
        due_today = 0
        mastered = 0
        for cid in card_ids:
            p = prog_by_id.get(cid)
            if not p:
                due_today += 1
                continue
            due = p.get("due_date")
            if due and (due.replace(tzinfo=timezone.utc) if due.tzinfo is None else due) <= today:
                due_today += 1
            if p.get("repetitions", 0) >= 4:
                mastered += 1
        out.append({
            **d,
            "user_progress": {"due_today": due_today, "mastered": mastered, "total": len(card_ids)},
        })
    return {"items": out, "count": len(out)}


@api_router.get("/flashcards/decks/{deck_id}/queue")
async def flashcards_queue(deck_id: str, request: Request, limit: int = 20):
    user = await require_user(request)
    cards = await db.flashcards.find({"deck_id": deck_id}, {"_id": 0}).to_list(500)
    if not cards:
        return {"items": [], "count": 0}
    card_ids = [c["card_id"] for c in cards]
    prog = await db.user_flashcard_progress.find({"user_id": user["user_id"], "card_id": {"$in": card_ids}}, {"_id": 0}).to_list(500)
    prog_by_id = {p["card_id"]: p for p in prog}
    today = now_utc()
    due = []
    new_cards = []
    for c in cards:
        p = prog_by_id.get(c["card_id"])
        if not p:
            new_cards.append({**c, "progress": None})
        else:
            due_dt = p.get("due_date")
            if due_dt and (due_dt.replace(tzinfo=timezone.utc) if due_dt.tzinfo is None else due_dt) <= today:
                due.append({**c, "progress": p})
    queue = (due + new_cards)[:min(limit, 100)]
    return {"items": queue, "count": len(queue), "due_count": len(due), "new_count": len(new_cards)}


def _sm2(prev: dict, grade: int) -> dict:
    ease = float((prev or {}).get("ease_factor", 2.5))
    repetitions = int((prev or {}).get("repetitions", 0))
    interval_days = int((prev or {}).get("interval_days", 0))
    if grade == 0:
        repetitions = 0
        interval_days = 0
        # ease stays
    else:
        repetitions += 1
        ease = max(1.3, ease + (0.1 - (3 - grade) * (0.08 + (3 - grade) * 0.02)))
        if repetitions == 1:
            interval_days = 1
        elif repetitions == 2:
            interval_days = 3 if grade == 1 else 6
        else:
            interval_days = round((interval_days or 1) * ease)
    return {
        "ease_factor": round(ease, 3),
        "repetitions": repetitions,
        "interval_days": interval_days,
        "due_date": now_utc() + timedelta(days=interval_days),
        "last_reviewed": now_utc(),
        "last_grade": grade,
    }


@api_router.post("/flashcards/review")
@limiter.limit("60/minute")
async def flashcards_review(body: FlashcardReviewBody, request: Request):
    user = await require_user(request)
    card = await db.flashcards.find_one({"card_id": body.card_id}, {"_id": 0})
    if not card:
        raise HTTPException(status_code=404, detail="Card not found")
    prev = await db.user_flashcard_progress.find_one({"user_id": user["user_id"], "card_id": body.card_id}, {"_id": 0})
    upd = _sm2(prev, body.grade)
    total_reviews = int((prev or {}).get("total_reviews", 0)) + 1
    doc = {"user_id": user["user_id"], "card_id": body.card_id, "total_reviews": total_reviews, **upd}
    await db.user_flashcard_progress.update_one(
        {"user_id": user["user_id"], "card_id": body.card_id}, {"$set": doc}, upsert=True,
    )
    # XP: +5 for good/easy, +2 for hard, 0 for again
    xp = {0: 0, 1: 2, 2: 5, 3: 5}.get(body.grade, 0)
    if xp:
        await db.user_stats.update_one({"user_id": user["user_id"]}, {"$inc": {"total_xp": xp}}, upsert=True)
    return {"progress": doc, "xp_awarded": xp}


@api_router.get("/flashcards/stats")
async def flashcards_stats(request: Request):
    user = await require_user(request)
    all_prog = await db.user_flashcard_progress.find({"user_id": user["user_id"]}, {"_id": 0}).to_list(2000)
    today = now_utc()
    due_today = 0
    mastered = 0
    for p in all_prog:
        due = p.get("due_date")
        if due and (due.replace(tzinfo=timezone.utc) if due.tzinfo is None else due) <= today:
            due_today += 1
        if p.get("repetitions", 0) >= 4:
            mastered += 1
    # New cards (never reviewed): total system cards minus progress entries
    total_cards = await db.flashcards.count_documents({})
    studied_ids = {p["card_id"] for p in all_prog}
    due_today += (total_cards - len(studied_ids))  # new cards count as due
    return {
        "total_cards_studied": len(all_prog),
        "mastered_count": mastered,
        "due_today": due_today,
        "streak_days_studying_flashcards": 0,  # simplified
    }


# ============================================================
# PHASE 2 — Focus + XP + Streaks + Badges + Analytics
# ============================================================

# ---- stats initialization ----
async def init_user_stats(user_id: str, unlock_founder: bool = False):
    existing = await db.user_stats.find_one({"user_id": user_id}, {"_id": 0})
    if existing:
        return existing
    doc = {
        "user_id": user_id,
        "total_xp": 0, "current_streak": 0, "best_streak": 0,
        "last_active_date": None, "streak_freezes_available": 1,
        "last_freeze_reset": monday_of_week_ist(),
        "total_focus_minutes": 0, "sessions_completed": 0,
    }
    await db.user_stats.insert_one(doc)
    if unlock_founder:
        await unlock_badge(user_id, "founder_grid")
    return doc

# ---- streak logic ----
async def apply_streak(user_id: str, session_end: datetime) -> dict:
    """Update streak state based on completion. Returns {current_streak, delta, is_new_best, freeze_used}"""
    session_date = date_ist_str(session_end)
    stats = await db.user_stats.find_one({"user_id": user_id}, {"_id": 0})
    if not stats:
        await init_user_stats(user_id)
        stats = await db.user_stats.find_one({"user_id": user_id}, {"_id": 0})

    # Weekly freeze reset (Monday IST)
    this_monday = monday_of_week_ist()
    if stats.get("last_freeze_reset") != this_monday:
        stats["streak_freezes_available"] = 1
        stats["last_freeze_reset"] = this_monday

    last = stats.get("last_active_date")
    current = stats.get("current_streak", 0)
    best = stats.get("best_streak", 0)
    freezes = stats.get("streak_freezes_available", 0)
    freeze_used = False

    if last == session_date:
        delta = 0  # same day, no change
    else:
        # compute gap
        try:
            last_dt = datetime.strptime(last, "%Y-%m-%d").date() if last else None
        except Exception:
            last_dt = None
        session_dt = datetime.strptime(session_date, "%Y-%m-%d").date()
        gap = (session_dt - last_dt).days if last_dt else None

        if gap == 1:
            current += 1
            delta = 1
        elif gap == 2 and freezes > 0:
            freezes -= 1
            current += 1
            delta = 1
            freeze_used = True
        else:
            current = 1
            delta = 1  # from ? to 1
        stats["last_active_date"] = session_date

    is_new_best = current > best
    if is_new_best:
        best = current

    await db.user_stats.update_one(
        {"user_id": user_id},
        {"$set": {
            "current_streak": current,
            "best_streak": best,
            "last_active_date": stats["last_active_date"],
            "streak_freezes_available": freezes,
            "last_freeze_reset": stats["last_freeze_reset"],
        }},
    )
    return {"current_streak": current, "best_streak": best, "delta": delta,
            "is_new_best": is_new_best, "freeze_used": freeze_used}

# ---- badges ----
BADGES_SEED = [
    {"badge_id": "first_focus", "name": "First Focus", "description": "Complete your first focus session.", "icon": "Sparkles", "rarity": "common"},
    {"badge_id": "hour_one", "name": "One Hour Club", "description": "Log 60 total focus minutes.", "icon": "Clock", "rarity": "common"},
    {"badge_id": "streak_3", "name": "3-Day Streak", "description": "Reach a 3-day streak.", "icon": "Flame", "rarity": "common"},
    {"badge_id": "streak_7", "name": "7-Day Streak", "description": "Reach a 7-day streak.", "icon": "Flame", "rarity": "rare"},
    {"badge_id": "streak_30", "name": "30-Day Streak", "description": "Reach a 30-day streak.", "icon": "Flame", "rarity": "legendary"},
    {"badge_id": "streak_100", "name": "100-Day Streak", "description": "Reach a 100-day streak.", "icon": "Flame", "rarity": "legendary"},
    {"badge_id": "hour_25", "name": "25-Hour Club", "description": "Log 25 total focus hours.", "icon": "Trophy", "rarity": "rare"},
    {"badge_id": "hour_50", "name": "50-Hour Club", "description": "Log 50 total focus hours.", "icon": "Trophy", "rarity": "rare"},
    {"badge_id": "hour_100", "name": "100-Hour Club", "description": "Log 100 total focus hours.", "icon": "Trophy", "rarity": "legendary"},
    {"badge_id": "night_owl", "name": "Night Owl", "description": "Complete a session between 11pm–3am IST.", "icon": "Moon", "rarity": "common"},
    {"badge_id": "early_bird", "name": "Early Bird", "description": "Complete a session between 4am–7am IST.", "icon": "Sunrise", "rarity": "common"},
    {"badge_id": "deep_diver", "name": "Deep Diver", "description": "Complete a single session ≥ 90 minutes.", "icon": "Waves", "rarity": "rare"},
    {"badge_id": "marathoner", "name": "Marathoner", "description": "Log 4+ hours in a single day.", "icon": "Zap", "rarity": "rare"},
    {"badge_id": "weekend_warrior", "name": "Weekend Warrior", "description": "Complete a session on both Saturday AND Sunday.", "icon": "CalendarDays", "rarity": "common"},
    {"badge_id": "subject_scholar", "name": "Subject Scholar", "description": "Log 10+ hours in one subject.", "icon": "BookOpen", "rarity": "rare"},
    {"badge_id": "polymath", "name": "Polymath", "description": "Log sessions in 5+ different subjects.", "icon": "Layers", "rarity": "rare"},
    {"badge_id": "comeback_kid", "name": "Comeback Kid", "description": "Return after a streak break.", "icon": "Undo2", "rarity": "common"},
    {"badge_id": "level_5", "name": "Level 5", "description": "Reach level 5.", "icon": "ChevronsUp", "rarity": "common"},
    {"badge_id": "level_10", "name": "Level 10", "description": "Reach level 10.", "icon": "ChevronsUp", "rarity": "rare"},
    {"badge_id": "founder_grid", "name": "Founder of the Grid", "description": "Sign up in the first month.", "icon": "Crown", "rarity": "legendary"},
]

async def unlock_badge(user_id: str, badge_id: str) -> Optional[dict]:
    existing = await db.user_achievements.find_one({"user_id": user_id, "badge_id": badge_id}, {"_id": 0})
    if existing:
        return None
    doc = {"user_id": user_id, "badge_id": badge_id, "unlocked_at": now_utc()}
    await db.user_achievements.insert_one(doc)
    badge = await db.achievements.find_one({"badge_id": badge_id}, {"_id": 0})
    return {**(badge or {}), "unlocked_at": doc["unlocked_at"]}

async def check_and_unlock_badges(user_id: str, ctx: dict) -> List[dict]:
    """ctx has: session_minutes, session_start_ist (datetime), current_streak, total_minutes, sessions_completed, subjects_touched(set), level, comeback_after_break(bool)"""
    new_badges = []

    async def maybe(bid, cond):
        if cond:
            u = await unlock_badge(user_id, bid)
            if u:
                new_badges.append(u)

    await maybe("first_focus", ctx.get("sessions_completed", 0) >= 1)
    total_min = ctx.get("total_minutes", 0)
    await maybe("hour_one", total_min >= 60)
    await maybe("hour_25", total_min >= 25 * 60)
    await maybe("hour_50", total_min >= 50 * 60)
    await maybe("hour_100", total_min >= 100 * 60)
    cs = ctx.get("current_streak", 0)
    await maybe("streak_3", cs >= 3)
    await maybe("streak_7", cs >= 7)
    await maybe("streak_30", cs >= 30)
    await maybe("streak_100", cs >= 100)
    hour = ctx.get("session_end_ist").hour if ctx.get("session_end_ist") else None
    if hour is not None:
        await maybe("night_owl", (hour >= 23) or (hour < 3))
        await maybe("early_bird", 4 <= hour < 7)
    await maybe("deep_diver", ctx.get("session_minutes", 0) >= 90)
    await maybe("marathoner", ctx.get("today_minutes", 0) >= 240)
    # weekend warrior: has completed sessions on both Sat and Sun (this week IST)
    if ctx.get("weekend_hit_both"):
        await maybe("weekend_warrior", True)
    if ctx.get("max_subject_minutes", 0) >= 600:
        await maybe("subject_scholar", True)
    subs = ctx.get("subjects_touched") or set()
    await maybe("polymath", len(subs) >= 5)
    if ctx.get("comeback_after_break"):
        await maybe("comeback_kid", True)
    lvl = ctx.get("level", 1)
    await maybe("level_5", lvl >= 5)
    await maybe("level_10", lvl >= 10)
    return new_badges

# ---- Focus endpoints ----
@api_router.post("/focus/start")
@limiter.limit("30/minute")
async def focus_start(body: FocusStart, request: Request):
    user = await require_user(request)
    user_id = user["user_id"]
    # cancel any active
    await db.focus_sessions.update_many(
        {"user_id": user_id, "status": "active"},
        {"$set": {"status": "cancelled", "ended_at": now_utc()}}
    )
    session_id = new_session_id()
    doc = {
        "session_id": session_id, "user_id": user_id,
        "subject": body.subject.strip(),
        "planned_duration_seconds": body.planned_minutes * 60,
        "actual_duration_seconds": 0,
        "started_at": now_utc(), "ended_at": None,
        "status": "active", "xp_awarded": 0,
        "ambient_track": body.ambient_track,
    }
    await db.focus_sessions.insert_one(doc)
    return {"session_id": session_id, "started_at": doc["started_at"].isoformat(),
            "planned_seconds": doc["planned_duration_seconds"], "subject": doc["subject"]}

@api_router.get("/focus/active")
async def focus_active(request: Request):
    user = await require_user(request)
    s = await db.focus_sessions.find_one({"user_id": user["user_id"], "status": "active"}, {"_id": 0})
    if not s:
        return None
    started = s["started_at"]
    if started.tzinfo is None:
        started = started.replace(tzinfo=timezone.utc)
    return {
        "session_id": s["session_id"],
        "subject": s["subject"],
        "planned_seconds": s["planned_duration_seconds"],
        "started_at": started.isoformat(),
        "ambient_track": s.get("ambient_track"),
    }

@api_router.post("/focus/cancel")
@limiter.limit("30/minute")
async def focus_cancel(body: FocusIdBody, request: Request):
    user = await require_user(request)
    s = await db.focus_sessions.find_one({"session_id": body.session_id, "user_id": user["user_id"]}, {"_id": 0})
    if not s:
        raise HTTPException(404, "Session not found")
    if s["status"] != "active":
        return {"ok": True, "status": s["status"]}
    started = s["started_at"]
    if started.tzinfo is None:
        started = started.replace(tzinfo=timezone.utc)
    elapsed = int((now_utc() - started).total_seconds())
    await db.focus_sessions.update_one(
        {"session_id": body.session_id},
        {"$set": {"status": "cancelled", "ended_at": now_utc(), "actual_duration_seconds": elapsed}}
    )
    return {"ok": True, "status": "cancelled"}

@api_router.post("/focus/complete")
@limiter.limit("30/minute")
async def focus_complete(body: FocusIdBody, request: Request):
    user = await require_user(request)
    user_id = user["user_id"]
    s = await db.focus_sessions.find_one({"session_id": body.session_id, "user_id": user_id}, {"_id": 0})
    if not s:
        raise HTTPException(404, "Session not found")
    if s["status"] != "active":
        raise HTTPException(400, f"Session not active (status={s['status']})")

    started = s["started_at"]
    if started.tzinfo is None:
        started = started.replace(tzinfo=timezone.utc)
    elapsed = int((now_utc() - started).total_seconds())
    planned = s["planned_duration_seconds"]
    actual = max(30, min(elapsed, planned + 60))  # cap at planned + 60s grace, min 30s
    minutes = actual // 60

    # streak (session_end = now)
    session_end = now_utc()
    session_date_ist = date_ist_str(session_end)

    # Check comeback: was last_active more than 1 day before today
    prior_stats = await db.user_stats.find_one({"user_id": user_id}, {"_id": 0}) or {}
    prior_last = prior_stats.get("last_active_date")
    comeback = False
    if prior_last:
        try:
            gap = (datetime.strptime(session_date_ist, "%Y-%m-%d").date()
                   - datetime.strptime(prior_last, "%Y-%m-%d").date()).days
            comeback = gap >= 3
        except Exception:
            pass

    streak_res = await apply_streak(user_id, session_end)

    # is-first-of-day
    today_sessions = await db.focus_sessions.count_documents({
        "user_id": user_id, "status": "completed",
    })
    is_first_of_day = not await db.focus_sessions.find_one({
        "user_id": user_id, "status": "completed",
    }, projection={"_id": 0, "started_at": 1}, sort=[("started_at", -1)])
    # More precise: find last completed session's IST date
    last_completed = await db.focus_sessions.find(
        {"user_id": user_id, "status": "completed"}, {"_id": 0, "ended_at": 1}
    ).sort("ended_at", -1).limit(1).to_list(1)
    if last_completed:
        le = last_completed[0]["ended_at"]
        if le.tzinfo is None:
            le = le.replace(tzinfo=timezone.utc)
        is_first_of_day = date_ist_str(le) != session_date_ist
    else:
        is_first_of_day = True

    # XP
    xp = minutes + 10 + (20 if is_first_of_day else 0) + (50 if streak_res["is_new_best"] else 0)

    # Update session doc
    await db.focus_sessions.update_one(
        {"session_id": body.session_id},
        {"$set": {"status": "completed", "ended_at": session_end,
                  "actual_duration_seconds": actual, "xp_awarded": xp}}
    )

    # Update daily_focus
    await db.daily_focus.update_one(
        {"user_id": user_id, "date": session_date_ist},
        {"$inc": {"minutes": minutes, "sessions": 1}, "$setOnInsert": {"user_id": user_id, "date": session_date_ist}},
        upsert=True,
    )

    # Update user_stats
    prev_stats = await db.user_stats.find_one({"user_id": user_id}, {"_id": 0}) or {}
    prev_level = compute_level(prev_stats.get("total_xp", 0))
    new_total_xp = prev_stats.get("total_xp", 0) + xp
    new_level = compute_level(new_total_xp)
    await db.user_stats.update_one(
        {"user_id": user_id},
        {"$set": {"total_xp": new_total_xp},
         "$inc": {"total_focus_minutes": minutes, "sessions_completed": 1}},
    )

    # Badge context
    subjects_touched = set(await db.focus_sessions.distinct("subject", {"user_id": user_id, "status": "completed"}))
    df = await db.daily_focus.find_one({"user_id": user_id, "date": session_date_ist}, {"_id": 0})
    today_min = (df or {}).get("minutes", 0)
    # weekend both
    monday = monday_of_week_ist(session_end)
    monday_dt = datetime.strptime(monday, "%Y-%m-%d").date()
    sat = (monday_dt + timedelta(days=5)).strftime("%Y-%m-%d")
    sun = (monday_dt + timedelta(days=6)).strftime("%Y-%m-%d")
    sat_doc = await db.daily_focus.find_one({"user_id": user_id, "date": sat}, {"_id": 0})
    sun_doc = await db.daily_focus.find_one({"user_id": user_id, "date": sun}, {"_id": 0})
    weekend_both = bool(sat_doc and sat_doc.get("minutes", 0) > 0 and sun_doc and sun_doc.get("minutes", 0) > 0)

    # per-subject max minutes
    pipe = [
        {"$match": {"user_id": user_id, "status": "completed"}},
        {"$group": {"_id": "$subject", "m": {"$sum": {"$divide": ["$actual_duration_seconds", 60]}}}},
        {"$sort": {"m": -1}}, {"$limit": 1},
    ]
    top_sub = await db.focus_sessions.aggregate(pipe).to_list(1)
    max_subject_min = int((top_sub[0]["m"]) if top_sub else 0)

    new_stats = await db.user_stats.find_one({"user_id": user_id}, {"_id": 0}) or {}
    ctx = {
        "sessions_completed": new_stats.get("sessions_completed", 0),
        "total_minutes": new_stats.get("total_focus_minutes", 0),
        "current_streak": streak_res["current_streak"],
        "session_minutes": minutes,
        "session_end_ist": session_end.astimezone(IST),
        "today_minutes": today_min,
        "weekend_hit_both": weekend_both,
        "max_subject_minutes": max_subject_min,
        "subjects_touched": subjects_touched,
        "comeback_after_break": comeback,
        "level": new_level,
    }
    new_badges = await check_and_unlock_badges(user_id, ctx)

    return {
        "session_id": body.session_id,
        "xp_awarded": xp,
        "total_xp": new_total_xp,
        "level": new_level,
        "level_up": new_level > prev_level,
        "new_badges": new_badges,
        "current_streak": streak_res["current_streak"],
        "best_streak": streak_res["best_streak"],
        "streak_delta": streak_res["delta"],
        "freeze_used": streak_res["freeze_used"],
        "minutes": minutes,
        "subject": s["subject"],
    }

@api_router.get("/focus/history")
async def focus_history(request: Request, limit: int = 50):
    user = await require_user(request)
    limit = max(1, min(limit, 200))
    docs = await db.focus_sessions.find(
        {"user_id": user["user_id"]},
        {"_id": 0}
    ).sort("started_at", -1).limit(limit).to_list(limit)
    for d in docs:
        for k in ("started_at", "ended_at"):
            v = d.get(k)
            if isinstance(v, datetime):
                d[k] = v.isoformat()
    return docs

# ---- Stats endpoints ----
async def stats_snapshot(user_id: str) -> dict:
    s = await db.user_stats.find_one({"user_id": user_id}, {"_id": 0})
    if not s:
        await init_user_stats(user_id)
        s = await db.user_stats.find_one({"user_id": user_id}, {"_id": 0})
    lvl = xp_to_next(s.get("total_xp", 0))
    today = today_ist_str()
    df_today = await db.daily_focus.find_one({"user_id": user_id, "date": today}, {"_id": 0}) or {}
    # week (last 7 days ending today)
    week_dates = [(now_ist() - timedelta(days=i)).strftime("%Y-%m-%d") for i in range(7)]
    week_docs = await db.daily_focus.find({"user_id": user_id, "date": {"$in": week_dates}}, {"_id": 0}).to_list(200)
    week_min = sum(int(x.get("minutes", 0)) for x in week_docs)
    return {
        "total_xp": s.get("total_xp", 0),
        "xp_total": s.get("total_xp", 0),
        "level": lvl["level"],
        "xp_to_next_level": lvl["xp_to_next_level"],
        "xp_in_level": lvl["xp_in_level"],
        "xp_per_level": lvl["xp_per_level"],
        "current_streak": s.get("current_streak", 0),
        "best_streak": s.get("best_streak", 0),
        "streak_freezes_available": s.get("streak_freezes_available", 0),
        "today_minutes": int(df_today.get("minutes", 0)),
        "week_minutes": week_min,
        "total_focus_minutes": int(s.get("total_focus_minutes", 0)),
        "sessions_completed": int(s.get("sessions_completed", 0)),
        "last_active_date": s.get("last_active_date"),
    }

@api_router.get("/stats/me")
async def get_stats_me(request: Request):
    user = await require_user(request)
    return await stats_snapshot(user["user_id"])

@api_router.get("/stats/heatmap")
async def get_heatmap(request: Request, days: int = 365):
    user = await require_user(request)
    days = max(7, min(days, 366))
    start_date = now_ist().date() - timedelta(days=days - 1)
    docs = await db.daily_focus.find({"user_id": user["user_id"]}, {"_id": 0}).to_list(1000)
    by_date = {d["date"]: d for d in docs}
    out = []
    for i in range(days):
        d = start_date + timedelta(days=i)
        key = d.strftime("%Y-%m-%d")
        row = by_date.get(key)
        out.append({"date": key, "minutes": int((row or {}).get("minutes", 0)),
                    "sessions": int((row or {}).get("sessions", 0))})
    return out

@api_router.get("/stats/weekly")
async def get_weekly(request: Request):
    user = await require_user(request)
    out = []
    for i in range(6, -1, -1):
        d = (now_ist() - timedelta(days=i)).date()
        key = d.strftime("%Y-%m-%d")
        doc = await db.daily_focus.find_one({"user_id": user["user_id"], "date": key}, {"_id": 0}) or {}
        out.append({"date": key, "day": d.strftime("%a"), "minutes": int(doc.get("minutes", 0))})
    return out

@api_router.get("/stats/monthly")
async def get_monthly(request: Request):
    user = await require_user(request)
    out = []
    for i in range(29, -1, -1):
        d = (now_ist() - timedelta(days=i)).date()
        key = d.strftime("%Y-%m-%d")
        doc = await db.daily_focus.find_one({"user_id": user["user_id"], "date": key}, {"_id": 0}) or {}
        out.append({"date": key, "minutes": int(doc.get("minutes", 0))})
    return out

@api_router.get("/stats/subjects")
async def get_stats_subjects(request: Request):
    user = await require_user(request)
    pipe = [
        {"$match": {"user_id": user["user_id"], "status": "completed"}},
        {"$group": {
            "_id": "$subject",
            "minutes": {"$sum": {"$divide": ["$actual_duration_seconds", 60]}},
            "sessions": {"$sum": 1},
        }},
        {"$sort": {"minutes": -1}},
    ]
    docs = await db.focus_sessions.aggregate(pipe).to_list(200)
    return [{"subject": d["_id"], "minutes": int(d["minutes"]), "sessions": d["sessions"]} for d in docs]

@api_router.get("/stats/hour-of-day")
async def get_stats_hour_of_day(request: Request):
    user = await require_user(request)
    docs = await db.focus_sessions.find(
        {"user_id": user["user_id"], "status": "completed"}, {"_id": 0}
    ).to_list(5000)
    buckets = [0] * 24
    for d in docs:
        started = d["started_at"]
        if isinstance(started, datetime):
            if started.tzinfo is None:
                started = started.replace(tzinfo=timezone.utc)
            h = started.astimezone(IST).hour
            buckets[h] += (d.get("actual_duration_seconds", 0) or 0) // 60
    return [{"hour": h, "minutes": buckets[h]} for h in range(24)]

@api_router.get("/achievements")
async def get_achievements(request: Request):
    user = await require_user(request)
    all_badges = await db.achievements.find({}, {"_id": 0}).to_list(200)
    unlocked = {u["badge_id"]: u for u in await db.user_achievements.find({"user_id": user["user_id"]}, {"_id": 0}).to_list(200)}
    out = []
    for b in all_badges:
        u = unlocked.get(b["badge_id"])
        out.append({**b, "unlocked": bool(u), "unlocked_at": (u["unlocked_at"].isoformat() if u and isinstance(u.get("unlocked_at"), datetime) else None)})
    # sort: unlocked first, then rarity legendary>rare>common
    rarity_order = {"legendary": 0, "rare": 1, "common": 2}
    out.sort(key=lambda b: (not b["unlocked"], rarity_order.get(b.get("rarity", "common"), 2), b["name"]))
    return out

@api_router.get("/dashboard")
async def get_dashboard(request: Request):
    user = await require_user(request)
    user_id = user["user_id"]
    stats = await stats_snapshot(user_id)
    subjects_pipe = [
        {"$match": {"user_id": user_id, "status": "completed"}},
        {"$group": {"_id": "$subject", "minutes": {"$sum": {"$divide": ["$actual_duration_seconds", 60]}}, "sessions": {"$sum": 1}}},
        {"$sort": {"minutes": -1}}, {"$limit": 3},
    ]
    top_subjects = [{"subject": d["_id"], "minutes": int(d["minutes"]), "sessions": d["sessions"]}
                    for d in await db.focus_sessions.aggregate(subjects_pipe).to_list(3)]

    recent_docs = await db.focus_sessions.find(
        {"user_id": user_id, "status": "completed"}, {"_id": 0}
    ).sort("ended_at", -1).limit(5).to_list(5)
    for d in recent_docs:
        for k in ("started_at", "ended_at"):
            v = d.get(k)
            if isinstance(v, datetime):
                d[k] = v.isoformat()

    # Latest 3 badges
    latest = await db.user_achievements.find({"user_id": user_id}, {"_id": 0}).sort("unlocked_at", -1).limit(3).to_list(3)
    all_badges_map = {b["badge_id"]: b for b in await db.achievements.find({}, {"_id": 0}).to_list(200)}
    latest_badges = []
    for l in latest:
        b = all_badges_map.get(l["badge_id"])
        if b:
            latest_badges.append({**b, "unlocked_at": (l["unlocked_at"].isoformat() if isinstance(l.get("unlocked_at"), datetime) else None)})

    # trailing 90 heatmap
    start = now_ist().date() - timedelta(days=89)
    docs = await db.daily_focus.find({"user_id": user_id}, {"_id": 0}).to_list(1000)
    by_date = {d["date"]: d for d in docs}
    heat = []
    for i in range(90):
        d = start + timedelta(days=i)
        k = d.strftime("%Y-%m-%d")
        row = by_date.get(k)
        heat.append({"date": k, "minutes": int((row or {}).get("minutes", 0)),
                     "sessions": int((row or {}).get("sessions", 0))})

    # unlocked badge count
    total_badges = await db.achievements.count_documents({})
    unlocked_count = await db.user_achievements.count_documents({"user_id": user_id})

    return {
        "user": sanitize_user(user),
        "stats": stats,
        "top_subjects": top_subjects,
        "recent_sessions": recent_docs,
        "latest_badges": latest_badges,
        "heatmap_90": heat,
        "badge_progress": {"unlocked": unlocked_count, "total": total_badges},
    }

# ============================================================
# LIVE PULSE (public)
# ============================================================
LEVEL_CODE = {"Aspiring": "ASP", "Foundation": "FDN", "Intermediate": "INT",
              "Articleship": "ART", "Final": "FIN", "Qualified": "QCA"}

CITIES = ["Mumbai","Delhi","Bangalore","Pune","Chennai","Hyderabad","Kolkata",
          "Ahmedabad","Jaipur","Lucknow","Indore","Nagpur","Coimbatore","Chandigarh"]

def stable_city_for(user_id: str) -> str:
    import hashlib
    h = int(hashlib.md5(user_id.encode()).hexdigest(), 16)
    return CITIES[h % len(CITIES)]

def relative_ago(dt: datetime) -> str:
    if dt.tzinfo is None:
        dt = dt.replace(tzinfo=timezone.utc)
    delta = int((now_utc() - dt).total_seconds())
    if delta < 30: return "just now"
    if delta < 60: return f"{delta}s ago"
    if delta < 3600: return f"{delta // 60}m ago"
    if delta < 86400: return f"{delta // 3600}h ago"
    return f"{delta // 86400}d ago"

def _priming(hour: int) -> dict:
    """Deterministic per-hour priming numbers (blend when real activity is 0)."""
    import hashlib
    seed = int(hashlib.md5(f"pulse-{hour}".encode()).hexdigest()[:12], 16)
    r = random.Random(seed)
    return {
        "minutes_last_hour": r.randint(1500, 3500),
        "active_now": r.randint(200, 600),
        "streaks_at_risk": r.randint(80, 200),
        "sessions_completed_today": r.randint(4200, 5800),
    }

PRIMING_POOL = [
    ("INT","Adv Accounts"),("FDN","Business Law"),("FIN","DT & Int'l Tax"),
    ("INT","Cost & Mgmt"),("FDN","Statistics"),("ART","Auditing"),
    ("FIN","Financial Reporting"),("INT","Taxation"),("FDN","Economics"),
    ("FIN","IDT Laws"),("INT","FM & SM"),("ART","GST Advisory"),("ASP","Career Research"),
]

def _priming_rows(seed_hour: int) -> List[dict]:
    r = random.Random(seed_hour * 977)
    out = []
    for _ in range(12):
        lvl, subj = r.choice(PRIMING_POOL)
        out.append({
            "level": lvl, "subject": subj,
            "minutes": r.randint(15, 90),
            "city": r.choice(CITIES),
            "completed_at_relative": r.choice(["just now","1m ago","3m ago","6m ago","11m ago","18m ago","24m ago","32m ago"]),
        })
    return out

_PULSE_CACHE = {"data": None, "at": None}

@api_router.get("/live/pulse")
@limiter.limit("60/minute")
async def live_pulse(request: Request):
    now = now_utc()
    if _PULSE_CACHE["data"] and _PULSE_CACHE["at"] and (now - _PULSE_CACHE["at"]).total_seconds() < 10:
        return _PULSE_CACHE["data"]

    hour_ago = now - timedelta(hours=1)
    today_ist = today_ist_str()

    # Real activity
    completed_last_hour_pipe = [
        {"$match": {"status": "completed", "ended_at": {"$gte": hour_ago}}},
        {"$group": {"_id": None, "m": {"$sum": {"$divide": ["$actual_duration_seconds", 60]}}}},
    ]
    r = await db.focus_sessions.aggregate(completed_last_hour_pipe).to_list(1)
    minutes_last_hour = int(r[0]["m"]) if r else 0
    active_now = await db.focus_sessions.count_documents({"status": "active"})
    completed_today = await db.focus_sessions.count_documents({
        "status": "completed",
        "ended_at": {"$gte": IST.localize(datetime.combine(datetime.strptime(today_ist, "%Y-%m-%d").date(), datetime.min.time())).astimezone(timezone.utc)}
    })

    # streaks at risk: current_streak>0, last_active < today IST, and evening (IST hour>=20)
    streaks_at_risk = 0
    if now_ist().hour >= 20:
        streaks_at_risk = await db.user_stats.count_documents({
            "current_streak": {"$gt": 0},
            "last_active_date": {"$lt": today_ist},
        })

    # Recent sessions (last 12 completed)
    recent_docs = await db.focus_sessions.find(
        {"status": "completed"}, {"_id": 0}
    ).sort("ended_at", -1).limit(24).to_list(24)

    recent_rows = []
    user_cache = {}
    for d in recent_docs:
        uid = d["user_id"]
        if uid not in user_cache:
            u = await db.users.find_one({"user_id": uid}, {"_id": 0, "journey_level": 1, "city": 1})
            user_cache[uid] = u or {}
        u = user_cache[uid]
        lvl = LEVEL_CODE.get(u.get("journey_level") or "", "FDN")
        city = u.get("city") or stable_city_for(uid)
        minutes = int((d.get("actual_duration_seconds", 0) or 0) // 60)
        if minutes <= 0: continue
        recent_rows.append({
            "level": lvl,
            "subject": d.get("subject") or "General",
            "minutes": minutes,
            "city": city,
            "completed_at_relative": relative_ago(d["ended_at"]) if d.get("ended_at") else "just now",
        })
        if len(recent_rows) >= 12: break

    # Blend priming when activity is thin
    prim = _priming(now_ist().hour)
    if minutes_last_hour == 0 and active_now == 0:
        minutes_last_hour += prim["minutes_last_hour"]
        active_now += prim["active_now"]
        streaks_at_risk += prim["streaks_at_risk"]
        completed_today += prim["sessions_completed_today"]
    else:
        # Even during real activity, keep active_now floor so ticker header doesn't read "0 online"
        if active_now == 0:
            active_now = prim["active_now"]
        if streaks_at_risk == 0 and now_ist().hour >= 20:
            streaks_at_risk = prim["streaks_at_risk"]

    # Fill recent to 12 with priming rows if short
    if len(recent_rows) < 12:
        pri_rows = _priming_rows(now_ist().hour)
        recent_rows = recent_rows + pri_rows[: 12 - len(recent_rows)]

    payload = {
        "minutes_last_hour": minutes_last_hour,
        "active_now": active_now,
        "streaks_at_risk": streaks_at_risk,
        "sessions_completed_today": completed_today,
        "recent_sessions": recent_rows,
        "generated_at": now.isoformat(),
    }
    _PULSE_CACHE["data"] = payload
    _PULSE_CACHE["at"] = now
    return payload

# ============================================================
# PHASE 3 — Mentor (LLM) + Study Plan
# ============================================================
SOURCES_RE = re.compile(r"(?:\*\*)?SOURCES:?\*?\*?\s*(.+)\Z", re.DOTALL | re.IGNORECASE)


def _parse_labeled(line: str):
    """Match 'Act/Standard: X; Section/Para: Y; Note: Z' (any separator: ; , newlines already stripped)."""
    parts = {}
    for m in re.finditer(
        r"(?P<k>Act/Standard|Act|Standard|Circular|Section/Para|Section|Para|§|Note)\s*[:\-]\s*(?P<v>[^;\n]+?)(?=(?:\s*[;,]?\s+(?:Act/Standard|Act|Standard|Circular|Section/Para|Section|Para|§|Note)\s*[:\-])|$)",
        line, flags=re.IGNORECASE,
    ):
        k = m.group("k").lower()
        v = m.group("v").strip().rstrip(",;")
        if k in ("act/standard", "act", "standard", "circular"):
            parts["act"] = v
        elif k in ("section/para", "section", "para", "§"):
            parts["section"] = v
        elif k == "note":
            parts["note"] = v
    return parts if parts.get("act") else None


def _parse_compact(line: str):
    """Compact form '<Act> — §<Section> [<Note>]' or '<Act>, Section <X> (<Note>)' or '<Act>, Section <X>'."""
    # 1) Act — §Section [Note]  or Act – §Section [Note]
    m = re.match(r"\s*(?P<act>[^—–\-]+?)\s*[—–\-]\s*§\s*(?P<sec>[^\[\n]+?)(?:\s*\[(?P<note>[^\]]+)\])?\s*$", line)
    if m:
        return {"act": m.group("act").strip(), "section": m.group("sec").strip(),
                "note": (m.group("note") or "").strip() or None}
    # 2) Act, Section X (Note)  — allow internal commas in Act (e.g. "Income Tax Act, 1961")
    m = re.match(r"\s*(?P<act>.+?),\s*(?:Section|Sec|§|Para)\s*(?P<sec>[^\(\n]+?)(?:\s*\((?P<note>[^\)]+)\))?\s*$", line, re.IGNORECASE)
    if m:
        return {"act": m.group("act").strip(), "section": m.group("sec").strip(),
                "note": (m.group("note") or "").strip() or None}
    return None


def parse_citations(text: str) -> list:
    """Extract structured citations from a SOURCES block.
    Groups multi-line labeled entries (Act/Standard: on line 1, Section/Para: on line 2, ...)
    into a single citation, then handles labeled / compact / short forms.
    """
    m = SOURCES_RE.search(text or "")
    if not m:
        return []

    def _clean(s: str) -> str:
        s = s.strip().lstrip("-•· ").strip()
        return re.sub(r"[*_`]+", "", s).strip()

    label_re = re.compile(
        r"^(Act/Standard|Act|Standard|Circular|Section/Para|Section|Para|§|Note)\s*[:\-]",
        re.IGNORECASE,
    )
    new_group_re = re.compile(r"^(Act/Standard|Act|Standard|Circular)\s*[:\-]", re.IGNORECASE)

    lines = [ln for ln in (_clean(l) for l in m.group(1).splitlines()) if ln]

    # PRE-PASS: merge orphan label-only lines with the next value line
    # e.g. "**Act/Standard:**" alone on a line followed by "Income Tax Act, 1961" → "Act/Standard: Income Tax Act, 1961"
    bare_label_re = re.compile(
        r"^(Act/Standard|Act|Standard|Circular|Section/Para|Section|Para|§|Note)\s*[:\-]?\s*$",
        re.IGNORECASE,
    )
    merged: List[str] = []
    i = 0
    while i < len(lines):
        line = lines[i]
        bm = bare_label_re.match(line)
        if bm and i + 1 < len(lines):
            label = bm.group(1)
            merged.append(f"{label}: {lines[i + 1]}")
            i += 2
        else:
            merged.append(line)
            i += 1
    lines = merged

    grouped: List[str] = []
    cur = ""
    for line in lines:
        if new_group_re.match(line):
            if cur:
                grouped.append(cur)
            cur = line
        elif label_re.match(line) and cur:
            cur = f"{cur}; {line}"
        else:
            if cur:
                grouped.append(cur)
                cur = ""
            grouped.append(line)
    if cur:
        grouped.append(cur)

    out = []
    for line in grouped:
        if line.lower().startswith(("sources", "source:")):
            continue
        parsed = _parse_labeled(line) or _parse_compact(line)
        if parsed and parsed.get("act"):
            out.append({"act": parsed.get("act"), "section": parsed.get("section"), "note": parsed.get("note")})
        else:
            out.append({"act": line, "section": None, "note": None})
    return out


# Self-test on import (dev-only visibility)
def _selftest_citations():
    samples = [
        ("SOURCES:\n- Income Tax Act, 1961 — §44AD [DEEMED PROFITS]",
         {"act": "Income Tax Act, 1961", "section": "44AD", "note": "DEEMED PROFITS"}),
        ("SOURCES:\n- Act/Standard: Income Tax Act, 1961; Section/Para: 44AD; Note: presumptive taxation for small businesses",
         {"act": "Income Tax Act, 1961", "section": "44AD", "note": "presumptive taxation for small businesses"}),
        ("SOURCES:\n- Income Tax Act, 1961, Section 44AD (presumptive taxation)",
         {"act": "Income Tax Act, 1961", "section": "44AD", "note": "presumptive taxation"}),
        ("SOURCES:\n- Ind AS 115, Section 22-30",
         {"act": "Ind AS 115", "section": "22-30", "note": None}),
        ("SOURCES:\n**Act/Standard:** Income Tax Act, 1961\n**Section/Para:** Section 44AD\n**Note:** presumptive for eligible businesses",
         {"act": "Income Tax Act, 1961", "section": "Section 44AD", "note": "presumptive for eligible businesses"}),
        # Claude's natural blank-line-separated form (real-world observed output)
        ("**SOURCES:**\n\nAct/Standard: Income Tax Act, 1961\n\nSection/Para: Section 44AD\n\nNote: Presumptive taxation scheme for small businesses",
         {"act": "Income Tax Act, 1961", "section": "Section 44AD", "note": "Presumptive taxation scheme for small businesses"}),
        # Claude's orphan-label-line form (label on line 1, value on line 2)
        ("## SOURCES\n\n**Act/Standard:**\nIncome Tax Act, 1961\n\n**Section/Para:**\nSection 44AD\n\n**Note:**\nPresumptive taxation scheme",
         {"act": "Income Tax Act, 1961", "section": "Section 44AD", "note": "Presumptive taxation scheme"}),
    ]
    for txt, expected in samples:
        got = parse_citations(txt)
        if not got:
            logger.warning(f"citation self-test miss: {txt!r}")
            continue
        first = got[0]
        for k, v in expected.items():
            if first.get(k) != v:
                logger.warning(f"citation self-test mismatch on {k}: got={first.get(k)!r} want={v!r} line={txt!r}")
                break

_selftest_citations()


async def build_user_ctx(user_id: str) -> dict:
    user = await db.users.find_one({"user_id": user_id}, {"_id": 0}) or {}
    stats = await db.user_stats.find_one({"user_id": user_id}, {"_id": 0}) or {}
    pipe = [
        {"$match": {"user_id": user_id, "status": "completed"}},
        {"$group": {"_id": "$subject", "m": {"$sum": {"$divide": ["$actual_duration_seconds", 60]}}}},
        {"$sort": {"m": -1}}, {"$limit": 3},
    ]
    tops = [d["_id"] for d in await db.focus_sessions.aggregate(pipe).to_list(3)]
    return {
        "level": user.get("journey_level") or "Foundation",
        "daily_goal_minutes": user.get("daily_goal_minutes") or 180,
        "current_streak": stats.get("current_streak") or 0,
        "top_subjects": tops or (user.get("subjects") or ["General"])[:3],
    }


def default_mode(level: str) -> str:
    return "practice" if level in ("Articleship", "Qualified") else "exam"


class MentorSessionCreate(BaseModel):
    mode: str = Field(default="exam")
    initial_message: Optional[str] = Field(default=None, max_length=4000)


class MentorChatBody(BaseModel):
    session_id: str
    message: str = Field(min_length=1, max_length=8000)


class MentorQuickBody(BaseModel):
    message: str = Field(min_length=1, max_length=8000)
    mode: Optional[str] = None


class StudyPlanBody(BaseModel):
    exam_date: str  # YYYY-MM-DD
    daily_hours: float = Field(ge=0.5, le=14)
    weak_areas: List[str] = []


@api_router.post("/mentor/sessions")
async def mentor_create_session(body: MentorSessionCreate, request: Request):
    user = await require_user(request)
    mode = body.mode if body.mode in ("exam", "practice") else default_mode(user.get("journey_level") or "Foundation")
    title = (body.initial_message or "New session").strip()[:60] or "New session"
    session_id = f"mses_{uuid.uuid4().hex[:14]}"
    doc = {
        "session_id": session_id, "user_id": user["user_id"], "title": title,
        "mode": mode, "created_at": now_utc(), "updated_at": now_utc(),
        "message_count": 0, "deleted": False,
    }
    await db.mentor_sessions.insert_one(doc)
    return {"session_id": session_id, "title": title, "mode": mode,
            "created_at": doc["created_at"].isoformat()}


@api_router.get("/mentor/sessions")
async def mentor_list_sessions(request: Request):
    user = await require_user(request)
    docs = await db.mentor_sessions.find(
        {"user_id": user["user_id"], "deleted": {"$ne": True}}, {"_id": 0}
    ).sort("updated_at", -1).to_list(200)
    for d in docs:
        for k in ("created_at", "updated_at"):
            v = d.get(k)
            if isinstance(v, datetime):
                d[k] = v.isoformat()
    return docs


@api_router.get("/mentor/sessions/{session_id}")
async def mentor_get_session(session_id: str, request: Request):
    user = await require_user(request)
    s = await db.mentor_sessions.find_one({"session_id": session_id, "user_id": user["user_id"]}, {"_id": 0})
    if not s or s.get("deleted"):
        raise HTTPException(404, "Not found")
    msgs = await db.mentor_messages.find(
        {"session_id": session_id, "user_id": user["user_id"]}, {"_id": 0}
    ).sort("created_at", 1).to_list(2000)
    for m in msgs:
        v = m.get("created_at")
        if isinstance(v, datetime):
            m["created_at"] = v.isoformat()
    for k in ("created_at", "updated_at"):
        v = s.get(k)
        if isinstance(v, datetime):
            s[k] = v.isoformat()
    # Flat shape matching list endpoint + messages array
    return {
        "session_id": s.get("session_id"),
        "title": s.get("title"),
        "mode": s.get("mode"),
        "message_count": s.get("message_count", 0),
        "created_at": s.get("created_at"),
        "updated_at": s.get("updated_at"),
        "session": s,       # kept for backward compat with existing frontend
        "messages": msgs,
    }


@api_router.delete("/mentor/sessions/{session_id}")
async def mentor_delete_session(session_id: str, request: Request):
    user = await require_user(request)
    r = await db.mentor_sessions.update_one(
        {"session_id": session_id, "user_id": user["user_id"]},
        {"$set": {"deleted": True, "updated_at": now_utc()}},
    )
    if r.matched_count == 0:
        raise HTTPException(404, "Not found")
    return {"ok": True}


async def _sse_wrap(gen):
    """Convert an async generator of events (dicts) into SSE-formatted bytes."""
    async for ev in gen:
        yield f"data: {_json.dumps(ev)}\n\n".encode("utf-8")


async def _mentor_stream_and_save(user_id: str, session_id: Optional[str], message: str, mode: str):
    """Common streamer used by /mentor/chat and /mentor/quick."""
    ctx = await build_user_ctx(user_id)
    system_prompt = build_practice_prompt(ctx) if mode == "practice" else build_exam_prompt(ctx)

    # Persist user message first (only if session-bound)
    if session_id:
        msg_id_user = f"mmsg_{uuid.uuid4().hex[:14]}"
        await db.mentor_messages.insert_one({
            "message_id": msg_id_user, "session_id": session_id, "user_id": user_id,
            "role": "user", "content": message, "citations": None, "tokens_used": None,
            "created_at": now_utc(),
        })
        # Auto-title if session is still default
        s = await db.mentor_sessions.find_one({"session_id": session_id}, {"_id": 0})
        if s and (s.get("title") in ("New session", None, "")):
            new_title = message.strip()[:48]
            await db.mentor_sessions.update_one({"session_id": session_id}, {"$set": {"title": new_title}})

    # Fresh LlmChat per session
    chat = LlmChat(
        api_key=EMERGENT_LLM_KEY,
        session_id=session_id or f"quick_{uuid.uuid4().hex[:10]}",
        system_message=system_prompt,
    ).with_model(*MENTOR_MODEL)

    yield {"type": "start"}
    full = []
    try:
        async for ev in chat.stream_message(UserMessage(text=message)):
            if isinstance(ev, TextDelta):
                full.append(ev.content)
                yield {"type": "delta", "content": ev.content}
            elif isinstance(ev, StreamDone):
                break
    except Exception as e:
        logger.exception("mentor stream error")
        yield {"type": "error", "error": str(e)}
        return

    full_text = "".join(full)
    citations = parse_citations(full_text)
    if citations:
        yield {"type": "citations", "citations": citations}

    msg_id_ai = f"mmsg_{uuid.uuid4().hex[:14]}"
    if session_id:
        await db.mentor_messages.insert_one({
            "message_id": msg_id_ai, "session_id": session_id, "user_id": user_id,
            "role": "assistant", "content": full_text, "citations": citations or None,
            "tokens_used": None, "created_at": now_utc(),
        })
        await db.mentor_sessions.update_one(
            {"session_id": session_id},
            {"$set": {"updated_at": now_utc()}, "$inc": {"message_count": 2}},
        )
    yield {"type": "done", "message_id": msg_id_ai, "tokens_used": None}


@api_router.post("/mentor/chat")
@limiter.limit("20/minute")
async def mentor_chat(body: MentorChatBody, request: Request):
    user = await require_user(request)
    s = await db.mentor_sessions.find_one({"session_id": body.session_id, "user_id": user["user_id"]}, {"_id": 0})
    if not s or s.get("deleted"):
        raise HTTPException(404, "Session not found")
    return StreamingResponse(
        _sse_wrap(_mentor_stream_and_save(user["user_id"], body.session_id, body.message, s.get("mode") or "exam")),
        media_type="text/event-stream",
        headers={"Cache-Control": "no-cache", "X-Accel-Buffering": "no", "Connection": "keep-alive"},
    )


@api_router.post("/mentor/quick")
@limiter.limit("10/minute")
async def mentor_quick(body: MentorQuickBody, request: Request):
    user = await require_user(request)
    if not check_quick_rate(user["user_id"]):
        raise HTTPException(429, "Rate limit exceeded")
    mode = body.mode if body.mode in ("exam", "practice") else default_mode(user.get("journey_level") or "Foundation")
    return StreamingResponse(
        _sse_wrap(_mentor_stream_and_save(user["user_id"], None, body.message, mode)),
        media_type="text/event-stream",
        headers={"Cache-Control": "no-cache", "X-Accel-Buffering": "no", "Connection": "keep-alive"},
    )


async def _study_plan_stream(user_id: str, exam_date: str, daily_hours: float, weak_areas: List[str]):
    """SSE generator: start → progress heartbeats every ~5s → done with the persisted plan → error on failure."""
    try:
        try:
            exam_dt = datetime.strptime(exam_date, "%Y-%m-%d").date()
        except ValueError:
            yield {"type": "error", "error": "exam_date must be YYYY-MM-DD"}
            return
        days_until = max(1, (exam_dt - now_ist().date()).days)

        yield {"type": "start"}
        yield {"type": "progress", "message": "drafting the strategy…"}

        ctx = await build_user_ctx(user_id)
        prompt = build_study_plan_prompt(ctx, exam_date, days_until, daily_hours, weak_areas)
        chat = LlmChat(
            api_key=EMERGENT_LLM_KEY,
            session_id=f"plan_{uuid.uuid4().hex[:10]}",
            system_message="You produce concise, valid JSON study plans. Output ONLY JSON, no prose.",
        ).with_model(*MENTOR_MODEL)

        chunks: list = []
        stream_done = asyncio.Event()

        async def _run_llm():
            try:
                async for ev in chat.stream_message(UserMessage(text=prompt)):
                    if isinstance(ev, TextDelta):
                        chunks.append(ev.content)
                    elif isinstance(ev, StreamDone):
                        break
            finally:
                stream_done.set()

        llm_task = asyncio.create_task(_run_llm())
        step = 0
        heartbeats = [
            "sketching week structure…",
            "allocating hours to weak areas…",
            "spacing revision blocks…",
            "reserving mock tests…",
            "finalising day-by-day tasks…",
        ]
        while not stream_done.is_set():
            try:
                await asyncio.wait_for(stream_done.wait(), timeout=5.0)
            except asyncio.TimeoutError:
                msg = heartbeats[min(step, len(heartbeats) - 1)]
                step += 1
                yield {"type": "progress", "message": msg}

        try:
            await llm_task
        except Exception as e:
            yield {"type": "error", "error": f"LLM failed: {e}"}
            return

        text = "".join(chunks).strip()
        # Strip ```json fences and any preamble; find first {...} block as fallback
        if text.startswith("```"):
            text = re.sub(r"^```(?:json)?\s*", "", text)
            text = re.sub(r"\s*```$", "", text)
        try:
            plan_json = _json.loads(text)
        except Exception:
            m = re.search(r"\{[\s\S]*\}", text)
            if m:
                try:
                    plan_json = _json.loads(m.group(0))
                except Exception as e:
                    yield {"type": "error", "error": f"LLM returned non-JSON: {e}"}
                    return
            else:
                yield {"type": "error", "error": "LLM returned non-JSON"}
                return

        plan_id = f"plan_{uuid.uuid4().hex[:14]}"
        await db.study_plans.update_many(
            {"user_id": user_id, "status": "active"},
            {"$set": {"status": "archived"}},
        )
        doc = {
            "plan_id": plan_id, "user_id": user_id,
            "exam_date": exam_date, "daily_hours": daily_hours,
            "weak_areas": weak_areas, "plan_json": plan_json,
            "created_at": now_utc(), "status": "active",
        }
        await db.study_plans.insert_one(doc)
        # Exclude Mongo's _id (ObjectId, not JSON-serializable) and normalize datetime
        plan_out = {k: v for k, v in doc.items() if k != "_id"}
        plan_out["created_at"] = doc["created_at"].isoformat()
        yield {"type": "done", "plan": plan_out}
    except Exception as e:
        logger.exception("study plan stream error")
        yield {"type": "error", "error": str(e)}


@api_router.post("/study-plan/generate")
@limiter.limit("5/hour")
async def study_plan_generate(body: StudyPlanBody, request: Request):
    """Kick off a study-plan generation job. Returns immediately with {job_id}.
    Client polls GET /study-plan/status/{job_id} every ~2s until status=done|error.
    Avoids k8s ingress ~60s timeout on long streaming responses.
    """
    user = await require_user(request)
    _cleanup_plan_jobs()
    job_id = f"pjob_{uuid.uuid4().hex[:14]}"
    _PLAN_JOBS[job_id] = {
        "job_id": job_id, "user_id": user["user_id"],
        "status": "pending", "progress": "queued",
        "created_at": now_utc(),
    }
    asyncio.create_task(_run_plan_job(job_id, user["user_id"], body.exam_date, body.daily_hours, body.weak_areas))
    return {"job_id": job_id, "status": "pending"}


@api_router.get("/study-plan/status/{job_id}")
async def study_plan_status(job_id: str, request: Request):
    user = await require_user(request)
    j = _PLAN_JOBS.get(job_id)
    if not j or j.get("user_id") != user["user_id"]:
        raise HTTPException(404, "Job not found")
    return {
        "job_id": j["job_id"],
        "status": j.get("status"),
        "progress": j.get("progress"),
        "error": j.get("error"),
        "plan": j.get("plan"),
    }


# In-memory jobs + worker
_PLAN_JOBS: dict = {}
PLAN_JOB_TTL_MIN = 30


def _cleanup_plan_jobs():
    cutoff = now_utc() - timedelta(minutes=PLAN_JOB_TTL_MIN)
    for k, v in list(_PLAN_JOBS.items()):
        if v.get("created_at") and v["created_at"] < cutoff:
            _PLAN_JOBS.pop(k, None)


async def _run_plan_job(job_id: str, user_id: str, exam_date: str, daily_hours: float, weak_areas: List[str]):
    try:
        try:
            exam_dt = datetime.strptime(exam_date, "%Y-%m-%d").date()
        except ValueError:
            _PLAN_JOBS[job_id] = {**_PLAN_JOBS[job_id], "status": "error", "error": "exam_date must be YYYY-MM-DD"}
            return
        days_until = max(1, (exam_dt - now_ist().date()).days)
        ctx = await build_user_ctx(user_id)
        _PLAN_JOBS[job_id] = {**_PLAN_JOBS[job_id], "progress": "drafting the strategy…"}

        prompt = build_study_plan_prompt(ctx, exam_date, days_until, daily_hours, weak_areas)
        chat = LlmChat(
            api_key=EMERGENT_LLM_KEY,
            session_id=f"plan_{uuid.uuid4().hex[:10]}",
            system_message="You produce concise, valid JSON study plans. Output ONLY JSON, no prose.",
        ).with_model(*MENTOR_MODEL)

        chunks: list = []
        async for ev in chat.stream_message(UserMessage(text=prompt)):
            if isinstance(ev, TextDelta):
                chunks.append(ev.content)
                if len(chunks) % 20 == 0:
                    _PLAN_JOBS[job_id] = {**_PLAN_JOBS[job_id], "progress": f"generating… ({sum(len(c) for c in chunks)} chars)"}
            elif isinstance(ev, StreamDone):
                break

        text = "".join(chunks).strip()
        if text.startswith("```"):
            text = re.sub(r"^```(?:json)?\s*", "", text)
            text = re.sub(r"\s*```$", "", text)
        try:
            plan_json = _json.loads(text)
        except Exception:
            m = re.search(r"\{[\s\S]*\}", text)
            if m:
                try:
                    plan_json = _json.loads(m.group(0))
                except Exception as e:
                    _PLAN_JOBS[job_id] = {**_PLAN_JOBS[job_id], "status": "error", "error": f"LLM returned non-JSON: {e}"}
                    return
            else:
                _PLAN_JOBS[job_id] = {**_PLAN_JOBS[job_id], "status": "error", "error": "LLM returned non-JSON"}
                return

        plan_id = f"plan_{uuid.uuid4().hex[:14]}"
        await db.study_plans.update_many(
            {"user_id": user_id, "status": "active"},
            {"$set": {"status": "archived"}},
        )
        doc = {
            "plan_id": plan_id, "user_id": user_id,
            "exam_date": exam_date, "daily_hours": daily_hours,
            "weak_areas": weak_areas, "plan_json": plan_json,
            "created_at": now_utc(), "status": "active",
        }
        await db.study_plans.insert_one(doc)
        plan_out = {k: v for k, v in doc.items() if k != "_id"}
        plan_out["created_at"] = plan_out["created_at"].isoformat()
        _PLAN_JOBS[job_id] = {**_PLAN_JOBS[job_id], "status": "done", "plan": plan_out, "progress": "done"}
    except Exception as e:
        logger.exception("plan job failed")
        _PLAN_JOBS[job_id] = {**_PLAN_JOBS[job_id], "status": "error", "error": str(e)}


@api_router.get("/study-plan/active")
async def study_plan_active(request: Request):
    user = await require_user(request)
    doc = await db.study_plans.find_one(
        {"user_id": user["user_id"], "status": "active"}, {"_id": 0}
    )
    if not doc:
        return None
    if isinstance(doc.get("created_at"), datetime):
        doc["created_at"] = doc["created_at"].isoformat()
    return doc


@api_router.post("/study-plan/{plan_id}/archive")
async def study_plan_archive(plan_id: str, request: Request):
    user = await require_user(request)
    r = await db.study_plans.update_one(
        {"plan_id": plan_id, "user_id": user["user_id"]},
        {"$set": {"status": "archived"}},
    )
    if r.matched_count == 0:
        raise HTTPException(404, "Not found")
    return {"ok": True}


# ============================================================
# ACCOUNT DATA RIGHTS (GDPR-lite)
# ============================================================

@api_router.get("/account/export")
@limiter.limit("5/hour")
async def account_export(request: Request):
    user = await require_user(request)
    uid = user["user_id"]

    def _norm(docs: list) -> list:
        out = []
        for d in docs:
            row = {}
            for k, v in d.items():
                if k == "_id":
                    continue
                if k in ("password_hash", "session_token"):
                    row[k] = "[REDACTED]"
                elif isinstance(v, datetime):
                    row[k] = v.isoformat()
                else:
                    row[k] = v
            out.append(row)
        return out

    profile = await db.users.find_one({"user_id": uid}) or {}
    sessions = await db.user_sessions.find({"user_id": uid}).to_list(1000)
    stats = await db.user_stats.find_one({"user_id": uid}) or {}
    focus_sessions = await db.focus_sessions.find({"user_id": uid}).to_list(10000)
    daily_focus = await db.daily_focus.find({"user_id": uid}).to_list(10000)
    achievements = await db.user_achievements.find({"user_id": uid}).to_list(1000)
    mentor_sessions = await db.mentor_sessions.find({"user_id": uid}).to_list(1000)
    mentor_messages = await db.mentor_messages.find({"user_id": uid}).to_list(10000)
    study_plans = await db.study_plans.find({"user_id": uid}).to_list(1000)
    syllabus_progress = await db.user_syllabus_progress.find({"user_id": uid}).to_list(2000)
    dismissed_alerts = await db.user_dismissed_alerts.find({"user_id": uid}).to_list(500)

    payload = {
        "exported_at": now_utc().isoformat(),
        "user_id": uid,
        "profile": _norm([profile])[0] if profile else None,
        "user_stats": _norm([stats])[0] if stats else None,
        "sessions_redacted": _norm(sessions),
        "focus_sessions": _norm(focus_sessions),
        "daily_focus": _norm(daily_focus),
        "achievements": _norm(achievements),
        "mentor_sessions": _norm(mentor_sessions),
        "mentor_messages": _norm(mentor_messages),
        "study_plans": _norm(study_plans),
        "syllabus_progress": _norm(syllabus_progress),
        "dismissed_alerts": _norm(dismissed_alerts),
    }
    log_event("account.export", user_id=uid, ip=_client_ip(request))
    filename = f"cagrid-export-{uid}-{now_utc().strftime('%Y%m%d')}.json"
    return JSONResponse(
        content=payload,
        headers={"Content-Disposition": f'attachment; filename="{filename}"'},
    )


async def _do_account_delete(request: Request, response: Response, body: Optional[dict]):
    """Shared cascade delete used by both DELETE and POST /api/account/delete."""
    # Parse confirmation. Accept either an already-parsed dict (from Pydantic) or
    # raw request body for the DELETE method (some clients / proxies drop bodies
    # on DELETE — we still enforce the guard).
    confirm = None
    if isinstance(body, dict):
        confirm = body.get("confirm")
    if confirm != "DELETE MY ACCOUNT":
        # Try one more read from raw request body for DELETE without body model
        try:
            raw = await request.json()
            if isinstance(raw, dict):
                confirm = raw.get("confirm")
        except Exception:
            pass
    if confirm != "DELETE MY ACCOUNT":
        raise HTTPException(status_code=400, detail="Confirmation string required")

    user = await require_user(request)
    uid = user["user_id"]
    # Cascade
    await db.user_sessions.delete_many({"user_id": uid})
    await db.focus_sessions.delete_many({"user_id": uid})
    await db.daily_focus.delete_many({"user_id": uid})
    await db.user_achievements.delete_many({"user_id": uid})
    await db.user_stats.delete_many({"user_id": uid})
    await db.mentor_messages.delete_many({"user_id": uid})
    await db.mentor_sessions.delete_many({"user_id": uid})
    await db.study_plans.delete_many({"user_id": uid})
    await db.password_reset_tokens.delete_many({"user_id": uid})
    await db.user_syllabus_progress.delete_many({"user_id": uid})
    await db.user_dismissed_alerts.delete_many({"user_id": uid})
    await db.mock_attempts.delete_many({"user_id": uid})
    await db.mock_answers.delete_many({"user_id": uid})
    await db.user_flashcard_progress.delete_many({"user_id": uid})
    await db.users.delete_one({"user_id": uid})
    response.delete_cookie("session_token", path="/", samesite="none", secure=True)
    log_event("account.delete", user_id=uid, ip=_client_ip(request))
    return {"ok": True}


@api_router.delete("/account/delete")
@limiter.limit("3/hour")
async def account_delete(request: Request, response: Response):
    """Destructive: requires JSON body `{"confirm":"DELETE MY ACCOUNT"}`.

    The DELETE method accepts a JSON body (per RFC 7231 §4.3.5 clients MAY send
    one). We enforce the confirmation string OR return 400.
    """
    return await _do_account_delete(request, response, None)


@api_router.post("/account/delete")
@limiter.limit("3/hour")
async def account_delete_post(body: AccountDeleteRequest, request: Request, response: Response):
    """Body-friendly alias for `DELETE /api/account/delete`.

    Same destructive semantics, same cascade, same rate limit. Prefer this from
    browsers where `fetch(url, {method:'DELETE', body})` semantics are wobbly.
    """
    return await _do_account_delete(request, response, {"confirm": body.confirm})


# ============================================================
# CLIENT ERROR REPORTING
# ============================================================

@api_router.post("/client-errors")
@limiter.limit("10/minute")
async def client_errors(body: ClientErrorBody, request: Request):
    """Frontend ErrorBoundary reports here. Rate-limited by IP to prevent log spam."""
    user = await get_current_user(request)
    log_event(
        "client.error",
        user_id=user["user_id"] if user else None,
        message=body.message[:500],
        url=(body.url or "")[:200],
        user_agent=(body.user_agent or request.headers.get("user-agent", ""))[:200],
        ip=_client_ip(request),
        stack=(body.stack or "")[:2000],
    )
    return {"ok": True}


# ============================================================
# SEED
# ============================================================

from seed_syllabus import SYLLABUS_V2 as SYLLABUS_SEED
from seed_radar import REGULATORY_ALERTS
from seed_content import CONTENT_POSTS
from seed_mocks import ALL_QUESTIONS as MOCK_QUESTIONS_SEED, MOCK_TESTS
from seed_flashcards import FLASHCARD_DECKS, FLASHCARDS

DEMO_SUBJECTS = ["Advanced Accounts", "Business Law", "Taxation", "Costing", "Auditing", "Financial Management"]

async def seed_demo_focus_data(user_id: str):
    """Create ~40 focus sessions across last 30 days with a 14-day active streak ending today."""
    # Clear previous demo sessions for idempotency
    await db.focus_sessions.delete_many({"user_id": user_id})
    await db.daily_focus.delete_many({"user_id": user_id})
    await db.user_achievements.delete_many({"user_id": user_id})

    rng = random.Random(42)  # deterministic
    today = now_ist().date()
    # active streak = last 14 days, all present
    streak_start = today - timedelta(days=13)
    # earlier 16 days: skip 1-2 random days, otherwise present
    earlier_dates = [today - timedelta(days=i) for i in range(14, 30)]
    skip = set(rng.sample(earlier_dates, k=2))
    active_dates = [today - timedelta(days=i) for i in range(14)] + [d for d in earlier_dates if d not in skip]

    subjects_cycle = list(DEMO_SUBJECTS)
    total_minutes = 0
    total_xp = 0
    session_docs = []
    daily_min = {}

    # ~ 40 sessions distributed
    total_sessions = 40
    # weight days: today gets more; older slightly less
    weights = [max(0.4, 1.4 - (today - d).days * 0.02) for d in active_dates]
    total_w = sum(weights)
    counts_per_day = [max(1, round(total_sessions * w / total_w)) for w in weights]

    # heavy morning/evening distribution
    def sample_hour():
        r = rng.random()
        if r < 0.35: return rng.choice([8, 9, 10, 11])
        if r < 0.70: return rng.choice([20, 21, 22, 23])
        if r < 0.85: return rng.choice([14, 15, 16])
        return rng.choice([6, 7, 12, 13, 17, 18, 19])

    for d, count in zip(active_dates, counts_per_day):
        for _ in range(count):
            hour = sample_hour()
            minute = rng.randint(0, 55)
            # Duration: mostly 25-50, some 60-90
            r = rng.random()
            if r < 0.55: dur_min = rng.choice([25, 30, 35, 40, 45, 50])
            elif r < 0.85: dur_min = rng.choice([50, 55, 60])
            else: dur_min = rng.choice([75, 90])
            started_local = IST.localize(datetime(d.year, d.month, d.day, hour, minute))
            started_utc = started_local.astimezone(timezone.utc)
            ended_utc = started_utc + timedelta(minutes=dur_min)
            subject = subjects_cycle[len(session_docs) % len(subjects_cycle)]
            xp = dur_min + 10  # simplified per-session xp (bonuses computed post-hoc)
            total_minutes += dur_min
            total_xp += xp
            session_docs.append({
                "session_id": new_session_id(),
                "user_id": user_id,
                "subject": subject,
                "planned_duration_seconds": dur_min * 60,
                "actual_duration_seconds": dur_min * 60,
                "started_at": started_utc,
                "ended_at": ended_utc,
                "status": "completed",
                "xp_awarded": xp,
                "ambient_track": rng.choice([None, "rain", "lofi", "brown"]),
            })
            k = d.strftime("%Y-%m-%d")
            daily_min[k] = daily_min.get(k, {"minutes": 0, "sessions": 0})
            daily_min[k]["minutes"] += dur_min
            daily_min[k]["sessions"] += 1

    # First-of-day bonuses: +20 per unique day
    total_xp += 20 * len(daily_min)

    if session_docs:
        await db.focus_sessions.insert_many(session_docs)
    daily_docs = [{"user_id": user_id, "date": k, "minutes": v["minutes"], "sessions": v["sessions"]}
                  for k, v in daily_min.items()]
    if daily_docs:
        await db.daily_focus.insert_many(daily_docs)

    # user_stats
    await db.user_stats.update_one(
        {"user_id": user_id},
        {"$set": {
            "user_id": user_id,
            "total_xp": total_xp,
            "current_streak": 14, "best_streak": 14,
            "last_active_date": today.strftime("%Y-%m-%d"),
            "streak_freezes_available": 1,
            "last_freeze_reset": monday_of_week_ist(),
            "total_focus_minutes": total_minutes,
            "sessions_completed": len(session_docs),
        }},
        upsert=True,
    )

    # Unlock the specified badges (level_5 auto-included since demo is level 8)
    for bid in ["first_focus", "hour_one", "streak_3", "streak_7", "hour_25",
                "night_owl", "weekend_warrior", "polymath", "founder_grid",
                "level_5"]:
        await unlock_badge(user_id, bid)

    logger.info(f"Seeded demo focus data: {len(session_docs)} sessions, {total_minutes} min, xp={total_xp}")

async def seed_demo_mentor_and_plan(user_id: str):
    """Idempotent seed of 2 mentor sessions + 1 active study plan for demo."""
    # Wipe previous demo mentor content
    await db.mentor_sessions.delete_many({"user_id": user_id})
    await db.mentor_messages.delete_many({"user_id": user_id})
    await db.study_plans.delete_many({"user_id": user_id})

    now = now_utc()
    # Session 1
    s1 = f"mses_{uuid.uuid4().hex[:14]}"
    await db.mentor_sessions.insert_one({
        "session_id": s1, "user_id": user_id,
        "title": "Explain Ind AS 115 revenue recognition",
        "mode": "exam",
        "created_at": now - timedelta(days=2), "updated_at": now - timedelta(days=2, hours=-1),
        "message_count": 4, "deleted": False,
    })
    m1 = [
        ("user", "Explain Ind AS 115 in a way I can retain for the exam.", None),
        ("assistant",
         "**Ind AS 115 · Revenue from Contracts with Customers** — the five-step model:\n\n"
         "1. **Identify the contract** — enforceable rights + payment terms + commercial substance.\n"
         "2. **Identify performance obligations** — distinct goods/services.\n"
         "3. **Determine transaction price** — fixed + variable consideration (constrained).\n"
         "4. **Allocate the price** — to each obligation on standalone selling price basis.\n"
         "5. **Recognise revenue** — when (or as) each obligation is satisfied.\n\n"
         "Key rule: revenue follows the *transfer of control*, not billing or cash. Point-in-time vs. over-time depends on whether the customer benefits as work is performed.\n\n"
         "**Exam trap** — bundled contracts (SaaS + implementation): usually two obligations, allocate price.\n\n"
         "SOURCES:\n"
         "- Act/Standard: Ind AS 115\n"
         "- Section/Para: Para 9-13 (Identify contract), Para 22-30 (Obligations), Para 46-72 (Transaction price)\n",
         [
             {"act": "Ind AS 115", "section": "Para 9-13", "note": "Identify contract"},
             {"act": "Ind AS 115", "section": "Para 22-30", "note": "Performance obligations"},
             {"act": "Ind AS 115", "section": "Para 46-72", "note": "Transaction price"},
         ]),
        ("user", "What's the practical difference vs the old AS 9?", None),
        ("assistant",
         "AS 9 was **risks-and-rewards** based; Ind AS 115 is **control-based**. In AS 9, revenue was recognised when significant risks and rewards transferred — a proxy. In Ind AS 115, revenue moves when control transfers, judged by: ability to direct use + obtain economic benefits. This changes timing for bill-and-hold, consignment sales, and construction contracts (Ind AS 115 replaces AS 7 for construction).\n\n"
         "SOURCES:\n"
         "- Act/Standard: Ind AS 115 vs AS 9\n"
         "- Section/Para: Ind AS 115 Para 31 (Control transfer)\n",
         [{"act": "Ind AS 115", "section": "Para 31", "note": "Control transfer definition"}]),
    ]
    for role, content, cits in m1:
        await db.mentor_messages.insert_one({
            "message_id": f"mmsg_{uuid.uuid4().hex[:14]}",
            "session_id": s1, "user_id": user_id,
            "role": role, "content": content, "citations": cits,
            "tokens_used": None, "created_at": now - timedelta(days=2, minutes=-len(cits or []) if cits else 0),
        })

    # Session 2
    s2 = f"mses_{uuid.uuid4().hex[:14]}"
    await db.mentor_sessions.insert_one({
        "session_id": s2, "user_id": user_id,
        "title": "GST on export of services",
        "mode": "exam",
        "created_at": now - timedelta(hours=6), "updated_at": now - timedelta(hours=5),
        "message_count": 2, "deleted": False,
    })
    m2 = [
        ("user", "Is export of services zero-rated under GST? What's the LUT vs IGST route?", None),
        ("assistant",
         "Yes — under Section 16 of the IGST Act, exports of services are **zero-rated supplies**. You have two routes:\n\n"
         "| Route | How | Refund |\n|---|---|---|\n| **LUT (Letter of Undertaking)** | Export without paying IGST | Claim refund of accumulated ITC |\n| **IGST payment** | Pay IGST, then claim refund of IGST | Automatic under Rule 96 |\n\n"
         "Conditions for 'export of services' (all five): supplier in India, recipient outside India, place of supply outside India, payment in convertible foreign exchange, supplier and recipient not merely establishments of the same person.\n\n"
         "SOURCES:\n"
         "- Act/Standard: IGST Act, 2017\n"
         "- Section/Para: Section 2(6) (Export definition), Section 16 (Zero-rated)\n"
         "- Act/Standard: CGST Rules, 2017\n"
         "- Section/Para: Rule 89 (Refund of ITC), Rule 96 (Refund of IGST)\n",
         [
             {"act": "IGST Act, 2017", "section": "Section 2(6)", "note": "Export of services definition"},
             {"act": "IGST Act, 2017", "section": "Section 16", "note": "Zero-rated supplies"},
             {"act": "CGST Rules, 2017", "section": "Rule 89 / Rule 96", "note": "Refund mechanics"},
         ]),
    ]
    for role, content, cits in m2:
        await db.mentor_messages.insert_one({
            "message_id": f"mmsg_{uuid.uuid4().hex[:14]}",
            "session_id": s2, "user_id": user_id,
            "role": role, "content": content, "citations": cits,
            "tokens_used": None, "created_at": now - timedelta(hours=6),
        })

    # Study plan (~12-week light plan; pre-authored)
    exam_date = (now_ist().date() + timedelta(days=90)).strftime("%Y-%m-%d")
    subjects_rotate = ["Advanced Accounts", "Costing", "Business Law", "Taxation", "Auditing", "Financial Management"]
    weeks = []
    cur_date = now_ist().date() + timedelta(days=1)
    for w in range(1, 13):
        # Align to Monday if desired; keep simple continuous days
        days = []
        for d in range(7):
            date_str = cur_date.strftime("%Y-%m-%d")
            subj = subjects_rotate[(w + d) % len(subjects_rotate)]
            # bias hours to weak areas in first 10 weeks; mock tests in last 2
            if w >= 11:
                tasks = [f"{subj} — full mock #{d + 1}", "Review answers + weak-topic drill"]
                hours = 4
            else:
                bias = 4.5 if subj in ("Advanced Accounts", "Costing") else 3.5
                tasks = [f"{subj} — Chapter block {d + 1}", "40 practice problems", "1 quick recap"]
                hours = bias
            days.append({"date": date_str, "subject": subj, "hours": hours, "tasks": tasks})
            cur_date += timedelta(days=1)
        weeks.append({"week": w, "days": days})
    plan_json = {
        "summary": "12-week plan biased toward Advanced Accounts and Costing (flagged weak areas), rotating full syllabus with final 2 weeks reserved for mocks + weak-topic drills.",
        "weeks": weeks,
    }
    await db.study_plans.insert_one({
        "plan_id": f"plan_{uuid.uuid4().hex[:14]}", "user_id": user_id,
        "exam_date": exam_date, "daily_hours": 4,
        "weak_areas": ["Advanced Accounts", "Costing"],
        "plan_json": plan_json,
        "created_at": now_utc(), "status": "active",
    })

async def run_seed():
    # achievements
    for b in BADGES_SEED:
        await db.achievements.update_one({"badge_id": b["badge_id"]}, {"$set": b}, upsert=True)

    # Demo user
    demo_email = "demo@cagrid.in"
    existing = await db.users.find_one({"email": demo_email}, {"_id": 0})
    if not existing:
        demo_id = new_user_id()
        await db.users.insert_one({
            "user_id": demo_id, "email": demo_email, "name": "Demo Aspirant",
            "picture": None, "auth_provider": "email",
            "password_hash": hash_password("demo123"),
            "journey_level": "Intermediate", "daily_goal_minutes": 180,
            "subjects": DEMO_SUBJECTS, "fit_score": None, "onboarded": True,
            "city": "Mumbai",
            "created_at": now_utc(),
        })
        logger.info(f"Seeded demo user_id={demo_id}")
    else:
        await db.users.update_one(
            {"email": demo_email},
            {"$set": {
                "password_hash": hash_password("demo123"),
                "journey_level": "Intermediate",
                "daily_goal_minutes": 180,
                "subjects": DEMO_SUBJECTS,
                "onboarded": True,
                "auth_provider": "email",
                "city": "Mumbai",
            }}
        )
    demo = await db.users.find_one({"email": demo_email}, {"_id": 0})
    await seed_demo_focus_data(demo["user_id"])
    await seed_demo_mentor_and_plan(demo["user_id"])

    # Syllabus — force reseed if any paper has empty chapters (Phase 4 migration)
    existing_count = await db.syllabus.count_documents({})
    empty_count = await db.syllabus.count_documents({"chapters": {"$size": 0}})
    if existing_count == 0 or empty_count > 0:
        await db.syllabus.delete_many({})
        await db.syllabus.insert_many(SYLLABUS_SEED)
        logger.info(f"Seeded syllabus (papers={len(SYLLABUS_SEED)})")

    # Regulatory alerts
    if await db.regulatory_alerts.count_documents({}) == 0:
        await db.regulatory_alerts.insert_many([{**a} for a in REGULATORY_ALERTS])
        logger.info(f"Seeded regulatory alerts ({len(REGULATORY_ALERTS)})")

    # Content posts
    if await db.content_posts.count_documents({}) == 0:
        await db.content_posts.insert_many([{**p} for p in CONTENT_POSTS])
        logger.info(f"Seeded content posts ({len(CONTENT_POSTS)})")

    # Phase 5 — Question bank + mock tests
    if await db.question_bank.count_documents({}) == 0:
        await db.question_bank.insert_many([{**q} for q in MOCK_QUESTIONS_SEED])
        logger.info(f"Seeded question bank ({len(MOCK_QUESTIONS_SEED)})")
    if await db.mock_tests.count_documents({}) == 0:
        await db.mock_tests.insert_many([{**m, "created_at": now_utc()} for m in MOCK_TESTS])
        logger.info(f"Seeded mock tests ({len(MOCK_TESTS)})")

    # Phase 5 — Flashcards
    if await db.flashcard_decks.count_documents({}) == 0:
        await db.flashcard_decks.insert_many([{**d} for d in FLASHCARD_DECKS])
        logger.info(f"Seeded flashcard decks ({len(FLASHCARD_DECKS)})")
    if await db.flashcards.count_documents({}) == 0:
        await db.flashcards.insert_many([{**c} for c in FLASHCARDS])
        logger.info(f"Seeded flashcards ({len(FLASHCARDS)})")

    # Demo mock attempts (3 seeded)
    if demo and await db.mock_attempts.count_documents({"user_id": demo["user_id"], "status": "submitted"}) == 0:
        demo_attempts = [
            ("mock_i3_tax_speed", 22.0, 6.6, 30, 900, 68, ["GST"], ["Direct Tax"]),
            ("mock_i5_audit", 42.0, 25.2, 60, 3200, 55, ["Ethics"], ["Nature of Audit"]),
            ("mock_i4_costing", 46.0, 42.0, 60, 2900, 72, [], ["Marginal Costing", "Standard Costing"]),
        ]
        for mid, score, marks, total, tsec, pct, weak, strong in demo_attempts:
            await db.mock_attempts.insert_one({
                "attempt_id": f"att_seed_{uuid.uuid4().hex[:10]}",
                "user_id": demo["user_id"], "mock_id": mid,
                "paper_code": mid.split("_")[1].upper(),
                "started_at": now_utc() - timedelta(days=random.randint(2, 20)),
                "submitted_at": now_utc() - timedelta(days=random.randint(1, 20)),
                "status": "submitted", "time_taken_seconds": tsec,
                "score": score, "marks_obtained": marks, "total_marks": total,
                "percentile_estimate": pct, "weak_topics": weak, "strong_topics": strong,
            })
        logger.info("Seeded demo mock attempts (3)")

    # Demo flashcard progress on ~40 cards
    if demo and await db.user_flashcard_progress.count_documents({"user_id": demo["user_id"]}) == 0:
        all_cards = await db.flashcards.find({}, {"_id": 0, "card_id": 1}).to_list(300)
        subset = all_cards[:40]
        now = now_utc()
        rows = []
        for i, c in enumerate(subset):
            if i < 12:  # due today
                due_dt = now - timedelta(days=1)
                reps, ease, interval = 2, 2.5, 1
            elif i < 24:  # mastered
                due_dt = now + timedelta(days=15)
                reps, ease, interval = 5, 2.7, 15
            else:  # future due
                due_dt = now + timedelta(days=3)
                reps, ease, interval = 3, 2.5, 3
            rows.append({
                "user_id": demo["user_id"], "card_id": c["card_id"],
                "ease_factor": ease, "interval_days": interval, "repetitions": reps,
                "due_date": due_dt, "last_reviewed": now - timedelta(days=random.randint(1, 5)),
                "last_grade": 2, "total_reviews": reps + 1,
            })
        if rows:
            await db.user_flashcard_progress.insert_many(rows)
            logger.info(f"Seeded demo flashcard progress ({len(rows)})")

    # Demo user syllabus progress — 30% mastered on Accounting, 50% in progress on Laws
    if demo and await db.user_syllabus_progress.count_documents({"user_id": demo["user_id"]}) == 0:
        i1 = await db.syllabus.find_one({"paper_code": "I1"}, {"_id": 0})
        i2 = await db.syllabus.find_one({"paper_code": "I2"}, {"_id": 0})
        rows = []
        if i1:
            chapters = i1.get("chapters", [])
            mastered_n = max(1, int(len(chapters) * 0.3))
            for c in chapters[:mastered_n]:
                rows.append({
                    "user_id": demo["user_id"], "paper_code": "I1",
                    "chapter_id": c["chapter_id"], "status": "mastered",
                    "notes": None, "revised_count": 2, "updated_at": now_utc(),
                })
        if i2:
            chapters = i2.get("chapters", [])
            in_prog_n = max(1, int(len(chapters) * 0.5))
            for c in chapters[:in_prog_n]:
                rows.append({
                    "user_id": demo["user_id"], "paper_code": "I2",
                    "chapter_id": c["chapter_id"], "status": "in_progress",
                    "notes": None, "revised_count": 0, "updated_at": now_utc(),
                })
        if rows:
            await db.user_syllabus_progress.insert_many(rows)
            logger.info(f"Seeded demo syllabus progress ({len(rows)} rows)")

@api_router.post("/seed")
async def seed_endpoint():
    await run_seed()
    demo = await db.users.find_one({"email": "demo@cagrid.in"}, {"_id": 0})
    return {"ok": True, "demo_user_id": demo["user_id"] if demo else None}

# ---------- App wiring ----------
app.include_router(api_router)

# --- Rate limiter wiring ---
app.state.limiter = limiter

async def _rate_limit_handler(request: Request, exc: RateLimitExceeded):
    # SlowAPI attaches the rendered limit description on `exc.detail`
    # (e.g. "5 per 1 minute"). Parse the unit → seconds; fall back to 60s.
    retry_after = 60
    try:
        raw = str(getattr(exc, "detail", "") or "")
        low = raw.lower()
        if "second" in low:
            # e.g. "10 per 30 second"
            num = re.search(r"per\s+(\d+)\s*second", low)
            retry_after = int(num.group(1)) if num else 1
        elif "minute" in low:
            num = re.search(r"per\s+(\d+)\s*minute", low)
            retry_after = (int(num.group(1)) if num else 1) * 60
        elif "hour" in low:
            num = re.search(r"per\s+(\d+)\s*hour", low)
            retry_after = (int(num.group(1)) if num else 1) * 3600
        elif "day" in low:
            num = re.search(r"per\s+(\d+)\s*day", low)
            retry_after = (int(num.group(1)) if num else 1) * 86400
    except Exception:
        retry_after = 60
    log_event(
        "ratelimit.exceeded",
        path=request.url.path,
        ip=_client_ip(request),
        retry_after=retry_after,
    )
    return JSONResponse(
        status_code=429,
        content={"detail": "Rate limit exceeded", "retry_after": retry_after},
        headers={"Retry-After": str(retry_after)},
    )

app.add_exception_handler(RateLimitExceeded, _rate_limit_handler)

# --- CORS: locked allowlist ---
_frontend_url = os.environ.get("REACT_APP_BACKEND_URL", "") or ""
_frontend_host = ""
if _frontend_url:
    m = re.match(r"^(https?://[^/]+)", _frontend_url)
    _frontend_host = re.escape(m.group(1)) if m else ""
_origin_regex_parts = [
    r"https://[a-z0-9-]+\.preview\.emergentagent\.com",
    r"https://[a-z0-9-]+\.internal\.preview\.emergentagent\.com",
    r"http://localhost(:\d+)?",
    r"http://127\.0\.0\.1(:\d+)?",
]
if _frontend_host:
    _origin_regex_parts.append(_frontend_host)
CORS_ORIGIN_REGEX = r"^(" + "|".join(_origin_regex_parts) + r")$"

app.add_middleware(
    CORSMiddleware,
    allow_credentials=True,
    allow_origin_regex=CORS_ORIGIN_REGEX,
    allow_methods=["GET", "POST", "PUT", "DELETE", "OPTIONS", "PATCH"],
    allow_headers=["*"],
    expose_headers=["*"],
)

# --- Security headers middleware ---
CSP_POLICY = (
    "default-src 'self'; "
    "script-src 'self' 'unsafe-inline' 'unsafe-eval' https://assets.emergent.sh "
    "https://*.i.posthog.com https://us.i.posthog.com; "
    "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com; "
    "img-src 'self' data: blob: https:; "
    "font-src 'self' https://fonts.gstatic.com data:; "
    "connect-src 'self' https: wss:; "
    "media-src 'self' https: blob:; "
    "frame-ancestors 'none'; "
    "base-uri 'self'; "
    "form-action 'self'; "
    "object-src 'none'"
)

class SecurityHeadersMiddleware(BaseHTTPMiddleware):
    async def dispatch(self, request: Request, call_next):
        response = await call_next(request)
        response.headers["Strict-Transport-Security"] = "max-age=63072000; includeSubDomains; preload"
        response.headers["X-Frame-Options"] = "DENY"
        response.headers["X-Content-Type-Options"] = "nosniff"
        response.headers["Referrer-Policy"] = "strict-origin-when-cross-origin"
        response.headers["Permissions-Policy"] = (
            "camera=(), microphone=(), geolocation=(), interest-cohort=()"
        )
        response.headers["Cross-Origin-Opener-Policy"] = "same-origin-allow-popups"
        # Only apply CSP to HTML/JSON responses (avoid clobbering static)
        response.headers.setdefault("Content-Security-Policy", CSP_POLICY)
        return response

app.add_middleware(SecurityHeadersMiddleware)

@app.on_event("startup")
async def startup():
    try:
        await db.users.create_index("email", unique=True)
        await db.users.create_index("user_id", unique=True)
        await db.user_sessions.create_index("session_token", unique=True)
        await db.user_sessions.create_index("user_id")
        await db.user_sessions.create_index("expires_at", expireAfterSeconds=0)
        await db.focus_sessions.create_index([("user_id", 1), ("status", 1)])
        await db.focus_sessions.create_index([("user_id", 1), ("started_at", -1)])
        await db.focus_sessions.create_index("session_id", unique=True)
        await db.daily_focus.create_index([("user_id", 1), ("date", 1)], unique=True)
        await db.user_stats.create_index("user_id", unique=True)
        await db.user_achievements.create_index([("user_id", 1), ("badge_id", 1)], unique=True)
        await db.achievements.create_index("badge_id", unique=True)
        await db.mentor_sessions.create_index([("user_id", 1), ("updated_at", -1)])
        await db.mentor_sessions.create_index("session_id", unique=True)
        await db.mentor_messages.create_index([("session_id", 1), ("created_at", 1)])
        await db.mentor_messages.create_index("message_id", unique=True)
        await db.study_plans.create_index([("user_id", 1), ("status", 1)])
        await db.study_plans.create_index("plan_id", unique=True)
        await db.password_reset_tokens.create_index("token", unique=True)
        await db.password_reset_tokens.create_index("expires_at", expireAfterSeconds=0)
        await db.user_syllabus_progress.create_index([("user_id", 1), ("chapter_id", 1)], unique=True)
        await db.user_syllabus_progress.create_index([("user_id", 1), ("paper_code", 1)])
        await db.user_dismissed_alerts.create_index([("user_id", 1), ("alert_id", 1)], unique=True)
        await db.regulatory_alerts.create_index("alert_id", unique=True)
        await db.regulatory_alerts.create_index([("published_at", -1)])
        await db.regulatory_alerts.create_index("affected_levels")
        await db.content_posts.create_index("slug", unique=True)
        await db.content_posts.create_index([("published_at", -1)])
        await db.question_bank.create_index("question_id", unique=True)
        await db.question_bank.create_index("paper_code")
        await db.mock_tests.create_index("mock_id", unique=True)
        await db.mock_attempts.create_index("attempt_id", unique=True)
        await db.mock_attempts.create_index([("user_id", 1), ("started_at", -1)])
        await db.mock_answers.create_index([("attempt_id", 1), ("question_id", 1)], unique=True)
        await db.flashcard_decks.create_index("deck_id", unique=True)
        await db.flashcards.create_index("card_id", unique=True)
        await db.flashcards.create_index("deck_id")
        await db.user_flashcard_progress.create_index([("user_id", 1), ("card_id", 1)], unique=True)
        await db.user_flashcard_progress.create_index([("user_id", 1), ("due_date", 1)])
    except Exception as e:
        logger.warning(f"Index setup: {e}")
    await run_seed()

@app.on_event("shutdown")
async def shutdown():
    client.close()
