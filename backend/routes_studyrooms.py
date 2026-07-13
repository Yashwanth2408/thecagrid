"""Phase 7 — Study Rooms (co-focus).

Public and private rooms with a shared timer. Presence via 30s heartbeat.
No websockets — simple long-poll pattern via /ping.
"""
from fastapi import APIRouter, HTTPException, Request
from pydantic import BaseModel, Field, ConfigDict
from typing import Optional, List, Literal
from datetime import datetime, timezone, timedelta
import uuid
import random
import string

router = APIRouter(prefix="/api")


def _now():
    return datetime.now(timezone.utc)


def _room_code():
    return "".join(random.choices(string.ascii_uppercase + string.digits, k=6))


def get_deps(request: Request):
    from server import db, limiter, require_user, log_event
    return db, limiter, require_user, log_event


PRESENCE_TIMEOUT = 90  # seconds


class RoomBody(BaseModel):
    model_config = ConfigDict(str_strip_whitespace=True)
    name: str = Field(min_length=4, max_length=80)
    subject_tag: str = Field(min_length=2, max_length=40)
    level_focus: Optional[str] = Field(default=None, max_length=40)
    is_public: bool = True


class TimerStartBody(BaseModel):
    planned_seconds: int = Field(ge=60, le=7200)  # 1min - 2h


class MessageBody(BaseModel):
    model_config = ConfigDict(str_strip_whitespace=True)
    content: str = Field(min_length=1, max_length=300)


async def _cleanup_presence(db, room: dict) -> dict:
    """Drop presence entries older than PRESENCE_TIMEOUT."""
    now = _now()
    presence = room.get("presence") or []
    fresh = []
    for p in presence:
        lp = p.get("last_ping")
        if lp is None:
            continue
        if lp.tzinfo is None:
            lp = lp.replace(tzinfo=timezone.utc)
        if (now - lp).total_seconds() < PRESENCE_TIMEOUT:
            fresh.append(p)
    if len(fresh) != len(presence):
        await db.study_rooms.update_one({"room_id": room["room_id"]}, {"$set": {"presence": fresh}})
        room["presence"] = fresh
    return room


async def _hydrate_presence(db, room: dict) -> dict:
    """Attach display info to presence list."""
    uids = [p["user_id"] for p in (room.get("presence") or [])]
    users = {}
    if uids:
        async for u in db.users.find({"user_id": {"$in": uids}}, {"_id": 0, "user_id": 1, "name": 1, "is_verified_ca": 1, "journey_level": 1}):
            users[u["user_id"]] = u
    hydrated = []
    for p in (room.get("presence") or []):
        u = users.get(p["user_id"]) or {}
        nm = u.get("name") or "?"
        hydrated.append({
            "user_id": p["user_id"],
            "initials": "".join([x[0].upper() for x in nm.split()][:2]) or "?",
            "name": nm,
            "journey_level": u.get("journey_level"),
            "is_verified_ca": bool(u.get("is_verified_ca")),
            "joined_at": p.get("joined_at"),
            "focus_contribution_minutes": p.get("focus_contribution_minutes", 0),
        })
    room["presence"] = hydrated
    return room


@router.get("/rooms")
async def list_rooms(request: Request, public: bool = True, level: Optional[str] = None):
    db, *_ = get_deps(request)
    q: dict = {"is_active": True}
    if public:
        q["is_public"] = True
    if level:
        q["level_focus"] = level
    items = await db.study_rooms.find(q, {"_id": 0, "presence": 1, "room_id": 1, "code": 1, "name": 1, "host_user_id": 1, "subject_tag": 1, "level_focus": 1, "active_timer_state": 1, "created_at": 1}).sort("created_at", -1).to_list(50)
    # cleanup + counts
    for r in items:
        await _cleanup_presence(db, r)
        r["presence_count"] = len(r.get("presence") or [])
        r.pop("presence", None)
    return {"items": items, "count": len(items)}


