"""
The CA Grid — FastAPI backend
Auth (Emergent Google OAuth + Email/Password), onboarding, seed.
"""
from fastapi import FastAPI, APIRouter, HTTPException, Request, Response, Cookie, Header
from fastapi.responses import JSONResponse
from dotenv import load_dotenv
from starlette.middleware.cors import CORSMiddleware
from motor.motor_asyncio import AsyncIOMotorClient
import os
import logging
import uuid
import secrets
from pathlib import Path
from pydantic import BaseModel, EmailStr, Field
from typing import Optional, List
from datetime import datetime, timezone, timedelta
import httpx
import bcrypt

ROOT_DIR = Path(__file__).parent
load_dotenv(ROOT_DIR / '.env')

# MongoDB
mongo_url = os.environ['MONGO_URL']
client = AsyncIOMotorClient(mongo_url)
db = client[os.environ['DB_NAME']]

app = FastAPI(title="The CA Grid API")
api_router = APIRouter(prefix="/api")

logging.basicConfig(level=logging.INFO, format='%(asctime)s - %(name)s - %(levelname)s - %(message)s')
logger = logging.getLogger(__name__)

# ---------- Constants ----------
SESSION_TTL_DAYS = 7
EMERGENT_SESSION_URL = "https://demobackend.emergentagent.com/auth/v1/env/oauth/session-data"

# ---------- Utils ----------
def now_utc() -> datetime:
    return datetime.now(timezone.utc)

def new_user_id() -> str:
    return f"user_{uuid.uuid4().hex[:12]}"

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
        "created_at": u.get("created_at"),
    }

async def get_current_user(request: Request) -> Optional[dict]:
    """Get user from session_token cookie OR Authorization: Bearer header."""
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

    user_doc = await db.users.find_one({"user_id": session_doc["user_id"]}, {"_id": 0})
    return user_doc

def set_session_cookie(response: Response, session_token: str):
    max_age = SESSION_TTL_DAYS * 24 * 60 * 60
    response.set_cookie(
        key="session_token",
        value=session_token,
        max_age=max_age,
        expires=max_age,
        path="/",
        httponly=True,
        secure=True,
        samesite="none",
    )

async def create_session_for_user(user_id: str) -> str:
    session_token = secrets.token_urlsafe(48)
    await db.user_sessions.insert_one({
        "user_id": user_id,
        "session_token": session_token,
        "expires_at": now_utc() + timedelta(days=SESSION_TTL_DAYS),
        "created_at": now_utc(),
    })
    return session_token

# ---------- Models ----------
class SignupBody(BaseModel):
    email: EmailStr
    password: str = Field(min_length=6, max_length=200)
    name: str = Field(min_length=1, max_length=120)

class LoginBody(BaseModel):
    email: EmailStr
    password: str

class OnboardingBody(BaseModel):
    journey_level: str
    daily_goal_minutes: int = Field(ge=15, le=720)
    subjects: List[str] = []
    fit_score: Optional[int] = None
    onboarded: bool = True

# ---------- Routes: health ----------
@api_router.get("/")
async def root():
    return {"message": "The CA Grid API"}

# ---------- Routes: auth ----------
@api_router.post("/auth/signup")
async def auth_signup(body: SignupBody, response: Response):
    existing = await db.users.find_one({"email": body.email.lower()}, {"_id": 0})
    if existing:
        raise HTTPException(status_code=400, detail="Email already registered")

    user_id = new_user_id()
    doc = {
        "user_id": user_id,
        "email": body.email.lower(),
        "name": body.name.strip(),
        "picture": None,
        "auth_provider": "email",
        "password_hash": hash_password(body.password),
        "journey_level": None,
        "daily_goal_minutes": 180,
        "subjects": [],
        "fit_score": None,
        "onboarded": False,
        "created_at": now_utc(),
    }
    await db.users.insert_one(doc)
    token = await create_session_for_user(user_id)
    set_session_cookie(response, token)
    return {"user": sanitize_user(doc), "session_token": token}


