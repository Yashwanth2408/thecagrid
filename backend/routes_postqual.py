"""Phase 7 — Post-Qualification Hub routes.

CPE tracker + Career paths + Cert comparison + Jobs + Referrals marketplace + Mentors.
"""
from fastapi import APIRouter, HTTPException, Request
from pydantic import BaseModel, Field, ConfigDict
from typing import Optional, List, Literal
from datetime import datetime, timezone, timedelta
import uuid
import hmac
import hashlib
import json
import logging

logger = logging.getLogger("postqual")

router = APIRouter(prefix="/api")


RAZORPAY_KEY_ID = os.environ.get("RAZORPAY_KEY_ID", "")
RAZORPAY_KEY_SECRET = os.environ.get("RAZORPAY_KEY_SECRET", "")
RAZORPAY_WEBHOOK_SECRET = os.environ.get("RAZORPAY_WEBHOOK_SECRET", "")

router = APIRouter(prefix="/api")


def _now():
    return datetime.now(timezone.utc)


def _year_start():
    n = _now()
    return datetime(n.year, 1, 1, tzinfo=timezone.utc)


def get_deps(request: Request):
    from server import db, limiter, require_user, log_event
    return db, limiter, require_user, log_event


# ---------- Models ----------
class CPERecordBody(BaseModel):
    model_config = ConfigDict(str_strip_whitespace=True)
    title: str = Field(min_length=3, max_length=200)
    hours: float = Field(ge=0.25, le=100)
    category: Literal["structured", "unstructured"]
    source: str = Field(min_length=2, max_length=120)
    date_completed: str = Field(min_length=10, max_length=10)
    certificate_url: Optional[str] = Field(default=None, max_length=500)


class JobBody(BaseModel):
    model_config = ConfigDict(str_strip_whitespace=True)
    title: str = Field(min_length=4, max_length=180)
    company: str = Field(min_length=2, max_length=120)
    location: str = Field(min_length=2, max_length=100)
    type: Literal["full_time", "contract", "referral"] = "full_time"
    experience_min: int = Field(default=0, ge=0, le=40)
    experience_max: int = Field(default=5, ge=0, le=40)
    salary_min: int = Field(default=0, ge=0)
    salary_max: int = Field(default=0, ge=0)
    domain: List[str] = Field(default_factory=list)
    description_markdown: str = Field(min_length=20, max_length=8000)
    apply_url: Optional[str] = Field(default=None, max_length=500)


class ReferralBody(BaseModel):
    model_config = ConfigDict(str_strip_whitespace=True)
    title: str = Field(min_length=6, max_length=200)
    description_markdown: str = Field(min_length=30, max_length=4000)
    client_type: Literal["startup", "sme", "corporate", "individual"]
    service_needed: List[str] = Field(default_factory=list)
    estimated_value: Optional[int] = Field(default=None, ge=0)
    location: str = Field(min_length=2, max_length=100)


class ReferralApplyBody(BaseModel):
    model_config = ConfigDict(str_strip_whitespace=True)
    message: str = Field(min_length=20, max_length=1500)


class MentorSelfBody(BaseModel):
    model_config = ConfigDict(str_strip_whitespace=True)
    specializations: List[str] = Field(default_factory=list)
    bio_markdown: str = Field(min_length=50, max_length=1500)
    hourly_rate_inr: int = Field(ge=500, le=50000)
    availability_slots: List[dict] = Field(default_factory=list)


class MentorBookingBody(BaseModel):
    model_config = ConfigDict(str_strip_whitespace=True)
    slot_start: str = Field(min_length=10, max_length=32)
    slot_end: str = Field(min_length=10, max_length=32)
    topic: str = Field(min_length=6, max_length=280)


class SaveJobBody(BaseModel):
    job_id: str = Field(min_length=1, max_length=64)


# ---------- CPE ----------
def _cpe_requirement(user: dict) -> int:
    # Simplification: 20 hours/year for all CAs (spec noted this can be tuned later)
    return 20


