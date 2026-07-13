"""Phase 6 — Community routes (Forums + Study Groups + mock CA verification).

Endpoints exposed under /api (mounted from server.py):
  GET  /api/community/categories
  GET  /api/community/categories/{slug}/threads
  POST /api/community/threads
  GET  /api/community/threads/{thread_id}
  POST /api/community/threads/{thread_id}/replies
  POST /api/community/vote
  GET  /api/community/study-groups
  POST /api/community/study-groups
  GET  /api/community/study-groups/{slug}
  POST /api/community/study-groups/{slug}/join
  POST /api/community/study-groups/{slug}/leave
  POST /api/verify/ca
"""
from fastapi import APIRouter, HTTPException, Request
from pydantic import BaseModel, Field, ConfigDict
from typing import Optional, List, Literal
from datetime import datetime, timezone
import uuid
import re

router = APIRouter(prefix="/api")


def _now():
    return datetime.now(timezone.utc)


def get_deps(request: Request):
    from server import db, limiter, require_user, log_event
    return db, limiter, require_user, log_event


def _initials(name: str) -> str:
    parts = [p for p in (name or "").replace("@", " ").split() if p][:2]
    return ".".join([p[0].upper() for p in parts]) + ("." if parts else "")


def _slugify(s: str) -> str:
    s = (s or "").strip().lower()
    s = re.sub(r"[^a-z0-9]+", "-", s).strip("-")
    return s[:60] or f"grp-{uuid.uuid4().hex[:6]}"


# ---------- Models ----------
class ThreadBody(BaseModel):
    model_config = ConfigDict(str_strip_whitespace=True)
    category_slug: str = Field(min_length=1, max_length=60)
    title: str = Field(min_length=6, max_length=180)
    body_markdown: str = Field(min_length=20, max_length=8000)
    tags: List[str] = Field(default_factory=list)


class ReplyBody(BaseModel):
    model_config = ConfigDict(str_strip_whitespace=True)
    body_markdown: str = Field(min_length=1, max_length=4000)
    parent_reply_id: Optional[str] = Field(default=None, max_length=32)


class VoteBody(BaseModel):
    target_type: Literal["thread", "reply"]
    target_id: str = Field(min_length=1, max_length=32)
    direction: Literal[1, -1, 0]  # 0 clears vote


class StudyGroupCreateBody(BaseModel):
    model_config = ConfigDict(str_strip_whitespace=True)
    name: str = Field(min_length=6, max_length=80)
    description: str = Field(min_length=10, max_length=800)
    level_key: str = Field(min_length=1, max_length=40)
    topics: List[str] = Field(default_factory=list)
    max_members: int = Field(default=30, ge=3, le=200)


class CAVerifyBody(BaseModel):
    membership_number: str = Field(min_length=1, max_length=20)


# ---------- Categories ----------
@router.get("/community/categories")
async def list_categories(request: Request):
    db, *_ = get_deps(request)
    cats = await db.forum_categories.find({}, {"_id": 0}).sort("order", 1).to_list(50)
    # thread counts per category
    counts: dict = {}
    agg = db.forum_threads.aggregate([{"$group": {"_id": "$category_slug", "n": {"$sum": 1}}}])
    async for r in agg:
        counts[r["_id"]] = r["n"]
    for c in cats:
        c["thread_count"] = counts.get(c["category_slug"], 0)
    return {"items": cats, "count": len(cats)}


@router.get("/community/categories/{slug}/threads")
async def category_threads(
    slug: str,
    request: Request,
    sort: Optional[str] = "hot",
    q: Optional[str] = None,
    limit: int = 50,
):
    db, *_ = get_deps(request)
    cat = await db.forum_categories.find_one({"category_slug": slug}, {"_id": 0})
    if not cat:
        raise HTTPException(status_code=404, detail="Category not found")
    query: dict = {"category_slug": slug}
    if q:
        query["title"] = {"$regex": q, "$options": "i"}
    sort_spec: list
    if sort == "top":
        sort_spec = [("upvotes", -1), ("created_at", -1)]
    elif sort == "new":
        sort_spec = [("created_at", -1)]
    else:  # hot = pinned first, then combined vote+reply signal
        sort_spec = [("is_pinned", -1), ("upvotes", -1), ("created_at", -1)]
    items = await db.forum_threads.find(query, {"_id": 0}).sort(sort_spec).limit(min(limit, 200)).to_list(200)
    return {"category": cat, "items": items, "count": len(items)}