@router.post("/rooms")
async def create_room(body: RoomBody, request: Request):
    db, _, require_user, log_event = get_deps(request)
    user = await require_user(request)
    # unique code
    code = _room_code()
    while await db.study_rooms.find_one({"code": code, "is_active": True}, {"_id": 0}):
        code = _room_code()
    doc = {
        "room_id": f"rm_{uuid.uuid4().hex[:10]}",
        "code": code,
        "name": body.name,
        "host_user_id": user["user_id"],
        "subject_tag": body.subject_tag,
        "level_focus": body.level_focus,
        "is_public": body.is_public,
        "is_active": True,
        "active_timer_state": None,
        "presence": [{
            "user_id": user["user_id"],
            "joined_at": _now(),
            "last_ping": _now(),
            "focus_contribution_minutes": 0,
        }],
        "max_capacity": 20,
        "total_focus_minutes": 0,
        "created_at": _now(),
    }
    await db.study_rooms.insert_one(doc)
    log_event("rooms.created", user_id=user["user_id"], room_id=doc["room_id"])
    doc.pop("_id", None)
    return {**doc, "presence": [], "presence_count": 1}


async def _fetch_room_state(db, code: str):
    room = await db.study_rooms.find_one({"code": code.upper(), "is_active": True}, {"_id": 0})
    if not room:
        raise HTTPException(404, "Room not found or inactive")
    await _cleanup_presence(db, room)
    await _hydrate_presence(db, room)
    # last 50 messages
    msgs = await db.room_messages.find({"room_id": room["room_id"]}, {"_id": 0}).sort("created_at", -1).limit(50).to_list(50)
    msgs.reverse()
    return room, msgs


@router.get("/rooms/{code}")
async def get_room(code: str, request: Request):
    db, *_ = get_deps(request)
    room, msgs = await _fetch_room_state(db, code)
    return {"room": room, "messages": msgs}


@router.post("/rooms/{code}/join")
async def join_room(code: str, request: Request):
    db, _, require_user, log_event = get_deps(request)
    user = await require_user(request)
    code_u = code.upper()
    room = await db.study_rooms.find_one({"code": code_u, "is_active": True}, {"_id": 0})
    if not room:
        raise HTTPException(404, "Room not found")
    await _cleanup_presence(db, room)
    presence = room.get("presence") or []
    if any(p["user_id"] == user["user_id"] for p in presence):
        # refresh ping
        await db.study_rooms.update_one(
            {"room_id": room["room_id"], "presence.user_id": user["user_id"]},
            {"$set": {"presence.$.last_ping": _now()}}
        )
    elif len(presence) >= int(room.get("max_capacity", 20)):
        raise HTTPException(400, "Room is full")
    else:
        await db.study_rooms.update_one(
            {"room_id": room["room_id"]},
            {"$push": {"presence": {
                "user_id": user["user_id"], "joined_at": _now(),
                "last_ping": _now(), "focus_contribution_minutes": 0,
            }}}
        )
    log_event("rooms.joined", user_id=user["user_id"], code=code_u)
    room, msgs = await _fetch_room_state(db, code_u)
    return {"room": room, "messages": msgs}


@router.post("/rooms/{code}/leave")
async def leave_room(code: str, request: Request):
    db, _, require_user, _ = get_deps(request)
    user = await require_user(request)
    room = await db.study_rooms.find_one({"code": code.upper()}, {"_id": 0})
    if not room:
        return {"ok": True}
    await db.study_rooms.update_one({"room_id": room["room_id"]}, {"$pull": {"presence": {"user_id": user["user_id"]}}})
    return {"ok": True}


@router.post("/rooms/{code}/ping")
async def ping_room(code: str, request: Request):
    db, *_ = get_deps(request)
    user = await (get_deps(request)[2])(request)
    code_u = code.upper()
    await db.study_rooms.update_one(
        {"code": code_u, "presence.user_id": user["user_id"]},
        {"$set": {"presence.$.last_ping": _now()}}
    )
    room, msgs = await _fetch_room_state(db, code_u)
    return {"room": room, "messages": msgs}


@router.post("/rooms/{code}/timer/start")
async def timer_start(code: str, body: TimerStartBody, request: Request):
    db, _, require_user, log_event = get_deps(request)
    user = await require_user(request)
    room = await db.study_rooms.find_one({"code": code.upper()}, {"_id": 0})
    if not room:
        raise HTTPException(404, "Room not found")
    if room["host_user_id"] != user["user_id"]:
        raise HTTPException(403, "Only the host can start the timer")
    state = {
        "started_at": _now(),
        "planned_seconds": int(body.planned_seconds),
        "is_running": True,
        "paused_at": None,
        "paused_accum_seconds": 0,
    }
    await db.study_rooms.update_one({"room_id": room["room_id"]}, {"$set": {"active_timer_state": state}})
    log_event("rooms.timer_start", room_id=room["room_id"], planned=body.planned_seconds)
    return {"ok": True, "state": state}