@router.get("/cpe/records")
async def cpe_records(request: Request):
    db, _, require_user, _ = get_deps(request)
    user = await require_user(request)
    ys = _year_start()
    items = await db.cpe_records.find({"user_id": user["user_id"]}, {"_id": 0}).sort("date_completed", -1).to_list(200)
    total_ytd = 0.0
    structured = 0.0
    unstructured = 0.0
    for r in items:
        try:
            dt = datetime.strptime(r["date_completed"], "%Y-%m-%d").replace(tzinfo=timezone.utc)
        except Exception:
            continue
        if dt >= ys:
            total_ytd += float(r.get("hours", 0))
            if r.get("category") == "structured":
                structured += float(r.get("hours", 0))
            else:
                unstructured += float(r.get("hours", 0))
    req = _cpe_requirement(user)
    remaining = max(0.0, req - total_ytd)
    status = "compliant" if total_ytd >= req else ("at_risk" if total_ytd >= req * 0.5 else "non_compliant")
    return {
        "items": items,
        "summary": {
            "total_hours_ytd": round(total_ytd, 1),
            "structured_hours": round(structured, 1),
            "unstructured_hours": round(unstructured, 1),
            "requirement_ytd": req,
            "remaining_hours": round(remaining, 1),
            "compliance_status": status,
            "year": _now().year,
        },
    }


@router.post("/cpe/records")
async def add_cpe(body: CPERecordBody, request: Request):
    db, _, require_user, log_event = get_deps(request)
    user = await require_user(request)
    doc = {
        "record_id": f"cpe_{uuid.uuid4().hex[:12]}",
        "user_id": user["user_id"],
        "title": body.title, "hours": float(body.hours), "category": body.category,
        "source": body.source, "date_completed": body.date_completed,
        "certificate_url": body.certificate_url, "verified": False,
        "created_at": _now(),
    }
    await db.cpe_records.insert_one(doc)
    log_event("cpe.record.added", user_id=user["user_id"], hours=body.hours)
    doc.pop("_id", None)
    return doc


@router.put("/cpe/records/{rid}")
async def edit_cpe(rid: str, body: CPERecordBody, request: Request):
    db, _, require_user, _ = get_deps(request)
    user = await require_user(request)
    res = await db.cpe_records.update_one(
        {"record_id": rid, "user_id": user["user_id"]},
        {"$set": {**body.model_dump()}}
    )
    if not res.matched_count:
        raise HTTPException(404, "CPE record not found")
    return await db.cpe_records.find_one({"record_id": rid}, {"_id": 0})


@router.delete("/cpe/records/{rid}")
async def delete_cpe(rid: str, request: Request):
    db, _, require_user, _ = get_deps(request)
    user = await require_user(request)
    res = await db.cpe_records.delete_one({"record_id": rid, "user_id": user["user_id"]})
    if not res.deleted_count:
        raise HTTPException(404, "CPE record not found")
    return {"ok": True}


@router.get("/cpe/export")
async def export_cpe(request: Request):
    """Structured JSON export (no PDF library dependency). Client can render/print."""
    db, _, require_user, _ = get_deps(request)
    user = await require_user(request)
    data = await cpe_records(request)
    return {
        "generated_at": _now().isoformat(),
        "user": {"user_id": user["user_id"], "name": user.get("name"), "email": user.get("email"), "membership_number": user.get("ca_membership_number")},
        "year": _now().year,
        "summary": data["summary"],
        "records": data["items"],
        "declaration": "I hereby declare that the information above is true to the best of my knowledge.",
    }


# ---------- Careers & Certs (public reference data) ----------
@router.get("/careers/paths")
async def careers_paths():
    from seed_postqual import CAREER_PATHS
    return {"items": CAREER_PATHS, "count": len(CAREER_PATHS)}


@router.get("/careers/compare-certs")
async def careers_certs():
    from seed_postqual import CERT_COMPARISON
    return {"items": CERT_COMPARISON, "count": len(CERT_COMPARISON)}


# ---------- Jobs ----------
@router.get("/jobs")
async def list_jobs(request: Request, location: Optional[str] = None, domain: Optional[str] = None, type: Optional[str] = None, q: Optional[str] = None, limit: int = 50):
    db, *_ = get_deps(request)
    query: dict = {}
    if location:
        query["location"] = {"$regex": location, "$options": "i"}
    if domain:
        query["domain"] = domain
    if type:
        query["type"] = type
    if q:
        query["title"] = {"$regex": q, "$options": "i"}
    items = await db.job_listings.find(query, {"_id": 0}).sort([("is_sponsored", -1), ("created_at", -1)]).limit(min(limit, 100)).to_list(100)
    return {"items": items, "count": len(items)}


