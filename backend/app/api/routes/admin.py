from __future__ import annotations

from typing import Literal

from fastapi import APIRouter, Depends, Query
from sqlalchemy.orm import Session

from app.api.deps import admin_user
from app.database.session import get_db
from app.models import User
from app.repositories import accounts as accounts_repo
from app.repositories import social as srepo
from app.schemas.auth import UserOut
from app.schemas.common import CamelModel, Message, Page, build_page
from app.schemas.listings import BusinessOut, CategoryOut, MarketplaceOut, PropertyOut
from app.schemas.social import MentorOut, ReportOut
from app.services import admin_service as svc
from app.services import embedding_service, presenters
from app.services import social_service

router = APIRouter(prefix="/admin", tags=["Admin"], dependencies=[Depends(admin_user)])


class AdminUser(UserOut):
    is_active: bool


class UserPatch(CamelModel):
    is_active: bool | None = None
    role: Literal["user", "admin"] | None = None


class ModerateIn(CamelModel):
    action: Literal["approve", "reject", "hide", "unhide", "verify", "unverify"]


class StatusIn(CamelModel):
    status: str


class ReportPatch(CamelModel):
    status: Literal["pending", "under_review", "resolved"] | None = None
    hide_listing: bool = False


class MentorModerate(CamelModel):
    action: Literal["approve", "reject", "hide"]


class CategoryIn(CamelModel):
    kind: Literal["business", "marketplace"]
    name: str
    icon: str | None = None


class CategoryPatch(CamelModel):
    name: str | None = None
    icon: str | None = None
    is_active: bool | None = None


def _admin_user(u: User) -> AdminUser:
    return AdminUser(**presenters.user_out(u).model_dump(), is_active=u.is_active)


@router.get("/overview")
def overview(db: Session = Depends(get_db)):
    return svc.overview(db)


@router.get("/users", response_model=Page[AdminUser])
def users(q: str | None = Query(None, max_length=100), role: Literal["user", "admin"] | None = None,
          page: int = Query(1, ge=1), limit: int = Query(20, ge=1, le=100), db: Session = Depends(get_db)):
    rows, total = accounts_repo.list_users(db, q=q, role=role, page=page, limit=limit)
    return build_page([_admin_user(u) for u in rows], total, page, limit)


@router.patch("/users/{user_id}", response_model=AdminUser)
def patch_user(user_id: int, data: UserPatch, admin: User = Depends(admin_user), db: Session = Depends(get_db)):
    return _admin_user(svc.update_user(db, admin, user_id, is_active=data.is_active, role=data.role))


@router.get("/businesses", response_model=Page[BusinessOut])
def businesses(status: Literal["draft", "pending", "approved", "rejected", "hidden"] | None = None, q: str | None = None,
               page: int = Query(1, ge=1), limit: int = Query(20, ge=1, le=100), admin: User = Depends(admin_user),
               db: Session = Depends(get_db)):
    rows, total = svc.list_listings(db, "business", status=status, q=q, page=page, limit=limit)
    return build_page([presenters.business_out(b, admin) for b in rows], total, page, limit)


@router.post("/businesses/{business_id}/moderate", response_model=BusinessOut)
def moderate_business(business_id: int, data: ModerateIn, admin: User = Depends(admin_user), db: Session = Depends(get_db)):
    return presenters.business_out(svc.moderate_business(db, business_id, data.action), admin)


@router.get("/properties", response_model=Page[PropertyOut])
def properties(status: Literal["active", "hidden", "closed"] | None = None, q: str | None = None, page: int = Query(1, ge=1),
               limit: int = Query(20, ge=1, le=100), admin: User = Depends(admin_user), db: Session = Depends(get_db)):
    rows, total = svc.list_listings(db, "property", status=status, q=q, page=page, limit=limit)
    return build_page([presenters.property_out(p, admin) for p in rows], total, page, limit)


@router.get("/marketplace", response_model=Page[MarketplaceOut])
def marketplace(status: Literal["active", "hidden", "sold"] | None = None, q: str | None = None, page: int = Query(1, ge=1),
                limit: int = Query(20, ge=1, le=100), admin: User = Depends(admin_user), db: Session = Depends(get_db)):
    rows, total = svc.list_listings(db, "marketplace", status=status, q=q, page=page, limit=limit)
    return build_page([presenters.market_out(m, admin) for m in rows], total, page, limit)


