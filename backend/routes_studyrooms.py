"""Phase 7 — Study Rooms (co-focus).

Public and private rooms with a shared timer.
Presence via:
  1. WebSocket (primary) — real-time events for chat + timer sync
  2. 30s heartbeat /ping (fallback for clients without WS support)
"""
from fastapi import APIRouter, HTTPException, Request, WebSocket, WebSocketDisconnect
from pydantic import BaseModel, Field, ConfigDict
from typing import Optional, List, Literal, Dict, Set
from datetime import datetime, timezone, timedelta
import uuid
import random
import string
import asyncio
import json as _json

router = APIRouter(prefix="/api")


# ─────────────────────────────────────────────────────────────────────────────
# WebSocket connection manager (in-memory per process)
# ─────────────────────────────────────────────────────────────────────────────

class RoomConnectionManager:
    """Manages active WebSocket connections per room_id."""
    def __init__(self):
        # room_id → set of (websocket, user_id) tuples
        self._rooms: Dict[str, Set] = {}

    def _connections(self, room_id: str) -> Set:
        return self._rooms.setdefault(room_id, set())

    async def connect(self, room_id: str, ws: WebSocket, user_id: str):
        await ws.accept()
        self._connections(room_id).add((ws, user_id))

    def disconnect(self, room_id: str, ws: WebSocket, user_id: str):
        conns = self._rooms.get(room_id, set())
        conns.discard((ws, user_id))
        if not conns:
            self._rooms.pop(room_id, None)

    async def broadcast(self, room_id: str, payload: dict, exclude_ws: WebSocket = None):
        """Broadcast a JSON payload to all connections in a room."""
        conns = list(self._rooms.get(room_id, set()))
        dead = []
        for ws, uid in conns:
            if ws is exclude_ws:
                continue
            try:
                await ws.send_json(payload)
            except Exception:
                dead.append((ws, uid))
        # Prune dead connections
        for pair in dead:
            self._rooms.get(room_id, set()).discard(pair)

    def presence_count(self, room_id: str) -> int:
        return len(self._rooms.get(room_id, set()))


ws_manager = RoomConnectionManager()


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
    # Broadcast to WS clients
    await ws_manager.broadcast(room["room_id"], {"type": "message", "message": doc})
    return doc


# ─────────────────────────────────────────────────────────────────────────────
# WebSocket — real-time room connection
# ─────────────────────────────────────────────────────────────────────────────

@router.websocket("/rooms/{code}/ws")
async def room_ws(code: str, websocket: WebSocket):
    """Real-time WebSocket endpoint for a study room.

    Auth: token passed via query param ?token=<session_token> (validated BEFORE accept)
    Events broadcasted to all room members:
      - {"type": "presence", "user_id": ..., "action": "join"|"leave", "name": ...}
      - {"type": "message", "message": {...}}
      - {"type": "timer", "state": {...}}
      - {"type": "ping_ack"}

    Client should send {"type": "ping"} every 20s to stay in presence.
    """
    from server import db, require_user

    # Step 1: Validate token BEFORE accepting connection (via query param)
    token = websocket.query_params.get("token", "")
    if not token:
        await websocket.close(code=4001, reason="Missing auth token")
        return

    user = None
    room = None
    try:
        session = await db.user_sessions.find_one({"session_token": token})
        if not session:
            await websocket.close(code=4003, reason="Invalid token")
            return
        from datetime import timezone as _tz
        exp = session.get("expires_at")
        if exp and exp.replace(tzinfo=_tz.utc) < datetime.now(_tz.utc):
            await websocket.close(code=4003, reason="Token expired")
            return
        user = await db.users.find_one({"user_id": session["user_id"]}, {"_id": 0})
        if not user:
            await websocket.close(code=4003, reason="User not found")
            return
    except Exception:
        await websocket.close(code=4003, reason="Auth error")
        return

    # Step 2: Find room
    code_u = code.upper()
    room = await db.study_rooms.find_one({"code": code_u, "is_active": True}, {"_id": 0})
    if not room:
        await websocket.close(code=4004, reason="Room not found")
        return

    # Step 3: Accept connection NOW that auth is verified
    await websocket.accept()

    room_id = room["room_id"]
    user_id = user["user_id"]
    nm = user.get("name") or "?"
    initials = "".join([x[0].upper() for x in nm.split()][:2]) or "?"

    # Register connection
    ws_manager._connections(room_id).add((websocket, user_id))

    # Join presence in DB
    await db.study_rooms.update_one(
        {"room_id": room_id, "presence.user_id": {"$ne": user_id}},
        {"$push": {"presence": {"user_id": user_id, "joined_at": _now(), "last_ping": _now(), "focus_contribution_minutes": 0}}}
    )

    # Broadcast join event to others
    await ws_manager.broadcast(room_id, {
        "type": "presence", "action": "join",
        "user_id": user_id, "name": nm, "initials": initials,
    }, exclude_ws=websocket)

    # Send current room state to this client
    room_state, msgs = await _fetch_room_state(db, code_u)
    await websocket.send_json({"type": "init", "room": room_state, "messages": msgs})

    try:
        while True:
            data = await websocket.receive_json()
            ev_type = data.get("type")

            if ev_type == "ping":
                # Update DB presence ping timestamp
                await db.study_rooms.update_one(
                    {"room_id": room_id, "presence.user_id": user_id},
                    {"$set": {"presence.$.last_ping": _now()}}
                )
                await websocket.send_json({"type": "ping_ack"})

            elif ev_type == "message":
                content = (data.get("content") or "").strip()[:300]
                if not content:
                    continue
                # Rate check (simple: 30/min per user)
                since = _now() - timedelta(minutes=1)
                n = await db.room_messages.count_documents({
                    "room_id": room_id, "user_id": user_id,
                    "created_at": {"$gte": since}
                })
                if n >= 30:
                    await websocket.send_json({"type": "error", "detail": "Rate limit: 30 msgs/min"})
                    continue
                doc = {
                    "message_id": f"msg_{uuid.uuid4().hex[:10]}",
                    "room_id": room_id, "user_id": user_id,
                    "initials": initials,
                    "is_verified_ca": bool(user.get("is_verified_ca")),
                    "content": content,
                    "created_at": _now(),
                }
                await db.room_messages.insert_one(doc)
                doc.pop("_id", None)
                # Convert datetime for JSON
                doc["created_at"] = doc["created_at"].isoformat()
                payload = {"type": "message", "message": doc}
                # Echo to sender + broadcast to others
                await websocket.send_json(payload)
                await ws_manager.broadcast(room_id, payload, exclude_ws=websocket)

    except (WebSocketDisconnect, Exception):
        pass
    finally:
        # Cleanup
        ws_manager.disconnect(room_id, websocket, user_id)
        # Remove from DB presence
        await db.study_rooms.update_one(
            {"room_id": room_id},
            {"$pull": {"presence": {"user_id": user_id}}}
        )
        # Broadcast leave event
        await ws_manager.broadcast(room_id, {
            "type": "presence", "action": "leave",
            "user_id": user_id, "name": nm, "initials": initials,
        })

