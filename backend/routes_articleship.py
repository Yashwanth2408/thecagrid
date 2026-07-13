"""Phase 6 — Articleship Toolkit routes.

Endpoints exposed under /api (mounted from server.py):
  GET  /api/firms
  GET  /api/firms/{slug}
  POST /api/firms/{firm_id_or_slug}/reviews
  GET  /api/articleship/me
  PUT  /api/articleship/me
  POST /api/articleship/leave
  GET  /api/articleship/leave
  POST /api/articleship/practical-log
  GET  /api/articleship/practical-log
  GET  /api/articleship/practical-to-syllabus
  GET  /api/articleship/firm-match
"""
from fastapi import APIRouter, HTTPException, Request, Depends
from pydantic import BaseModel, Field, ConfigDict
from typing import Optional, List, Literal
from datetime import datetime, timezone, date, timedelta
import uuid

router = APIRouter(prefix="/api")


def _now():
    return datetime.now(timezone.utc)


def _today() -> str:
    return _now().strftime("%Y-%m-%d")


# ---------- Models ----------
class ReviewBody(BaseModel):
    model_config = ConfigDict(str_strip_whitespace=True)
    overall: int = Field(ge=1, le=10)
    wlb: int = Field(ge=1, le=10)
    learning: int = Field(ge=1, le=10)
    mentorship: int = Field(ge=1, le=10)
    exit_ops: int = Field(ge=1, le=10)
    stipend_fairness: int = Field(ge=1, le=10)
    quote: str = Field(min_length=20, max_length=1200)
    tenure: str = Field(min_length=1, max_length=60)


class ArticleshipProfileBody(BaseModel):
    model_config = ConfigDict(str_strip_whitespace=True)
    firm_slug: Optional[str] = Field(default=None, max_length=80)
    firm_custom_name: Optional[str] = Field(default=None, max_length=120)
    start_date: Optional[str] = Field(default=None, max_length=10)  # YYYY-MM-DD
    end_date: Optional[str] = Field(default=None, max_length=10)
    city: Optional[str] = Field(default=None, max_length=60)
    practice_area: Optional[str] = Field(default=None, max_length=60)
    monthly_stipend: Optional[int] = Field(default=None, ge=0, le=500000)


class LeaveBody(BaseModel):
    model_config = ConfigDict(str_strip_whitespace=True)
    kind: Literal["casual", "sick", "exam", "other"]
    start_date: str = Field(min_length=10, max_length=10)  # YYYY-MM-DD
    end_date: str = Field(min_length=10, max_length=10)
    reason: Optional[str] = Field(default=None, max_length=280)


class PracticalLogBody(BaseModel):
    model_config = ConfigDict(str_strip_whitespace=True)
    log_date: str = Field(min_length=10, max_length=10)
    hours: float = Field(ge=0.25, le=16)
    paper_code: Optional[str] = Field(default=None, max_length=8)
    topic_tags: List[str] = []
    description: str = Field(min_length=5, max_length=600)


class FirmMatchQuery(BaseModel):
    goal: Optional[str] = None  # big4|midtier|boutique|industry
    city: Optional[str] = None
    min_stipend: Optional[int] = None
    practice_areas: Optional[str] = None  # comma-separated
    wlb_min: Optional[float] = None
    learning_min: Optional[float] = None


# ---------- Helpers (require_user + db + limiter injected via app state) ----------
def get_deps(request: Request):
    """Pull shared deps (limiter, db, require_user) from server module."""
    from server import db, limiter, require_user, log_event
    return db, limiter, require_user, log_event