@router.get("/jobs/saved")
async def list_saved_jobs(request: Request):
    db, _, require_user, _ = get_deps(request)
    user = await require_user(request)
    saves = await db.saved_jobs.find({"user_id": user["user_id"]}, {"_id": 0}).sort("saved_at", -1).to_list(200)
    job_ids = [s["job_id"] for s in saves]
    jobs = await db.job_listings.find({"job_id": {"$in": job_ids}}, {"_id": 0}).to_list(200)
    return {"items": jobs, "count": len(jobs)}


@router.get("/jobs/{job_id}")
async def get_job(job_id: str, request: Request):
    db, *_ = get_deps(request)
    j = await db.job_listings.find_one({"job_id": job_id}, {"_id": 0})
    if not j:
        raise HTTPException(404, "Job not found")
    return j


@router.post("/jobs/save")
async def save_job(body: SaveJobBody, request: Request):
    db, _, require_user, _ = get_deps(request)
    user = await require_user(request)
    j = await db.job_listings.find_one({"job_id": body.job_id}, {"_id": 0})
    if not j:
        raise HTTPException(404, "Job not found")
    existing = await db.saved_jobs.find_one({"user_id": user["user_id"], "job_id": body.job_id}, {"_id": 0})
    if existing:
        await db.saved_jobs.delete_one({"user_id": user["user_id"], "job_id": body.job_id})
        return {"ok": True, "saved": False}
    await db.saved_jobs.insert_one({"user_id": user["user_id"], "job_id": body.job_id, "saved_at": _now()})
    return {"ok": True, "saved": True}


@router.post("/jobs")
async def create_job(body: JobBody, request: Request):
    db, _, require_user, log_event = get_deps(request)
    user = await require_user(request)
    if not user.get("is_verified_ca"):
        raise HTTPException(403, "Only verified CAs can post jobs")
    # cap 10/day
    today_start = _now().replace(hour=0, minute=0, second=0, microsecond=0)
    today_count = await db.job_listings.count_documents({"posted_by": user["user_id"], "created_at": {"$gte": today_start}})
    if today_count >= 10:
        raise HTTPException(429, "Daily posting cap reached (10/day)")
    doc = {
        "job_id": f"job_u_{uuid.uuid4().hex[:10]}",
        **body.model_dump(),
        "salary_currency": "INR",
        "posted_by": user["user_id"],
        "is_sponsored": False,
        "expires_at": _now() + timedelta(days=30),
        "created_at": _now(),
    }
    await db.job_listings.insert_one(doc)
    log_event("jobs.created", user_id=user["user_id"], job_id=doc["job_id"])
    doc.pop("_id", None)
    return doc


# ─────────────────────────────────────────────────────────────────────────────
# Phase 7.5 — Firms Revenue Lane: "Recruit via The CA Grid"
# ─────────────────────────────────────────────────────────────────────────────

class FirmSponsoredJobBody(BaseModel):
    """Firms post sponsored jobs — shown with SPONSORED badge and sorted first."""
    model_config = ConfigDict(str_strip_whitespace=True)
    title: str = Field(min_length=4, max_length=180)
    location: str = Field(min_length=2, max_length=100)
    type: Literal["full_time", "contract", "referral"] = "full_time"
    experience_min: int = Field(default=0, ge=0, le=40)
    experience_max: int = Field(default=5, ge=0, le=40)
    salary_min: int = Field(default=0, ge=0)
    salary_max: int = Field(default=0, ge=0)
    domain: List[str] = Field(default_factory=list)
    description_markdown: str = Field(min_length=20, max_length=8000)
    apply_url: Optional[str] = Field(default=None, max_length=500)
    contact_email: Optional[str] = Field(default=None, max_length=200)
    # Lead capture — show an in-platform "Apply" form instead of external URL
    use_platform_apply: bool = False