# ---------- Threads ----------
@router.post("/community/threads")
async def create_thread(body: ThreadBody, request: Request):
    db, _, require_user, log_event = get_deps(request)
    user = await require_user(request)
    cat = await db.forum_categories.find_one({"category_slug": body.category_slug}, {"_id": 0})
    if not cat:
        raise HTTPException(status_code=404, detail="Category not found")
    # Level-segmented enforcement: level categories require matching journey_level (Qualified CAs bypass)
    if cat.get("kind") == "level" and not user.get("is_verified_ca"):
        expected = cat.get("level_key")
        # allow same-level or higher-level users to post in lower categories
        LEVEL_ORDER = ["Aspiring", "Foundation", "Intermediate", "Articleship", "Final", "Qualified CA"]
        try:
            u_idx = LEVEL_ORDER.index(user.get("journey_level") or "Aspiring")
            e_idx = LEVEL_ORDER.index(expected)
            if u_idx < e_idx:
                raise HTTPException(status_code=403, detail=f"This category requires level {expected} or above")
        except ValueError:
            pass
    doc = {
        "thread_id": f"th_{uuid.uuid4().hex[:12]}",
        "category_slug": body.category_slug,
        "title": body.title,
        "body_markdown": body.body_markdown,
        "tags": body.tags,
        "author_user_id": user["user_id"],
        "author_initials": _initials(user.get("name") or user.get("email", "")),
        "author_level": user.get("journey_level") or "Aspiring",
        "is_verified_ca": bool(user.get("is_verified_ca", False)),
        "is_pinned": False,
        "upvotes": 0,
        "reply_count": 0,
        "created_at": _now(),
        "updated_at": _now(),
    }
    await db.forum_threads.insert_one(doc)
    log_event("community.thread.created", user_id=user["user_id"], thread_id=doc["thread_id"])
    doc.pop("_id", None)
    return doc


@router.get("/community/threads/{thread_id}")
async def get_thread(thread_id: str, request: Request):
    db, *_ = get_deps(request)
    th = await db.forum_threads.find_one({"thread_id": thread_id}, {"_id": 0})
    if not th:
        raise HTTPException(status_code=404, detail="Thread not found")
    replies = await db.forum_replies.find({"thread_id": thread_id}, {"_id": 0}).sort([("upvotes", -1), ("created_at", 1)]).to_list(500)
    # Fetch current user vote (optional)
    user = None
    try:
        user = await (get_deps(request)[2])(request)  # require_user
    except HTTPException:
        user = None
    user_vote_thread = 0
    user_votes_reply: dict = {}
    if user:
        v = await db.forum_votes.find_one({"user_id": user["user_id"], "target_type": "thread", "target_id": thread_id}, {"_id": 0})
        user_vote_thread = int(v.get("direction", 0)) if v else 0
        rep_ids = [r["reply_id"] for r in replies]
        if rep_ids:
            async for vv in db.forum_votes.find({"user_id": user["user_id"], "target_type": "reply", "target_id": {"$in": rep_ids}}, {"_id": 0}):
                user_votes_reply[vv["target_id"]] = int(vv.get("direction", 0))
    return {
        "thread": th,
        "replies": replies,
        "user_vote_thread": user_vote_thread,
        "user_votes_reply": user_votes_reply,
    }


@router.post("/community/threads/{thread_id}/replies")
async def create_reply(thread_id: str, body: ReplyBody, request: Request):
    db, _, require_user, log_event = get_deps(request)
    user = await require_user(request)
    th = await db.forum_threads.find_one({"thread_id": thread_id}, {"_id": 0})
    if not th:
        raise HTTPException(status_code=404, detail="Thread not found")
    doc = {
        "reply_id": f"rp_{uuid.uuid4().hex[:12]}",
        "thread_id": thread_id,
        "body_markdown": body.body_markdown,
        "author_user_id": user["user_id"],
        "author_initials": _initials(user.get("name") or user.get("email", "")),
        "author_level": user.get("journey_level") or "Aspiring",
        "is_verified_ca": bool(user.get("is_verified_ca", False)),
        "parent_reply_id": body.parent_reply_id,
        "upvotes": 0,
        "created_at": _now(),
    }
    await db.forum_replies.insert_one(doc)
    await db.forum_threads.update_one({"thread_id": thread_id}, {"$inc": {"reply_count": 1}, "$set": {"updated_at": _now()}})
    # Phase 7 — notify thread author if not self-reply
    try:
        author_id = th.get("author_user_id")
        if author_id and author_id != user["user_id"]:
            from routes_notifications import create_notification
            await create_notification(
                user_id=author_id,
                type_="community_reply",
                title=f"New reply on your thread",
                body_markdown=f"{doc['author_initials']} · {doc['author_level']} replied to \"{th.get('title','')[:60]}\"",
                action_url=f"/community/threads/{thread_id}",
            )
    except Exception:
        pass
    log_event("community.reply.created", user_id=user["user_id"], thread_id=thread_id)
    doc.pop("_id", None)
    return doc