@api_router.post("/auth/login")
async def auth_login(body: LoginBody, response: Response):
    user = await db.users.find_one({"email": body.email.lower()}, {"_id": 0})
    if not user or not user.get("password_hash"):
        raise HTTPException(status_code=401, detail="Invalid credentials")
    if not verify_password(body.password, user["password_hash"]):
        raise HTTPException(status_code=401, detail="Invalid credentials")
    token = await create_session_for_user(user["user_id"])
    set_session_cookie(response, token)
    return {"user": sanitize_user(user), "session_token": token}


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
        await db.users.update_one(
            {"user_id": user_id},
            {"$set": {"name": name, "picture": picture}}
        )
        user_doc = await db.users.find_one({"user_id": user_id}, {"_id": 0})
    else:
        user_id = new_user_id()
        user_doc = {
            "user_id": user_id,
            "email": email,
            "name": name,
            "picture": picture,
            "auth_provider": "google",
            "password_hash": None,
            "journey_level": None,
            "daily_goal_minutes": 180,
            "subjects": [],
            "fit_score": None,
            "onboarded": False,
            "created_at": now_utc(),
        }
        await db.users.insert_one(user_doc)

    # Store session in mongo (idempotent on the token)
    await db.user_sessions.update_one(
        {"session_token": session_token},
        {"$set": {
            "user_id": user_id,
            "session_token": session_token,
            "expires_at": now_utc() + timedelta(days=SESSION_TTL_DAYS),
            "created_at": now_utc(),
        }},
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
    if token:
        await db.user_sessions.delete_one({"session_token": token})
    response.delete_cookie("session_token", path="/", samesite="none", secure=True)
    return {"ok": True}


# ---------- Routes: onboarding ----------
@api_router.post("/onboarding")
async def save_onboarding(body: OnboardingBody, request: Request):
    user = await get_current_user(request)
    if not user:
        raise HTTPException(status_code=401, detail="Not authenticated")
    update = {
        "journey_level": body.journey_level,
        "daily_goal_minutes": body.daily_goal_minutes,
        "subjects": body.subjects,
        "fit_score": body.fit_score,
        "onboarded": body.onboarded,
    }
    await db.users.update_one({"user_id": user["user_id"]}, {"$set": update})
    updated = await db.users.find_one({"user_id": user["user_id"]}, {"_id": 0})
    return sanitize_user(updated)


# ---------- Routes: syllabus ----------
@api_router.get("/syllabus")
async def get_syllabus(level: Optional[str] = None):
    q = {"level": level} if level else {}
    docs = await db.syllabus.find(q, {"_id": 0}).to_list(200)
    return docs


# ---------- Routes: seed ----------
SYLLABUS_SEED = [
    # Foundation (4 papers)
    {"level": "Foundation", "paper_code": "F1", "paper_name": "Principles and Practice of Accounting", "chapters": []},
    {"level": "Foundation", "paper_code": "F2", "paper_name": "Business Laws and Business Correspondence & Reporting", "chapters": []},
    {"level": "Foundation", "paper_code": "F3", "paper_name": "Business Mathematics, Logical Reasoning and Statistics", "chapters": []},
    {"level": "Foundation", "paper_code": "F4", "paper_name": "Business Economics and Business & Commercial Knowledge", "chapters": []},
    # Intermediate (6 papers)
    {"level": "Intermediate", "paper_code": "I1", "paper_name": "Advanced Accounting", "chapters": []},
    {"level": "Intermediate", "paper_code": "I2", "paper_name": "Corporate and Other Laws", "chapters": []},
    {"level": "Intermediate", "paper_code": "I3", "paper_name": "Cost and Management Accounting", "chapters": []},
    {"level": "Intermediate", "paper_code": "I4", "paper_name": "Taxation", "chapters": []},
    {"level": "Intermediate", "paper_code": "I5", "paper_name": "Auditing and Ethics", "chapters": []},
    {"level": "Intermediate", "paper_code": "I6", "paper_name": "Financial and Strategic Management", "chapters": []},
    # Final (6 papers)
    {"level": "Final", "paper_code": "P1", "paper_name": "Financial Reporting", "chapters": []},
    {"level": "Final", "paper_code": "P2", "paper_name": "Advanced Financial Management", "chapters": []},
    {"level": "Final", "paper_code": "P3", "paper_name": "Advanced Auditing, Assurance and Professional Ethics", "chapters": []},
    {"level": "Final", "paper_code": "P4", "paper_name": "Direct Tax Laws and International Taxation", "chapters": []},
    {"level": "Final", "paper_code": "P5", "paper_name": "Indirect Tax Laws", "chapters": []},
    {"level": "Final", "paper_code": "P6", "paper_name": "Integrated Business Solutions (Multi-disciplinary Case Study)", "chapters": []},
]

async def run_seed():
    # Demo user
    demo_email = "demo@cagrid.in"
    existing = await db.users.find_one({"email": demo_email}, {"_id": 0})
    if not existing:
        demo_id = new_user_id()
        await db.users.insert_one({
            "user_id": demo_id,
            "email": demo_email,
            "name": "Demo Aspirant",
            "picture": None,
            "auth_provider": "email",
            "password_hash": hash_password("demo123"),
            "journey_level": "Foundation",
            "daily_goal_minutes": 180,
            "subjects": ["Accounting", "Business Laws"],
            "fit_score": None,
            "onboarded": True,
            "created_at": now_utc(),
        })
        logger.info(f"Seeded demo user user_id={demo_id}")
    else:
        # Ensure demo user is onboarded & password fresh (idempotent)
        await db.users.update_one(
            {"email": demo_email},
            {"$set": {
                "password_hash": hash_password("demo123"),
                "journey_level": "Foundation",
                "daily_goal_minutes": 180,
                "onboarded": True,
                "auth_provider": "email",
            }}
        )

    # Syllabus
    if await db.syllabus.count_documents({}) == 0:
        await db.syllabus.insert_many(SYLLABUS_SEED)
        logger.info("Seeded syllabus")


@api_router.post("/seed")
async def seed_endpoint():
    await run_seed()
    demo = await db.users.find_one({"email": "demo@cagrid.in"}, {"_id": 0})
    return {"ok": True, "demo_user_id": demo["user_id"] if demo else None}


# ---------- App wiring ----------
app.include_router(api_router)

# CORS: allow_credentials requires echoing the origin (regex).
app.add_middleware(
    CORSMiddleware,
    allow_credentials=True,
    allow_origin_regex=".*",
    allow_methods=["*"],
    allow_headers=["*"],
)

@app.on_event("startup")
async def startup():
    # Indexes
    try:
        await db.users.create_index("email", unique=True)
        await db.users.create_index("user_id", unique=True)
        await db.user_sessions.create_index("session_token", unique=True)
        await db.user_sessions.create_index("user_id")
        await db.user_sessions.create_index("expires_at", expireAfterSeconds=0)
    except Exception as e:
        logger.warning(f"Index setup: {e}")
    await run_seed()


@app.on_event("shutdown")
async def shutdown():
    client.close()