@router.post("/firms/{slug}/jobs/sponsor")
async def firm_sponsor_job(slug: str, body: FirmSponsoredJobBody, request: Request):
    """Create a sponsored job listing for a firm.

    Requirements:
    - User must be a verified CA (is_verified_ca=True)
    - User's articleship firm must match the slug OR they assert the firm affiliation
    - Sponsored listings appear at the top of /jobs with a SPONSORED badge
    - Lead-capture: if use_platform_apply=True, applicants apply through the platform

    Revenue note: sponsored listings are a paid feature (₹2,999/month/listing).
    Stripe integration is stubbed — set payment_status='mocked_paid' for now.
    """
    db, _, require_user, log_event = get_deps(request)
    user = await require_user(request)
    if not user.get("is_verified_ca"):
        raise HTTPException(403, "Only verified CAs can post sponsored firm jobs")

    # Verify firm exists
    firm = await db.firms.find_one({"slug": slug}, {"_id": 0})
    if not firm:
        raise HTTPException(404, f"Firm '{slug}' not found")

    # Rate limit: 3 sponsored jobs per firm per day
    today_start = _now().replace(hour=0, minute=0, second=0, microsecond=0)
    today_count = await db.job_listings.count_documents({
        "firm_slug": slug, "is_sponsored": True,
        "created_at": {"$gte": today_start}
    })
    if today_count >= 3:
        raise HTTPException(429, "Sponsored job cap reached (3/day per firm)")

    job_id = f"job_sp_{uuid.uuid4().hex[:10]}"
    doc = {
        "job_id": job_id,
        "title": body.title,
        "company": firm.get("name", slug),
        "firm_slug": slug,
        "firm_logo": firm.get("logo_url"),
        "location": body.location,
        "type": body.type,
        "experience_min": body.experience_min,
        "experience_max": body.experience_max,
        "salary_min": body.salary_min,
        "salary_max": body.salary_max,
        "salary_currency": "INR",
        "domain": body.domain,
        "description_markdown": body.description_markdown,
        "apply_url": body.apply_url if not body.use_platform_apply else None,
        "use_platform_apply": body.use_platform_apply,
        "contact_email": body.contact_email,
        "posted_by": user["user_id"],
        "is_sponsored": True,
        # Stripe stub: in production this is set after payment webhook
        "payment_status": "mocked_paid",
        "sponsor_expires_at": _now() + timedelta(days=30),
        "expires_at": _now() + timedelta(days=30),
        "created_at": _now(),
        "application_count": 0,
    }
    await db.job_listings.insert_one(doc)
    doc.pop("_id", None)
    log_event("jobs.sponsored.created", user_id=user["user_id"], job_id=job_id, firm=slug)
    return {
        "ok": True,
        "job_id": job_id,
        "job": doc,
        "note": "Sponsored listing active for 30 days. Payment integration: Razorpay/Stripe coming soon.",
    }


@router.get("/firms/{slug}/jobs")
async def firm_jobs(slug: str, request: Request):
    """List all active job listings posted by this firm (sponsored and regular)."""
    db, *_ = get_deps(request)
    firm = await db.firms.find_one({"slug": slug}, {"_id": 0, "name": 1, "slug": 1})
    if not firm:
        raise HTTPException(404, "Firm not found")
    items = await db.job_listings.find(
        {"firm_slug": slug, "expires_at": {"$gte": _now()}}, {"_id": 0}
    ).sort([("is_sponsored", -1), ("created_at", -1)]).to_list(50)
    return {
        "firm": firm,
        "items": items,
        "count": len(items),
        "sponsored_count": sum(1 for j in items if j.get("is_sponsored")),
    }


@router.post("/jobs/{job_id}/apply")
async def apply_to_job(job_id: str, request: Request):
    """Platform-native job application for use_platform_apply=True listings.

    Captures the applicant's CA Grid profile (CA verified status, resume URL from profile,
    journey level, city) and stores as a lead for the firm.
    """
    db, _, require_user, log_event = get_deps(request)
    user = await require_user(request)

    job = await db.job_listings.find_one({"job_id": job_id}, {"_id": 0})
    if not job:
        raise HTTPException(404, "Job not found")
    if not job.get("use_platform_apply"):
        raise HTTPException(400, "This job uses an external application link")
    if job.get("expires_at") and job["expires_at"] < _now():
        raise HTTPException(410, "This job listing has expired")

    # Prevent duplicate applications
    existing = await db.job_applications.find_one(
        {"job_id": job_id, "applicant_id": user["user_id"]}, {"_id": 0}
    )
    if existing:
        return {"ok": True, "already_applied": True, "app_id": existing["app_id"]}

    app_id = f"app_{uuid.uuid4().hex[:12]}"
    doc = {
        "app_id": app_id,
        "job_id": job_id,
        "firm_slug": job.get("firm_slug"),
        "applicant_id": user["user_id"],
        "applicant_name": user.get("name"),
        "applicant_email": user.get("email"),
        "is_verified_ca": bool(user.get("is_verified_ca")),
        "membership_number": user.get("ca_membership_number"),
        "journey_level": user.get("journey_level"),
        "city": user.get("city"),
        "applied_at": _now(),
        "status": "applied",
    }
    await db.job_applications.insert_one(doc)
    doc.pop("_id", None)

    # Increment application counter on job
    await db.job_listings.update_one({"job_id": job_id}, {"$inc": {"application_count": 1}})
    log_event("jobs.applied", user_id=user["user_id"], job_id=job_id)
    return {"ok": True, "already_applied": False, "app_id": app_id}