# ---------- Firms ----------
@router.get("/firms")
async def list_firms(
    request: Request,
    tier: Optional[str] = None,
    city: Optional[str] = None,
    min_stipend: Optional[int] = None,
    practice_area: Optional[str] = None,
    sort: Optional[str] = "wlb_desc",
    q: Optional[str] = None,
    limit: int = 60,
):
    db, *_ = get_deps(request)
    query: dict = {}
    if tier:
        query["tier"] = tier
    if city:
        query["cities"] = city
    if practice_area:
        query["practice_areas"] = practice_area
    if min_stipend:
        query["stipend_first_year_max"] = {"$gte": int(min_stipend)}
    if q:
        query["name"] = {"$regex": q, "$options": "i"}

    sort_map = {
        "wlb_desc": [("wlb_score", -1)],
        "learning_desc": [("learning_score", -1)],
        "exit_desc": [("exit_ops_score", -1)],
        "stipend_desc": [("stipend_first_year_max", -1)],
    }
    sort_spec = sort_map.get(sort or "wlb_desc", [("wlb_score", -1)])
    cur = db.firms.find(query, {"_id": 0}).sort(sort_spec).limit(min(limit, 200))
    items = await cur.to_list(200)
    # Attach summary review counts (aggregate)
    slugs = [f["slug"] for f in items]
    counts = {}
    if slugs:
        agg = db.firm_reviews.aggregate([
            {"$match": {"firm_slug": {"$in": slugs}}},
            {"$group": {"_id": "$firm_slug", "count": {"$sum": 1}, "avg_overall": {"$avg": "$ratings.overall"}}}
        ])
        async for r in agg:
            counts[r["_id"]] = {"reviews": r["count"], "avg_overall": round(r.get("avg_overall") or 0, 1)}
    for it in items:
        it["review_summary"] = counts.get(it["slug"], {"reviews": 0, "avg_overall": None})
    return {"items": items, "count": len(items)}


@router.get("/firms/{slug}")
async def firm_detail(slug: str, request: Request):
    db, *_ = get_deps(request)
    firm = await db.firms.find_one({"slug": slug}, {"_id": 0})
    if not firm:
        raise HTTPException(status_code=404, detail="Firm not found")
    reviews = await db.firm_reviews.find({"firm_slug": slug}, {"_id": 0}).sort("created_at", -1).to_list(200)
    # Histogram of overall ratings (1-10 buckets)
    hist = {str(i): 0 for i in range(1, 11)}
    facets_sum = {"overall": 0, "wlb": 0, "learning": 0, "mentorship": 0, "exit_ops": 0, "stipend_fairness": 0}
    for r in reviews:
        rat = r.get("ratings", {})
        o = int(rat.get("overall") or 0)
        if 1 <= o <= 10:
            hist[str(o)] += 1
        for k in facets_sum:
            facets_sum[k] += float(rat.get(k) or 0)
    n = max(1, len(reviews))
    facets_avg = {k: round(v / n, 1) for k, v in facets_sum.items()} if reviews else None
    return {"firm": firm, "reviews": reviews, "histogram": hist, "facets_avg": facets_avg, "review_count": len(reviews)}


@router.post("/firms/{slug}/reviews")
async def add_review(slug: str, body: ReviewBody, request: Request):
    db, limiter, require_user, log_event = get_deps(request)
    # rate limit will be applied via wrapper below; do a manual check via user_id
    user = await require_user(request)
    firm = await db.firms.find_one({"slug": slug}, {"_id": 0})
    if not firm:
        raise HTTPException(status_code=404, detail="Firm not found")
    # One review per firm per user
    exists = await db.firm_reviews.find_one({"firm_slug": slug, "user_id": user["user_id"]}, {"_id": 0})
    if exists:
        raise HTTPException(status_code=400, detail="You've already reviewed this firm")
    # Compute reviewer_initials from name
    name = user.get("name") or user.get("email", "??")
    parts = [p for p in name.replace("@", " ").split() if p][:2]
    ini = ".".join([p[0].upper() for p in parts]) + ("." if parts else "")
    doc = {
        "review_id": f"rev_{uuid.uuid4().hex[:12]}",
        "firm_slug": slug,
        "user_id": user["user_id"],
        "reviewer_initials": ini,
        "reviewer_level": user.get("journey_level") or "Articleship",
        "ratings": {
            "overall": body.overall, "wlb": body.wlb, "learning": body.learning,
            "mentorship": body.mentorship, "exit_ops": body.exit_ops, "stipend_fairness": body.stipend_fairness,
        },
        "quote": body.quote,
        "tenure": body.tenure,
        "is_verified": bool(user.get("is_verified_ca", False)),
        "created_at": _now(),
    }
    await db.firm_reviews.insert_one(doc)
    log_event("firm.review.added", user_id=user["user_id"], firm_slug=slug)
    doc.pop("_id", None)
    return {"ok": True, "review": doc}