# ---------- Voting ----------
@router.post("/community/vote")
async def vote(body: VoteBody, request: Request):
    db, _, require_user, _ = get_deps(request)
    user = await require_user(request)
    if body.target_type == "thread":
        target_col, count_col = "forum_threads", db.forum_threads
        target_key = "thread_id"
    else:
        target_col, count_col = "forum_replies", db.forum_replies
        target_key = "reply_id"
    target = await count_col.find_one({target_key: body.target_id}, {"_id": 0})
    if not target:
        raise HTTPException(status_code=404, detail=f"{body.target_type} not found")
    prev = await db.forum_votes.find_one({"user_id": user["user_id"], "target_type": body.target_type, "target_id": body.target_id}, {"_id": 0})
    prev_dir = int(prev.get("direction", 0)) if prev else 0
    if prev_dir == body.direction:
        # idempotent no-op
        return {"ok": True, "upvotes": target.get("upvotes", 0), "user_direction": prev_dir}
    delta = int(body.direction) - int(prev_dir)
    if body.direction == 0:
        await db.forum_votes.delete_one({"user_id": user["user_id"], "target_type": body.target_type, "target_id": body.target_id})
    else:
        await db.forum_votes.update_one(
            {"user_id": user["user_id"], "target_type": body.target_type, "target_id": body.target_id},
            {"$set": {"user_id": user["user_id"], "target_type": body.target_type, "target_id": body.target_id, "direction": int(body.direction), "created_at": _now()}},
            upsert=True,
        )
    await count_col.update_one({target_key: body.target_id}, {"$inc": {"upvotes": delta}})
    updated = await count_col.find_one({target_key: body.target_id}, {"_id": 0, "upvotes": 1})
    return {"ok": True, "upvotes": updated.get("upvotes", 0), "user_direction": int(body.direction)}


# ---------- Study groups ----------
@router.get("/community/study-groups")
async def list_groups(
    request: Request,
    level: Optional[str] = None,
    topic: Optional[str] = None,
    q: Optional[str] = None,
    limit: int = 60,
):
    db, *_ = get_deps(request)
    query: dict = {}
    if level:
        query["level_key"] = level
    if topic:
        query["topics"] = topic
    if q:
        query["name"] = {"$regex": q, "$options": "i"}
    items = await db.study_groups.find(query, {"_id": 0}).sort("created_at", -1).to_list(min(limit, 200))
    # attach member counts
    slugs = [g["slug"] for g in items]
    counts: dict = {}
    if slugs:
        agg = db.study_group_members.aggregate([
            {"$match": {"group_slug": {"$in": slugs}}},
            {"$group": {"_id": "$group_slug", "n": {"$sum": 1}}},
        ])
        async for r in agg:
            counts[r["_id"]] = r["n"]
    for g in items:
        g["member_count"] = counts.get(g["slug"], 0)
    return {"items": items, "count": len(items)}


@router.post("/community/study-groups")
async def create_group(body: StudyGroupCreateBody, request: Request):
    db, _, require_user, log_event = get_deps(request)
    user = await require_user(request)
    slug = _slugify(body.name)
    # ensure unique
    while await db.study_groups.find_one({"slug": slug}, {"_id": 0}):
        slug = f"{slug}-{uuid.uuid4().hex[:4]}"
    doc = {
        "slug": slug,
        "name": body.name,
        "description": body.description,
        "level_key": body.level_key,
        "topics": body.topics,
        "max_members": body.max_members,
        "is_public": True,
        "owner_user_id": user["user_id"],
        "owner_initials": _initials(user.get("name") or user.get("email", "")),
        "created_at": _now(),
    }
    await db.study_groups.insert_one(doc)
    # auto-join owner
    await db.study_group_members.insert_one({
        "group_slug": slug, "user_id": user["user_id"], "role": "owner",
        "joined_at": _now(),
    })
    log_event("community.group.created", user_id=user["user_id"], slug=slug)
    doc.pop("_id", None)
    return doc