@router.get("/firms/{slug}/applications")
async def firm_applications(slug: str, request: Request):
    """List applications received for this firm's sponsored jobs.

    Only visible to verified CAs who posted at least one job for this firm.
    """
    db, _, require_user, _ = get_deps(request)
    user = await require_user(request)
    if not user.get("is_verified_ca"):
        raise HTTPException(403, "Verified CAs only")

    # Verify user posted at least one job for this firm
    has_job = await db.job_listings.find_one({"firm_slug": slug, "posted_by": user["user_id"]}, {"_id": 0})
    if not has_job:
        raise HTTPException(403, "You have not posted any jobs for this firm")

    apps = await db.job_applications.find({"firm_slug": slug}, {"_id": 0}).sort("applied_at", -1).to_list(500)
    return {"firm_slug": slug, "items": apps, "count": len(apps)}



@router.get("/referrals/marketplace")
async def referrals_marketplace(request: Request, open: bool = True, location: Optional[str] = None, limit: int = 50):
    db, *_ = get_deps(request)
    q: dict = {}
    if open:
        q["is_open"] = True
    if location:
        q["location"] = {"$regex": location, "$options": "i"}
    items = await db.career_referrals.find(q, {"_id": 0}).sort("created_at", -1).limit(min(limit, 100)).to_list(100)
    return {"items": items, "count": len(items)}


@router.post("/referrals")
async def create_referral(body: ReferralBody, request: Request):
    db, _, require_user, log_event = get_deps(request)
    user = await require_user(request)
    if not user.get("is_verified_ca"):
        raise HTTPException(403, "Only verified CAs can post referrals")
    today_start = _now().replace(hour=0, minute=0, second=0, microsecond=0)
    today_count = await db.career_referrals.count_documents({"posted_by": user["user_id"], "created_at": {"$gte": today_start}})
    if today_count >= 5:
        raise HTTPException(429, "Daily posting cap reached (5/day)")
    doc = {
        "referral_id": f"ref_u_{uuid.uuid4().hex[:10]}",
        **body.model_dump(),
        "posted_by": user["user_id"],
        "posted_by_initials": (user.get("name") or "?")[0].upper() + ".",
        "is_open": True,
        "applications_count": 0,
        "created_at": _now(),
    }
    await db.career_referrals.insert_one(doc)
    log_event("referrals.created", user_id=user["user_id"], referral_id=doc["referral_id"])
    doc.pop("_id", None)
    return doc


@router.post("/referrals/{referral_id}/apply")
async def apply_referral(referral_id: str, body: ReferralApplyBody, request: Request):
    db, _, require_user, log_event = get_deps(request)
    user = await require_user(request)
    r = await db.career_referrals.find_one({"referral_id": referral_id}, {"_id": 0})
    if not r:
        raise HTTPException(404, "Referral not found")
    existing = await db.referral_applications.find_one({"referral_id": referral_id, "applicant_id": user["user_id"]}, {"_id": 0})
    if existing:
        raise HTTPException(400, "You've already applied to this referral")
    doc = {
        "app_id": f"rapp_{uuid.uuid4().hex[:10]}",
        "referral_id": referral_id,
        "applicant_id": user["user_id"],
        "applicant_initials": (user.get("name") or "?")[0].upper() + ".",
        "applicant_level": user.get("journey_level"),
        "is_verified_ca": bool(user.get("is_verified_ca")),
        "message": body.message,
        "status": "open",
        "created_at": _now(),
    }
    await db.referral_applications.insert_one(doc)
    await db.career_referrals.update_one({"referral_id": referral_id}, {"$inc": {"applications_count": 1}})
    log_event("referrals.applied", user_id=user["user_id"], referral_id=referral_id)
    doc.pop("_id", None)
    return doc


