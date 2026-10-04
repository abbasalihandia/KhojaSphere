from __future__ import annotations

from datetime import datetime, timezone

from sqlalchemy import select
from sqlalchemy.orm import Session

from app.core.errors import BadRequest, Conflict, Forbidden, NotFound
from app.models import Favorite, Inquiry, MentorProfile, Report, User
from app.repositories import listings as lrepo
from app.repositories import social as repo
from app.schemas.social import (InquiryIn, InquiryOut, MentorProfileIn, MentorRequestIn, ReportIn, ReportOut)
from app.services import presenters
from app.utils.formatting import time_ago
from app.utils.text import build_search_text, clean, clean_multiline

REPORT_STATUS_LABEL = {"pending": "Pending Review", "under_review": "Under Review", "resolved": "Resolved"}
TYPE_LABEL = {"business": "Business", "property": "Property", "marketplace": "Marketplace"}


# ------------------------------------------------------------------ favorites
def add_favorite(db: Session, user: User, entity_type: str, entity_id: int) -> None:
    obj = lrepo.get_entity(db, entity_type, entity_id)
    if obj is None or obj.status != lrepo.VISIBLE_STATUS[entity_type]:
        raise NotFound("That listing is not available.")
    if repo.get_favorite(db, user.id, entity_type, entity_id) is None:
        db.add(Favorite(user_id=user.id, entity_type=entity_type, entity_id=entity_id))
        db.commit()


def remove_favorite(db: Session, user: User, entity_type: str, entity_id: int) -> None:
    fav = repo.get_favorite(db, user.id, entity_type, entity_id)
    if fav:
        db.delete(fav)
        db.commit()


def favorites_detail(db: Session, user: User) -> dict:
    ids = repo.favorite_ids(db, user.id)
    out: dict[str, list] = {"businesses": [], "properties": [], "marketplace": []}
    for et, key, fn in (("business", "businesses", presenters.business_out), ("property", "properties", presenters.property_out),
                        ("marketplace", "marketplace", presenters.market_out)):
        for i in ids[et]:
            obj = lrepo.get_entity(db, et, i)
            if obj is not None and obj.status == lrepo.VISIBLE_STATUS[et]:
                out[key].append(fn(obj, user))
    return out


# ------------------------------------------------------------------ inquiries
def inquiry_out(i: Inquiry, box: str) -> InquiryOut:
    return InquiryOut(id=i.id, target_type=i.target_type, target_id=i.target_id, target_title=i.target_title,
                      sender_name=i.sender_name, message=i.message, contact_method=i.contact_method, status=i.status,
                      reply_text=i.reply_text, replied_at=i.replied_at, created_at=i.created_at,
                      time=time_ago(i.created_at), box=box)


def create_inquiry(db: Session, user: User, data: InquiryIn) -> Inquiry:
    if data.target_type == "mentor":
        m = repo.get_mentor(db, data.target_id)
        if not m or m.status != "approved":
            raise NotFound("Mentor not found.")
        title, receiver = m.name, m.user_id
    else:
        obj = lrepo.get_entity(db, data.target_type, data.target_id)
        if obj is None or obj.status != lrepo.VISIBLE_STATUS[data.target_type]:
            raise NotFound("That listing is not available.")
        title, receiver = lrepo.title_of(data.target_type, obj), lrepo.owner_of(data.target_type, obj)
    if receiver is not None and receiver == user.id:
        raise BadRequest("You cannot send an inquiry to your own listing.", code="own_listing")
    inq = Inquiry(sender_id=user.id, receiver_id=receiver, target_type=data.target_type, target_id=data.target_id,
                  target_title=title, sender_name=clean(data.name), message=clean_multiline(data.message),
                  contact_method=data.contact_method, status="unread")
    db.add(inq)
    db.commit()
    return inq


def _own_received(db: Session, user: User, inquiry_id: int) -> Inquiry:
    inq = repo.get_inquiry(db, inquiry_id)
    if not inq:
        raise NotFound("Inquiry not found.")
    if inq.receiver_id != user.id:
        raise Forbidden("You can only manage inquiries sent to you.")
    return inq