# ---------- Articleship profile ----------
@router.get("/articleship/me")
async def get_articleship(request: Request):
    db, _, require_user, _ = get_deps(request)
    user = await require_user(request)
    prof = await db.articleship_profile.find_one({"user_id": user["user_id"]}, {"_id": 0})
    # Compute progress if start_date exists
    progress = None
    if prof and prof.get("start_date"):
        try:
            sd = datetime.strptime(prof["start_date"], "%Y-%m-%d").date()
            end_date = prof.get("end_date")
            ed = datetime.strptime(end_date, "%Y-%m-%d").date() if end_date else (sd + timedelta(days=3 * 365))
            today = date.today()
            total_days = (ed - sd).days
            elapsed = max(0, min((today - sd).days, total_days))
            leave_docs = await db.leave_records.find({"user_id": user["user_id"]}, {"_id": 0}).to_list(500)
            leave_days_used = 0
            for l in leave_docs:
                try:
                    a = datetime.strptime(l["start_date"], "%Y-%m-%d").date()
                    b = datetime.strptime(l["end_date"], "%Y-%m-%d").date()
                    leave_days_used += max(0, (b - a).days + 1)
                except Exception:
                    continue
            # ICAI norm: ~156 days / 3 years (1/6th of period served, ex. exam leave)
            leave_days_allowed = int(total_days / 6)
            leave_days_remaining = max(0, leave_days_allowed - leave_days_used)
            progress = {
                "start_date": prof["start_date"],
                "end_date": ed.strftime("%Y-%m-%d"),
                "total_days": total_days,
                "elapsed_days": elapsed,
                "remaining_days": max(0, total_days - elapsed),
                "percent_complete": round(elapsed / total_days * 100, 1) if total_days else 0,
                "leave_days_used": leave_days_used,
                "leave_days_allowed": leave_days_allowed,
                "leave_days_remaining": leave_days_remaining,
            }
        except Exception:
            progress = None
    return {"profile": prof, "progress": progress}


@router.put("/articleship/me")
async def update_articleship(body: ArticleshipProfileBody, request: Request):
    db, _, require_user, log_event = get_deps(request)
    user = await require_user(request)
    upd = {k: v for k, v in body.model_dump().items() if v is not None}
    upd["user_id"] = user["user_id"]
    upd["updated_at"] = _now()
    await db.articleship_profile.update_one(
        {"user_id": user["user_id"]}, {"$set": upd}, upsert=True,
    )
    log_event("articleship.profile.saved", user_id=user["user_id"])
    return await db.articleship_profile.find_one({"user_id": user["user_id"]}, {"_id": 0})


# ---------- Leave ----------
@router.post("/articleship/leave")
async def add_leave(body: LeaveBody, request: Request):
    db, _, require_user, log_event = get_deps(request)
    user = await require_user(request)
    try:
        a = datetime.strptime(body.start_date, "%Y-%m-%d").date()
        b = datetime.strptime(body.end_date, "%Y-%m-%d").date()
    except ValueError:
        raise HTTPException(status_code=400, detail="Dates must be YYYY-MM-DD")
    if b < a:
        raise HTTPException(status_code=400, detail="end_date must be >= start_date")
    doc = {
        "leave_id": f"lv_{uuid.uuid4().hex[:12]}",
        "user_id": user["user_id"],
        "kind": body.kind,
        "start_date": body.start_date,
        "end_date": body.end_date,
        "days": (b - a).days + 1,
        "reason": body.reason,
        "created_at": _now(),
    }
    await db.leave_records.insert_one(doc)
    log_event("articleship.leave.added", user_id=user["user_id"], days=doc["days"], kind=body.kind)
    doc.pop("_id", None)
    return doc


@router.get("/articleship/leave")
async def list_leave(request: Request):
    db, _, require_user, _ = get_deps(request)
    user = await require_user(request)
    items = await db.leave_records.find({"user_id": user["user_id"]}, {"_id": 0}).sort("start_date", -1).to_list(300)
    total = sum(int(i.get("days", 0)) for i in items)
    return {"items": items, "total_days": total}


# ---------- Practical logs ----------
@router.post("/articleship/practical-log")
async def add_log(body: PracticalLogBody, request: Request):
    db, _, require_user, log_event = get_deps(request)
    user = await require_user(request)
    doc = {
        "log_id": f"lg_{uuid.uuid4().hex[:12]}",
        "user_id": user["user_id"],
        "log_date": body.log_date,
        "hours": float(body.hours),
        "paper_code": body.paper_code,
        "topic_tags": body.topic_tags,
        "description": body.description,
        "created_at": _now(),
    }
    await db.practical_logs.insert_one(doc)
    log_event("articleship.log.added", user_id=user["user_id"], hours=body.hours)
    doc.pop("_id", None)
    return doc