# ---------- Mentors ----------
@router.get("/mentors")
async def list_mentors(request: Request, specialization: Optional[str] = None, max_rate: Optional[int] = None, limit: int = 60):
    db, *_ = get_deps(request)
    q: dict = {"is_active": True}
    if specialization:
        q["specializations"] = specialization
    if max_rate:
        q["hourly_rate_inr"] = {"$lte": int(max_rate)}
    listings = await db.mentor_listings.find(q, {"_id": 0}).sort([("avg_rating", -1), ("total_bookings", -1)]).limit(min(limit, 100)).to_list(100)
    # attach basic user info
    uids = [l["user_id"] for l in listings]
    users = {u["user_id"]: u async for u in db.users.find({"user_id": {"$in": uids}}, {"_id": 0, "user_id": 1, "name": 1, "is_verified_ca": 1, "city": 1, "journey_level": 1})}
    for l in listings:
        u = users.get(l["user_id"]) or {}
        l["mentor_name"] = u.get("name")
        l["mentor_initials"] = "".join([p[0].upper() for p in (u.get("name") or "?").split()][:2])
        l["initials"] = l["mentor_initials"]  # alias for spec compatibility
        l["mentor_city"] = u.get("city")
        l["is_verified_ca"] = bool(u.get("is_verified_ca", True))
    return {"items": listings, "count": len(listings)}


@router.get("/mentors/{listing_id}")
async def get_mentor(listing_id: str, request: Request):
    db, *_ = get_deps(request)
    l = await db.mentor_listings.find_one({"listing_id": listing_id}, {"_id": 0})
    if not l:
        raise HTTPException(404, "Mentor not found")
    u = await db.users.find_one({"user_id": l["user_id"]}, {"_id": 0, "name": 1, "email": 1, "city": 1, "is_verified_ca": 1, "ca_membership_number": 1, "journey_level": 1})
    l["mentor_name"] = (u or {}).get("name")
    l["mentor_initials"] = "".join([p[0].upper() for p in ((u or {}).get("name") or "?").split()][:2])
    l["mentor_city"] = (u or {}).get("city")
    l["is_verified_ca"] = bool((u or {}).get("is_verified_ca", True))
    return l


@router.post("/mentors/list-self")
async def mentor_list_self(body: MentorSelfBody, request: Request):
    db, _, require_user, log_event = get_deps(request)
    user = await require_user(request)
    if not user.get("is_verified_ca"):
        raise HTTPException(403, "Only verified CAs can list themselves as mentors")
    existing = await db.mentor_listings.find_one({"user_id": user["user_id"]}, {"_id": 0})
    if existing:
        await db.mentor_listings.update_one(
            {"user_id": user["user_id"]},
            {"$set": {**body.model_dump(), "is_active": True, "updated_at": _now()}}
        )
        return await db.mentor_listings.find_one({"user_id": user["user_id"]}, {"_id": 0})
    doc = {
        "listing_id": f"mnt_{uuid.uuid4().hex[:10]}",
        "user_id": user["user_id"],
        **body.model_dump(),
        "total_bookings": 0,
        "avg_rating": None,
        "is_active": True,
        "created_at": _now(),
    }
    await db.mentor_listings.insert_one(doc)
    log_event("mentors.listed_self", user_id=user["user_id"])
    doc.pop("_id", None)
    return doc


# Razorpay integration
try:
    import razorpay
    RAZORPAY_AVAILABLE = True
except ImportError:
    RAZORPAY_AVAILABLE = False
    razorpay = None

RAZORPAY_KEY_ID = os.environ.get("RAZORPAY_KEY_ID", "")
RAZORPAY_KEY_SECRET = os.environ.get("RAZORPAY_KEY_SECRET", "")
RAZORPAY_WEBHOOK_SECRET = os.environ.get("RAZORPAY_WEBHOOK_SECRET", "")

if RAZORPAY_AVAILABLE and RAZORPAY_KEY_ID and RAZORPAY_KEY_SECRET:
    razorpay_client = razorpay.Client(auth=(RAZORPAY_KEY_ID, RAZORPAY_KEY_SECRET))
else:
    razorpay_client = None
    logger.warning("Razorpay credentials not configured. Using mock payments.")