@router.post("/rooms/{code}/timer/pause")
async def timer_pause(code: str, request: Request):
    db, _, require_user, _ = get_deps(request)
    user = await require_user(request)
    room = await db.study_rooms.find_one({"code": code.upper()}, {"_id": 0})
    if not room:
        raise HTTPException(404, "Room not found")
    if room["host_user_id"] != user["user_id"]:
        raise HTTPException(403, "Only the host can pause")
    st = room.get("active_timer_state") or {}
    if not st or not st.get("is_running"):
        return {"ok": False, "reason": "not_running"}
    st["is_running"] = False
    st["paused_at"] = _now()
    await db.study_rooms.update_one({"room_id": room["room_id"]}, {"$set": {"active_timer_state": st}})
    return {"ok": True, "state": st}


@router.post("/rooms/{code}/timer/complete")
async def timer_complete(code: str, request: Request):
    db, _, require_user, log_event = get_deps(request)
    user = await require_user(request)
    room = await db.study_rooms.find_one({"code": code.upper()}, {"_id": 0})
    if not room:
        raise HTTPException(404, "Room not found")
    if room["host_user_id"] != user["user_id"]:
        raise HTTPException(403, "Only the host can complete")
    st = room.get("active_timer_state") or {}
    if not st:
        raise HTTPException(400, "No active timer")
    minutes = max(1, int(st.get("planned_seconds", 0) // 60))
    # award session to each user currently present
    await _cleanup_presence(db, room)
    present_ids = [p["user_id"] for p in (room.get("presence") or [])]
    xp_per = 25
    for uid in present_ids:
        # create a focus_session record so it shows in history
        await db.focus_sessions.insert_one({
            "session_id": f"fs_room_{uuid.uuid4().hex[:10]}",
            "user_id": uid,
            "subject": room.get("subject_tag") or "Study Room",
            "planned_duration_seconds": st.get("planned_seconds"),
            "actual_duration_seconds": st.get("planned_seconds"),
            "started_at": st.get("started_at"),
            "ended_at": _now(),
            "status": "completed",
            "xp_awarded": xp_per,
            "room_id": room["room_id"],
            "room_code": room["code"],
            "ambient_track": None,
        })
        await db.user_stats.update_one({"user_id": uid}, {"$inc": {"total_xp": xp_per, "total_minutes": minutes}}, upsert=True)
    await db.study_rooms.update_one({"room_id": room["room_id"]}, {
        "$set": {"active_timer_state": None},
        "$inc": {"total_focus_minutes": minutes * len(present_ids)},
    })
    log_event("rooms.timer_complete", room_id=room["room_id"], participants=len(present_ids), minutes=minutes)
    return {
        "ok": True,
        "participants": len(present_ids),
        "minutes": minutes,
        "xp_awarded_each": xp_per,
    }


@router.post("/rooms/{code}/message")
async def post_message(code: str, body: MessageBody, request: Request):
    db, _, require_user, log_event = get_deps(request)
    user = await require_user(request)
    room = await db.study_rooms.find_one({"code": code.upper()}, {"_id": 0})
    if not room:
        raise HTTPException(404, "Room not found")
    # simple rate: 30/min per user per room
    since = _now() - timedelta(minutes=1)
    n = await db.room_messages.count_documents({"room_id": room["room_id"], "user_id": user["user_id"], "created_at": {"$gte": since}})
    if n >= 30:
        raise HTTPException(429, "Message rate limit (30/min)")
    nm = user.get("name") or "?"
    doc = {
        "message_id": f"msg_{uuid.uuid4().hex[:10]}",
        "room_id": room["room_id"],
        "user_id": user["user_id"],
        "initials": "".join([x[0].upper() for x in nm.split()][:2]) or "?",
        "is_verified_ca": bool(user.get("is_verified_ca")),
        "content": body.content,
        "created_at": _now(),
    }
    await db.room_messages.insert_one(doc)
    log_event("rooms.message", room_id=room["room_id"])
    doc.pop("_id", None)
    return doc