@router.post("/listings/{kind}/{listing_id}/status", response_model=Message)
def set_status(kind: Literal["property", "marketplace"], listing_id: int, data: StatusIn, db: Session = Depends(get_db)):
    svc.set_listing_status(db, kind, listing_id, data.status)
    return Message(message="Status updated.")


@router.delete("/listings/{kind}/{listing_id}", response_model=Message)
def delete_listing(kind: Literal["business", "property", "marketplace"], listing_id: int, db: Session = Depends(get_db)):
    svc.delete_listing(db, kind, listing_id)
    return Message(message="Listing deleted.")


@router.get("/reports", response_model=Page[ReportOut])
def reports(status: Literal["pending", "under_review", "resolved"] | None = None, page: int = Query(1, ge=1),
            limit: int = Query(50, ge=1, le=100), db: Session = Depends(get_db)):
    rows, total = srepo.list_reports(db, status=status, page=page, limit=limit)
    return build_page([social_service.report_out(r) for r in rows], total, page, limit)


@router.patch("/reports/{report_id}", response_model=ReportOut)
def patch_report(report_id: int, data: ReportPatch, db: Session = Depends(get_db)):
    return social_service.report_out(svc.update_report(db, report_id, status=data.status, hide_listing=data.hide_listing))


@router.get("/mentors", response_model=Page[MentorOut])
def admin_mentors(status: Literal["pending", "approved", "rejected", "hidden"] | None = None, page: int = Query(1, ge=1),
                  limit: int = Query(50, ge=1, le=100), db: Session = Depends(get_db)):
    statuses = [status] if status else ["pending", "approved", "rejected", "hidden"]
    rows, total = srepo.list_mentors(db, q=None, statuses=statuses, page=page, limit=limit)
    return build_page([presenters.mentor_out(m) for m in rows], total, page, limit)


@router.post("/mentors/{mentor_id}/moderate", response_model=MentorOut)
def moderate_mentor(mentor_id: int, data: MentorModerate, db: Session = Depends(get_db)):
    return presenters.mentor_out(svc.moderate_mentor(db, mentor_id, data.action))


@router.get("/categories", response_model=list[CategoryOut])
def admin_categories(db: Session = Depends(get_db)):
    from sqlalchemy import func, select
    from app.models import Business, MarketplaceItem
    bc = dict(db.execute(select(Business.category, func.count()).group_by(Business.category)).all())
    mc = dict(db.execute(select(MarketplaceItem.category, func.count()).group_by(MarketplaceItem.category)).all())
    return [CategoryOut(id=c.id, kind=c.kind, name=c.name, icon=c.icon, count=(bc if c.kind == "business" else mc).get(c.name, 0),
                        is_active=c.is_active, sort_order=c.sort_order) for c in srepo.list_categories(db, None, True)]


@router.post("/categories", response_model=CategoryOut, status_code=201)
def create_category(data: CategoryIn, db: Session = Depends(get_db)):
    c = svc.create_category(db, data.kind, data.name, data.icon)
    return CategoryOut(id=c.id, kind=c.kind, name=c.name, icon=c.icon, is_active=c.is_active, sort_order=c.sort_order)


@router.patch("/categories/{category_id}", response_model=CategoryOut)
def patch_category(category_id: int, data: CategoryPatch, db: Session = Depends(get_db)):
    c = svc.update_category(db, category_id, name=data.name, icon=data.icon, is_active=data.is_active)
    return CategoryOut(id=c.id, kind=c.kind, name=c.name, icon=c.icon, is_active=c.is_active, sort_order=c.sort_order)


@router.delete("/categories/{category_id}", response_model=Message)
def delete_category(category_id: int, db: Session = Depends(get_db)):
    svc.delete_category(db, category_id)
    return Message(message="Category deleted.")


@router.post("/reindex")
def reindex(db: Session = Depends(get_db)):
    """Build/refresh semantic-search vectors (no-op when no embedding model is available)."""
    return embedding_service.reindex_all(db)