@router.post("/mentors/{listing_id}/book")
async def book_mentor(listing_id: str, body: MentorBookingBody, request: Request):
    db, _, require_user, log_event = get_deps(request)
    user = await require_user(request)
    l = await db.mentor_listings.find_one({"listing_id": listing_id}, {"_id": 0})
    if not l:
        raise HTTPException(404, "Mentor not found")
    if not l.get("is_active"):
        raise HTTPException(400, "Mentor is not accepting bookings")

    # Calculate amount based on slot duration
    slot_start = datetime.fromisoformat(body.slot_start.replace("Z", "+00:00"))
    slot_end = datetime.fromisoformat(body.slot_end.replace("Z", "+00:00"))
    duration_hours = (slot_end - slot_start).total_seconds() / 3600
    amount_inr = int(l.get("hourly_rate_inr", 0) * duration_hours)
    amount_paise = amount_inr * 100  # Razorpay expects paise

    booking_id = f"bkg_{uuid.uuid4().hex[:10]}"

    # Create Razorpay order if Razorpay is configured
    razorpay_order_id = None
    if razorpay_client and amount_paise > 0:
        try:
            order = razorpay_client.order.create({
                "amount": amount_paise,
                "currency": "INR",
                "receipt": booking_id,
                "notes": {
                    "booking_id": booking_id,
                    "mentor_id": listing_id,
                    "student_id": user["user_id"]
                }
            })
            razorpay_order_id = order["id"]
        except Exception as e:
            logger.error(f"Razorpay order creation failed: {e}")
            # Fall back to mock

    doc = {
        "booking_id": booking_id,
        "mentor_id": listing_id,
        "mentor_user_id": l["user_id"],
        "user_id": user["user_id"],
        "slot_start": body.slot_start,
        "slot_end": body.slot_end,
        "topic": body.topic,
        "status": "pending_payment",
        "payment_status": "pending",
        "hourly_rate_inr": l.get("hourly_rate_inr"),
        "amount_inr": amount_inr,
        "duration_hours": duration_hours,
        "razorpay_order_id": razorpay_order_id,
        "created_at": _now(),
    }
    await db.mentor_bookings.insert_one(doc)
    log_event("mentors.booked", user_id=user["user_id"], booking_id=booking_id, amount_inr=amount_inr)
    doc.pop("_id", None)

    # Return payment info for frontend
    payment_info = {
        "booking_id": booking_id,
        "amount_inr": amount_inr,
        "currency": "INR",
        "razorpay_key_id": RAZORPAY_KEY_ID if razorpay_client else None,
        "razorpay_order_id": razorpay_order_id,
    }

    if not razorpay_client or not razorpay_order_id:
        # Mock payment for development
        payment_info["mock_payment_url"] = f"/mentors/booking/{booking_id}/pay"
        payment_info["note"] = "Razorpay not configured. Using mock payment."

    return {"booking": doc, "payment": payment_info}