@router.get("/articleship/practical-log")
async def list_logs(request: Request, limit: int = 200):
    db, _, require_user, _ = get_deps(request)
    user = await require_user(request)
    items = await db.practical_logs.find({"user_id": user["user_id"]}, {"_id": 0}).sort("log_date", -1).limit(min(limit, 500)).to_list(500)
    hours_sum = round(sum(float(i.get("hours", 0)) for i in items), 1)
    # weekly aggregate
    by_week: dict = {}
    for i in items:
        try:
            d = datetime.strptime(i["log_date"], "%Y-%m-%d").date()
        except Exception:
            continue
        monday = d - timedelta(days=d.weekday())
        key = monday.strftime("%Y-%m-%d")
        by_week[key] = round(by_week.get(key, 0) + float(i.get("hours", 0)), 1)
    weekly = [{"week_start": k, "hours": v} for k, v in sorted(by_week.items())]
    return {"items": items, "total_hours": hours_sum, "weekly": weekly}


@router.get("/articleship/practical-to-syllabus")
async def practical_to_syllabus(request: Request):
    """Correlate practical topic_tags → syllabus chapters via keyword match."""
    db, _, require_user, _ = get_deps(request)
    user = await require_user(request)
    logs = await db.practical_logs.find({"user_id": user["user_id"]}, {"_id": 0}).to_list(500)
    tags_hit: dict = {}
    hours_by_tag: dict = {}
    for l in logs:
        for t in (l.get("topic_tags") or []):
            key = t.strip().lower()
            if not key:
                continue
            tags_hit[key] = tags_hit.get(key, 0) + 1
            hours_by_tag[key] = round(hours_by_tag.get(key, 0) + float(l.get("hours", 0)), 1)
    # Match tags -> syllabus chapters by keyword
    papers = await db.syllabus.find({}, {"_id": 0}).to_list(50)
    correlations = []
    for tag, count in tags_hit.items():
        matched = []
        for p in papers:
            for c in (p.get("chapters") or []):
                text = f"{c.get('title','')} {' '.join(c.get('key_topics') or [])}".lower()
                if tag in text:
                    matched.append({"paper_code": p["paper_code"], "chapter_id": c["chapter_id"], "chapter_title": c.get("title")})
        correlations.append({
            "tag": tag, "log_count": count, "hours": hours_by_tag.get(tag, 0),
            "syllabus_matches": matched[:5],
        })
    correlations.sort(key=lambda x: x["hours"], reverse=True)
    return {"correlations": correlations, "total_logged_hours": round(sum(hours_by_tag.values()), 1)}


# ---------- Firm match ----------
@router.get("/articleship/firm-match")
async def firm_match(
    request: Request,
    goal: Optional[str] = None,        # big4|midtier|boutique|industry
    city: Optional[str] = None,
    min_stipend: Optional[int] = None,
    practice_areas: Optional[str] = None,   # csv
    wlb_min: Optional[float] = None,
    learning_min: Optional[float] = None,
):
    db, _, require_user, _ = get_deps(request)
    # Auth-gated so we can personalize/log usage
    _user = await require_user(request)
    all_firms = await db.firms.find({}, {"_id": 0}).to_list(500)
    wanted_areas = [a.strip().lower() for a in (practice_areas or "").split(",") if a.strip()]
    ranked = []
    for f in all_firms:
        score = 0.0
        breakdown = []
        # tier
        if goal:
            if f.get("tier") == goal:
                score += 30
                breakdown.append(("tier_match", 30))
        # city
        if city and city in (f.get("cities") or []):
            score += 15
            breakdown.append(("city_match", 15))
        # stipend
        if min_stipend:
            if (f.get("stipend_first_year_max") or 0) >= min_stipend:
                score += 15
                breakdown.append(("stipend_meets_min", 15))
        # practice areas
        if wanted_areas:
            overlap = len(set(wanted_areas).intersection([a.lower() for a in (f.get("practice_areas") or [])]))
            if overlap:
                pts = min(20, overlap * 6)
                score += pts
                breakdown.append((f"practice_overlap_{overlap}", pts))
        # score bonuses
        if wlb_min and (f.get("wlb_score") or 0) >= wlb_min:
            score += 5; breakdown.append(("wlb_ok", 5))
        if learning_min and (f.get("learning_score") or 0) >= learning_min:
            score += 5; breakdown.append(("learning_ok", 5))
        # baseline learning weight
        score += (f.get("learning_score") or 0) * 0.4
        ranked.append({"firm": f, "match_score": round(score, 1), "breakdown": breakdown})
    ranked.sort(key=lambda x: x["match_score"], reverse=True)
    return {"items": ranked[:15], "count": len(ranked)}
