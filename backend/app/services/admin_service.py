from __future__ import annotations

from sqlalchemy import func, select
from sqlalchemy.orm import Session

from app.core.errors import AppError, BadRequest, Conflict, Forbidden, NotFound
from app.models import Business, Category, MarketplaceItem, MentorProfile, Property, User
from app.repositories import accounts as accounts_repo
from app.repositories import listings as lrepo
from app.repositories import social as srepo
from app.repositories.common import paginate
from app.services import listing_service, taxonomy
from app.utils.text import clean, escape_like

BUSINESS_MODERATION = {"approve": ("status", "approved"), "reject": ("status", "rejected"), "hide": ("status", "hidden"),
                       "unhide": ("status", "approved"), "verify": ("verification", "verified"),
                       "unverify": ("verification", "pending")}
STATUS_OPTIONS = {"property": {"active", "hidden", "closed"}, "marketplace": {"active", "hidden", "sold"}}


def overview(db: Session) -> dict:
    def count(model, *where):
        return db.scalar(select(func.count()).select_from(model).where(*where)) or 0
    return {
        "totalUsers": count(User),
        "totalBusinesses": count(Business, Business.status == "approved"),
        "pendingBusinesses": count(Business, Business.status == "pending"),
        "propertyListings": count(Property, Property.status == "active"),
        "marketplaceItems": count(MarketplaceItem, MarketplaceItem.status == "active"),
        "openReports": srepo.open_reports_count(db),
        "pendingMentors": count(MentorProfile, MentorProfile.status == "pending"),
    }


def update_user(db: Session, admin: User, user_id: int, *, is_active: bool | None, role: str | None) -> User:
    u = accounts_repo.get_user(db, user_id)
    if not u:
        raise NotFound("User not found.")
    if u.id == admin.id and (is_active is False or (role and role != "admin")):
        raise BadRequest("You cannot suspend or demote your own admin account.", code="self_lockout")
    if is_active is not None:
        u.is_active = is_active
    if role:
        u.role = role
    db.commit()
    return u


def list_listings(db: Session, kind: str, *, status: str | None, q: str | None, page: int, limit: int):
    model = {"business": Business, "property": Property, "marketplace": MarketplaceItem}[kind]
    stmt = select(model)
    if status:
        stmt = stmt.where(model.status == status)
    if q:
        col = model.name if kind == "business" else model.title
        stmt = stmt.where(func.lower(col).like(f"%{escape_like(q.lower())}%", escape="\\"))
    return paginate(db, stmt.order_by(model.created_at.desc(), model.id.desc()), page, limit)


def moderate_business(db: Session, business_id: int, action: str) -> Business:
    b = db.get(Business, business_id)
    if not b:
        raise NotFound("Business not found.")
    field, value = BUSINESS_MODERATION[action]
    if action == "unhide" and b.status != "hidden":
        raise Conflict("Only hidden listings can be unhidden.", code="invalid_state")
    if action in ("approve", "reject") and b.status not in ("pending", "rejected", "approved", "hidden"):
        raise Conflict("Only submitted listings can be approved or rejected.", code="invalid_state")
    setattr(b, field, value)
    db.commit()
    return b


def set_listing_status(db: Session, kind: str, listing_id: int, status: str):
    if status not in STATUS_OPTIONS[kind]:
        raise AppError(f"Status must be one of {sorted(STATUS_OPTIONS[kind])}.", code="validation_error", status_code=422)
    obj = lrepo.get_entity(db, kind, listing_id)
    if not obj:
        raise NotFound("Listing not found.")
    obj.status = status
    db.commit()
    return obj


def delete_listing(db: Session, kind: str, listing_id: int) -> None:
    obj = lrepo.get_entity(db, kind, listing_id)
    if not obj:
        raise NotFound("Listing not found.")
    listing_service.purge_dependents(db, kind, obj.id)
    db.delete(obj)
    db.commit()


def update_report(db: Session, report_id: int, *, status: str | None, hide_listing: bool) -> object:
    r = srepo.get_report(db, report_id)
    if not r:
        raise NotFound("Report not found.")
    if hide_listing:
        obj = lrepo.get_entity(db, r.entity_type, r.entity_id)
        if obj is not None:
            obj.status = "hidden"
        r.status = "resolved"
    elif status:
        r.status = status
    db.commit()
    return r


def moderate_mentor(db: Session, mentor_id: int, action: str) -> MentorProfile:
    m = srepo.get_mentor(db, mentor_id)
    if not m:
        raise NotFound("Mentor not found.")
    m.status = {"approve": "approved", "reject": "rejected", "hide": "hidden"}[action]
    db.commit()
    return m


# categories
def create_category(db: Session, kind: str, name: str, icon: str | None) -> Category:
    name = clean(name)
    if srepo.find_category(db, kind, name):
        raise Conflict("That category already exists.", code="category_exists")
    nxt = (db.scalar(select(func.max(Category.sort_order)).where(Category.kind == kind)) or 0) + 1
    c = Category(kind=kind, name=name, icon=icon, sort_order=nxt, is_active=True)
    db.add(c)
    db.commit()
    taxonomy.invalidate()
    return c


def update_category(db: Session, cat_id: int, *, name: str | None, icon: str | None, is_active: bool | None) -> Category:
    c = srepo.get_category(db, cat_id)
    if not c:
        raise NotFound("Category not found.")
    if name and clean(name).lower() != c.name.lower():
        if srepo.find_category(db, c.kind, clean(name)):
            raise Conflict("That category already exists.", code="category_exists")
        old, c.name = c.name, clean(name)
        model, col = (Business, "category") if c.kind == "business" else (MarketplaceItem, "category")
        for row in db.scalars(select(model).where(model.category == old)).all():  # keep listings attached
            row.category = c.name
    elif name:
        c.name = clean(name)
    if icon is not None:
        c.icon = icon
    if is_active is not None:
        c.is_active = is_active
    db.commit()
    taxonomy.invalidate()
    return c


def delete_category(db: Session, cat_id: int) -> None:
    c = srepo.get_category(db, cat_id)
    if not c:
        raise NotFound("Category not found.")
    model = Business if c.kind == "business" else MarketplaceItem
    used = db.scalar(select(func.count()).select_from(model).where(model.category == c.name)) or 0
    if used:
        raise Conflict(f"{used} listing(s) use this category. Deactivate it instead of deleting.", code="category_in_use")
    db.delete(c)
    db.commit()
    taxonomy.invalidate()