def mark_read(db: Session, user: User, inquiry_id: int) -> Inquiry:
    inq = _own_received(db, user, inquiry_id)
    if inq.status == "unread":
        inq.status = "read"
        db.commit()
    return inq


def reply(db: Session, user: User, inquiry_id: int, text: str) -> Inquiry:
    inq = _own_received(db, user, inquiry_id)
    inq.reply_text = clean_multiline(text)
    inq.replied_at = datetime.now(timezone.utc)
    inq.status = "replied"
    db.commit()
    return inq


# ------------------------------------------------------------------ reports
def report_out(r: Report) -> ReportOut:
    return ReportOut(id=r.id, listing=r.entity_title, type=TYPE_LABEL.get(r.entity_type, r.entity_type),
                     entity_type=r.entity_type, entity_id=r.entity_id, reason=r.reason, details=r.details,
                     status=REPORT_STATUS_LABEL.get(r.status, r.status), status_key=r.status,
                     date=r.created_at.strftime("%d %b %Y"))


def create_report(db: Session, user: User, data: ReportIn) -> Report:
    obj = lrepo.get_entity(db, data.entity_type, data.entity_id)
    if obj is None:
        raise NotFound("That listing no longer exists.")
    dup = db.scalar(select(Report).where(Report.reporter_id == user.id, Report.entity_type == data.entity_type,
                                         Report.entity_id == data.entity_id, Report.status != "resolved"))
    if dup:
        raise Conflict("You have already reported this listing. Our team is reviewing it.", code="already_reported")
    r = Report(reporter_id=user.id, entity_type=data.entity_type, entity_id=data.entity_id,
               entity_title=lrepo.title_of(data.entity_type, obj)[:200], reason=clean(data.reason),
               details=clean_multiline(data.details) or None)
    db.add(r)
    db.commit()
    return r


# ------------------------------------------------------------------ mentors
def mentor_search_text(m: MentorProfile) -> str:
    return build_search_text(m.name, m.headline, m.expertise, m.education, m.format, m.bio)


def list_mentors(db: Session, viewer: User | None, q: str | None, page: int, limit: int):
    rows, total = repo.list_mentors(db, q=q, statuses=["approved"], page=page, limit=limit)
    requested = repo.requested_mentor_ids(db, viewer.id) if viewer else set()
    return [presenters.mentor_out(m, viewer, m.id in requested) for m in rows], total


def my_mentor_profile(db: Session, user: User) -> MentorProfile | None:
    return repo.get_mentor_by_user(db, user.id)


def save_mentor_profile(db: Session, user: User, data: MentorProfileIn) -> MentorProfile:
    m = repo.get_mentor_by_user(db, user.id)
    if m is None:
        m = MentorProfile(user_id=user.id, name=user.name, is_sample=False)
        db.add(m)
    m.name = user.name
    m.headline = clean(data.headline)
    m.expertise = [clean(x) for x in data.expertise if clean(x)][:10]
    m.education = clean(data.education) or None
    m.format = clean(data.format) or None
    m.availability = clean(data.availability) or None
    m.bio = clean_multiline(data.bio) or None
    if data.image:
        m.image_url = data.image
    m.status = "pending"  # every change is re-reviewed before it is published
    m.search_text = mentor_search_text(m)
    db.commit()
    return m


def request_mentor(db: Session, user: User, mentor_id: int, data: MentorRequestIn) -> Inquiry:
    from app.schemas.social import InquiryIn
    msg = clean_multiline(data.message) or "I would like guidance from you. Could we connect to discuss my goals?"
    if len(msg) < 5:
        raise BadRequest("Message is too short.")
    if mentor_id in repo.requested_mentor_ids(db, user.id):
        raise Conflict("You have already requested guidance from this mentor.", code="already_requested")
    return create_inquiry(db, user, InquiryIn(target_type="mentor", target_id=mentor_id, name=user.name, message=msg))
