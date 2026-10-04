from __future__ import annotations

from sqlalchemy import func, or_, select
from sqlalchemy.orm import Session

from app.models import Category, Favorite, Inquiry, MentorProfile, Report
from app.repositories.common import paginate
from app.utils.text import escape_like


# ---- favorites
def favorite_ids(db: Session, user_id: int) -> dict[str, list[int]]:
    out: dict[str, list[int]] = {"business": [], "property": [], "marketplace": []}
    for t, i in db.execute(select(Favorite.entity_type, Favorite.entity_id).where(Favorite.user_id == user_id)
                           .order_by(Favorite.created_at.desc(), Favorite.id.desc())).all():
        out.setdefault(t, []).append(i)
    return out


def get_favorite(db: Session, user_id: int, entity_type: str, entity_id: int) -> Favorite | None:
    return db.scalar(select(Favorite).where(Favorite.user_id == user_id, Favorite.entity_type == entity_type,
                                            Favorite.entity_id == entity_id))


def count_favorites(db: Session, user_id: int) -> int:
    return db.scalar(select(func.count()).select_from(Favorite).where(Favorite.user_id == user_id)) or 0


# ---- inquiries
def get_inquiry(db: Session, inquiry_id: int) -> Inquiry | None:
    return db.get(Inquiry, inquiry_id)


def list_inquiries(db: Session, user_id: int, box: str, page: int, limit: int):
    col = Inquiry.receiver_id if box == "received" else Inquiry.sender_id
    stmt = select(Inquiry).where(col == user_id).order_by(Inquiry.created_at.desc(), Inquiry.id.desc())
    return paginate(db, stmt, page, limit)


def unread_count(db: Session, user_id: int) -> int:
    return db.scalar(select(func.count()).select_from(Inquiry).where(Inquiry.receiver_id == user_id, Inquiry.status == "unread")) or 0


def recent_received(db: Session, user_id: int, limit: int = 5) -> list[Inquiry]:
    return list(db.scalars(select(Inquiry).where(Inquiry.receiver_id == user_id)
                           .order_by(Inquiry.created_at.desc()).limit(limit)).all())


# ---- reports
def get_report(db: Session, report_id: int) -> Report | None:
    return db.get(Report, report_id)


def list_reports(db: Session, *, status: str | None, page: int, limit: int):
    stmt = select(Report)
    if status:
        stmt = stmt.where(Report.status == status)
    return paginate(db, stmt.order_by(Report.created_at.desc(), Report.id.desc()), page, limit)


def open_reports_count(db: Session) -> int:
    return db.scalar(select(func.count()).select_from(Report).where(Report.status != "resolved")) or 0


# ---- categories
def list_categories(db: Session, kind: str | None = None, include_inactive: bool = False) -> list[Category]:
    stmt = select(Category)
    if kind:
        stmt = stmt.where(Category.kind == kind)
    if not include_inactive:
        stmt = stmt.where(Category.is_active.is_(True))
    return list(db.scalars(stmt.order_by(Category.kind, Category.sort_order, Category.name)).all())


def get_category(db: Session, cat_id: int) -> Category | None:
    return db.get(Category, cat_id)


def find_category(db: Session, kind: str, name: str) -> Category | None:
    return db.scalar(select(Category).where(Category.kind == kind, func.lower(Category.name) == name.lower()))


# ---- mentors
def get_mentor(db: Session, mentor_id: int) -> MentorProfile | None:
    return db.get(MentorProfile, mentor_id)


def get_mentor_by_user(db: Session, user_id: int) -> MentorProfile | None:
    return db.scalar(select(MentorProfile).where(MentorProfile.user_id == user_id))


def list_mentors(db: Session, *, q: str | None, statuses: list[str], page: int, limit: int):
    stmt = select(MentorProfile).where(MentorProfile.status.in_(statuses))
    for w in (q or "").lower().split():
        stmt = stmt.where(func.lower(MentorProfile.search_text).like(f"%{escape_like(w)}%", escape="\\"))
    return paginate(db, stmt.order_by(MentorProfile.is_sample.asc(), MentorProfile.created_at.desc(), MentorProfile.id), page, limit)


def requested_mentor_ids(db: Session, user_id: int) -> set[int]:
    return set(db.scalars(select(Inquiry.target_id).where(Inquiry.sender_id == user_id, Inquiry.target_type == "mentor")).all())
