from __future__ import annotations

from typing import Literal

from fastapi import APIRouter, Depends, Query
from sqlalchemy.orm import Session

from app.api.deps import current_user, optional_user
from app.core.rate_limit import rate_limit
from app.database.session import get_db
from app.models import User
from app.repositories import social as repo
from app.schemas.common import Message, Page, build_page
from app.schemas.social import (FavoriteIds, FavoriteIn, InquiryIn, InquiryOut, MentorOut, MentorProfileIn,
                                MentorRequestIn, ReplyIn, ReportIn, ReportOut)
from app.services import presenters
from app.services import social_service as svc

favorites = APIRouter(prefix="/favorites", tags=["Favorites"])


@favorites.get("")
def list_favorites(user: User = Depends(current_user), db: Session = Depends(get_db)):
    """Saved businesses, properties and marketplace items (full cards)."""
    return svc.favorites_detail(db, user)


@favorites.get("/ids", response_model=FavoriteIds)
def favorite_ids(user: User = Depends(current_user), db: Session = Depends(get_db)):
    return repo.favorite_ids(db, user.id)


@favorites.post("", response_model=Message, status_code=201)
def add_favorite(data: FavoriteIn, user: User = Depends(current_user), db: Session = Depends(get_db)):
    svc.add_favorite(db, user, data.entity_type, data.entity_id)
    return Message(message="Saved.")


@favorites.delete("/{entity_type}/{entity_id}", response_model=Message)
def remove_favorite(entity_type: Literal["business", "property", "marketplace"], entity_id: int,
                    user: User = Depends(current_user), db: Session = Depends(get_db)):
    svc.remove_favorite(db, user, entity_type, entity_id)
    return Message(message="Removed.")


inquiries = APIRouter(prefix="/inquiries", tags=["Inquiries"])


@inquiries.post("", response_model=InquiryOut, status_code=201, dependencies=[Depends(rate_limit("inquiry", 20, 3600))])
def create_inquiry(data: InquiryIn, user: User = Depends(current_user), db: Session = Depends(get_db)):
    return svc.inquiry_out(svc.create_inquiry(db, user, data), "sent")


@inquiries.get("", response_model=Page[InquiryOut])
def list_inquiries(box: Literal["received", "sent"] = "received", page: int = Query(1, ge=1), limit: int = Query(20, ge=1, le=50),
                   user: User = Depends(current_user), db: Session = Depends(get_db)):
    rows, total = repo.list_inquiries(db, user.id, box, page, limit)
    return build_page([svc.inquiry_out(i, box) for i in rows], total, page, limit)


@inquiries.get("/unread-count")
def unread_count(user: User = Depends(current_user), db: Session = Depends(get_db)):
    return {"count": repo.unread_count(db, user.id)}


@inquiries.post("/{inquiry_id}/read", response_model=InquiryOut)
def mark_read(inquiry_id: int, user: User = Depends(current_user), db: Session = Depends(get_db)):
    return svc.inquiry_out(svc.mark_read(db, user, inquiry_id), "received")


@inquiries.post("/{inquiry_id}/reply", response_model=InquiryOut)
def reply(inquiry_id: int, data: ReplyIn, user: User = Depends(current_user), db: Session = Depends(get_db)):
    return svc.inquiry_out(svc.reply(db, user, inquiry_id, data.text), "received")


reports = APIRouter(prefix="/reports", tags=["Reports"])


@reports.post("", response_model=ReportOut, status_code=201, dependencies=[Depends(rate_limit("report", 20, 3600))])
def create_report(data: ReportIn, user: User = Depends(current_user), db: Session = Depends(get_db)):
    return svc.report_out(svc.create_report(db, user, data))


mentors = APIRouter(prefix="/mentors", tags=["Mentorship"])


@mentors.get("", response_model=Page[MentorOut])
def list_mentors(q: str | None = Query(None, max_length=100), page: int = Query(1, ge=1), limit: int = Query(12, ge=1, le=50),
                 db: Session = Depends(get_db), viewer: User | None = Depends(optional_user)):
    items, total = svc.list_mentors(db, viewer, q, page, limit)
    return build_page(items, total, page, limit)


@mentors.get("/me", response_model=MentorOut | None)
def my_profile(user: User = Depends(current_user), db: Session = Depends(get_db)):
    m = svc.my_mentor_profile(db, user)
    return presenters.mentor_out(m, user) if m else None


@mentors.put("/me", response_model=MentorOut)
def save_my_profile(data: MentorProfileIn, user: User = Depends(current_user), db: Session = Depends(get_db)):
    """Creates or updates your mentor profile. It is reviewed by a moderator before it is listed."""
    return presenters.mentor_out(svc.save_mentor_profile(db, user, data), user)


@mentors.post("/{mentor_id}/request", response_model=InquiryOut, status_code=201,
              dependencies=[Depends(rate_limit("mentor_request", 20, 3600))])
def request_guidance(mentor_id: int, data: MentorRequestIn, user: User = Depends(current_user), db: Session = Depends(get_db)):
    return svc.inquiry_out(svc.request_mentor(db, user, mentor_id, data), "sent")