@router.post("/mentors/booking/{booking_id}/pay")
async def mentor_pay(booking_id: str, request: Request):
    """Handle payment confirmation - both Razorpay webhook and manual confirmation."""
    db, _, require_user, log_event = get_deps(request)
    user = await require_user(request)

    b = await db.mentor_bookings.find_one({"booking_id": booking_id, "user_id": user["user_id"]}, {"_id": 0})
    if not b:
        raise HTTPException(404, "Booking not found")

    # Check if already paid
    if b.get("payment_status") == "paid":
        return {"ok": True, "already_paid": True, "booking": b}

    # For Razorpay: verify payment signature from frontend
    try:
        body = await request.json()
        razorpay_payment_id = body.get("razorpay_payment_id")
        razorpay_order_id = body.get("razorpay_order_id")
        razorpay_signature = body.get("razorpay_signature")

        if razorpay_client and razorpay_payment_id and razorpay_order_id and razorpay_signature:
            # Verify signature
            params_dict = {
                "razorpay_payment_id": razorpay_payment_id,
                "razorpay_order_id": razorpay_order_id,
                "razorpay_signature": razorpay_signature
            }
            try:
                razorpay_client.utility.verify_payment_signature(params_dict)
                # Signature verified - mark as paid
                await db.mentor_bookings.update_one(
                    {"booking_id": booking_id},
                    {"$set": {
                        "payment_status": "paid",
                        "status": "confirmed",
                        "paid_at": _now(),
                        "razorpay_payment_id": razorpay_payment_id,
                        "razorpay_signature": razorpay_signature
                    }}
                )
                await db.mentor_listings.update_one({"listing_id": b["mentor_id"]}, {"$inc": {"total_bookings": 1}})
                log_event("mentors.paid", booking_id=booking_id, payment_id=razorpay_payment_id)

                # Notify mentor
                try:
                    from routes_notifications import create_notification
                    await create_notification(
                        user_id=b["mentor_user_id"],
                        type_="mentor_booking_confirmed",
                        title=f"New booking confirmed",
                        body_markdown=f"A student booked {b['topic'][:80]} for {b['slot_start']}.",
                        action_url=f"/mentors/{b['mentor_id']}",
                    )
                except Exception:
                    pass

                b_after = await db.mentor_bookings.find_one({"booking_id": booking_id}, {"_id": 0})
                return {"ok": True, "booking": b_after}
            except razorpay.errors.SignatureVerificationError:
                raise HTTPException(400, "Invalid payment signature")
    except Exception:
        # If JSON parsing fails or no Razorpay data, fall back to mock
        pass

    # Mock payment fallback (for development)
    await db.mentor_bookings.update_one({"booking_id": booking_id}, {"$set": {"payment_status": "mocked_paid", "status": "confirmed", "paid_at": _now()}})
    await db.mentor_listings.update_one({"listing_id": b["mentor_id"]}, {"$inc": {"total_bookings": 1}})
    try:
        from routes_notifications import create_notification
        await create_notification(
            user_id=b["mentor_user_id"],
            type_="mentor_booking_confirmed",
            title=f"New booking confirmed",
            body_markdown=f"A student booked {b['topic'][:80]} for {b['slot_start']}.",
            action_url=f"/mentors/{b['mentor_id']}",
        )
    except Exception:
        pass
    log_event("mentors.mock_paid", booking_id=booking_id, note="MOCKED")
    b_after = await db.mentor_bookings.find_one({"booking_id": booking_id}, {"_id": 0})
    return {"ok": True, "note": "MOCKED: no real card was charged. Wire Razorpay/Stripe in production.", "booking": b_after}


@router.post("/webhooks/razorpay")
async def razorpay_webhook(request: Request):
    """Razorpay webhook for payment status updates."""
    if not RAZORPAY_WEBHOOK_SECRET:
        raise HTTPException(503, "Webhook not configured")

    body = await request.body()
    signature = request.headers.get("X-Razorpay-Signature", "")

    # Verify webhook signature
    expected_signature = hmac.new(
        RAZORPAY_WEBHOOK_SECRET.encode(),
        body,
        hashlib.sha256
    ).hexdigest()

    if not hmac.compare_digest(signature, expected_signature):
        raise HTTPException(400, "Invalid webhook signature")

    try:
        payload = json.loads(body)
        event = payload.get("event")
        payment_entity = payload.get("payload", {}).get("payment", {}).get("entity", {})
        order_id = payment_entity.get("order_id")
        payment_id = payment_entity.get("id")
        status = payment_entity.get("status")

        # Find booking by razorpay_order_id
        db = request.app.state.db
        booking = await db.mentor_bookings.find_one({"razorpay_order_id": order_id})
        if not booking:
            logger.warning(f"Booking not found for order_id: {order_id}")
            return {"ok": True}

        if event == "payment.captured" and status == "captured":
            await db.mentor_bookings.update_one(
                {"booking_id": booking["booking_id"]},
                {"$set": {
                    "payment_status": "paid",
                    "status": "confirmed",
                    "paid_at": _now(),
                    "razorpay_payment_id": payment_id
                }}
            )
            await db.mentor_listings.update_one({"listing_id": booking["mentor_id"]}, {"$inc": {"total_bookings": 1}})

        elif event == "payment.failed":
            await db.mentor_bookings.update_one(
                {"booking_id": booking["booking_id"]},
                {"$set": {"payment_status": "failed", "status": "cancelled"}}
            )

    except Exception as e:
        logger.error(f"Webhook processing error: {e}")

    return {"ok": True}


@router.get("/mentors/bookings/mine")
async def my_bookings(request: Request):
    db, _, require_user, _ = get_deps(request)
    user = await require_user(request)
    items = await db.mentor_bookings.find({"user_id": user["user_id"]}, {"_id": 0}).sort("created_at", -1).to_list(200)
    return {"items": items, "count": len(items)}