@router.get("/community/study-groups/{slug}")
async def group_detail(slug: str, request: Request):
    db, _, require_user, _ = get_deps(request)
    g = await db.study_groups.find_one({"slug": slug}, {"_id": 0})
    if not g:
        raise HTTPException(status_code=404, detail="Group not found")
    members = await db.study_group_members.find({"group_slug": slug}, {"_id": 0}).sort("joined_at", 1).to_list(500)
    # anonymized member list
    member_summaries = []
    for m in members:
        u = await db.users.find_one({"user_id": m["user_id"]}, {"_id": 0, "name": 1, "email": 1, "journey_level": 1, "is_verified_ca": 1})
        if not u:
            continue
        member_summaries.append({
            "initials": _initials(u.get("name") or u.get("email", "")),
            "journey_level": u.get("journey_level"),
            "is_verified_ca": bool(u.get("is_verified_ca")),
            "role": m.get("role", "member"),
        })
    # Am I a member?
    is_member = False
    try:
        user = await require_user(request)
        is_member = any(m["user_id"] == user["user_id"] for m in members)
    except HTTPException:
        pass
    g["member_count"] = len(members)
    return {"group": g, "members": member_summaries, "is_member": is_member}


@router.post("/community/study-groups/{slug}/join")
async def join_group(slug: str, request: Request):
    db, _, require_user, log_event = get_deps(request)
    user = await require_user(request)
    g = await db.study_groups.find_one({"slug": slug}, {"_id": 0})
    if not g:
        raise HTTPException(status_code=404, detail="Group not found")
    existing = await db.study_group_members.find_one({"group_slug": slug, "user_id": user["user_id"]}, {"_id": 0})
    if existing:
        return {"ok": True, "already_member": True}
    count = await db.study_group_members.count_documents({"group_slug": slug})
    if count >= int(g.get("max_members", 30)):
        raise HTTPException(status_code=400, detail="Group full")
    await db.study_group_members.insert_one({
        "group_slug": slug, "user_id": user["user_id"], "role": "member",
        "joined_at": _now(),
    })
    log_event("community.group.joined", user_id=user["user_id"], slug=slug)
    return {"ok": True, "member_count": count + 1}


@router.post("/community/study-groups/{slug}/leave")
async def leave_group(slug: str, request: Request):
    db, _, require_user, log_event = get_deps(request)
    user = await require_user(request)
    res = await db.study_group_members.delete_one({"group_slug": slug, "user_id": user["user_id"]})
    log_event("community.group.left", user_id=user["user_id"], slug=slug, removed=res.deleted_count)
    return {"ok": True, "removed": res.deleted_count}


# ---------- CA verification (MOCKED) ----------
@router.post("/verify/ca")
async def verify_ca(body: CAVerifyBody, request: Request):
    """MOCKED: accepts any 6-digit membership number as valid.
    In production, this would call ICAI membership register API.
    """
    db, _, require_user, log_event = get_deps(request)
    user = await require_user(request)
    m = re.match(r"^\d{6}$", body.membership_number.strip())
    if not m:
        raise HTTPException(status_code=400, detail="Membership number must be exactly 6 digits")
    # Store verification request for future manual review pipeline
    await db.verification_requests.insert_one({
        "request_id": f"vr_{uuid.uuid4().hex[:12]}",
        "user_id": user["user_id"],
        "membership_number": body.membership_number.strip(),
        "status": "approved_mock",
        "created_at": _now(),
    })
    # Flip the badge
    await db.users.update_one({"user_id": user["user_id"]}, {"$set": {"is_verified_ca": True, "ca_membership_number": body.membership_number.strip()}})
    log_event("verify.ca.mock_approved", user_id=user["user_id"])
    return {"ok": True, "is_verified_ca": True, "membership_number": body.membership_number.strip(), "note": "MOCKED: any 6-digit number is accepted in Phase 6."}
