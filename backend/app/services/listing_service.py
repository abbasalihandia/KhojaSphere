"""Create / read / update / delete for businesses, properties and marketplace items, with ownership rules."""
from __future__ import annotations

from sqlalchemy import func, select, update
from sqlalchemy.orm import Session

from app.core.errors import AppError, Forbidden, NotFound
from app.models import Business, MarketplaceItem, Property, User
from app.repositories import listings as repo
from app.repositories import social as social_repo
from app.schemas.listings import (BusinessCreate, BusinessUpdate, MarketplaceCreate, MarketplaceUpdate,
                                  PropertyCreate, PropertyUpdate)
from app.services import taxonomy
from app.utils.formatting import format_range
from app.utils.text import build_search_text, clean, clean_multiline


def _invalid(field: str, message: str) -> AppError:
    return AppError(message, code="validation_error", status_code=422, details=[{"field": field, "message": message}])


def _is_admin(user: User | None) -> bool:
    return bool(user and user.role == "admin")


def _check_category(db: Session, kind: str, value: str) -> str:
    names = [c.name for c in social_repo.list_categories(db, kind)]
    for n in names:
        if n.lower() == value.strip().lower():
            return n
    raise _invalid("category", f"Choose a valid category ({', '.join(names)}).")


def _norm(v: str | None) -> str | None:
    v = clean(v)
    return v or None


# ======================================================================= businesses
def business_search_text(b: Business) -> str:
    return build_search_text(b.name, b.category, b.kind, b.tags, b.short_desc, b.description, b.city, b.locality,
                             [s.name for s in b.services])


def _apply_business(db: Session, b: Business, data, fields: set[str]) -> None:
    simple = ["kind", "address", "website", "instagram", "hours", "phone", "email", "price_min", "price_max", "price_label"]
    for f in simple:
        if f in fields:
            v = getattr(data, f)
            setattr(b, f, _norm(v) if isinstance(v, str) else v)
    if "name" in fields and data.name:
        b.name = clean(data.name)
    if "category" in fields and data.category:
        b.category = _check_category(db, "business", data.category)
    if "short_desc" in fields:
        b.short_desc = clean(data.short_desc)
    if "description" in fields:
        b.description = clean_multiline(data.description)
    if "city" in fields:
        b.city = _norm(data.city)
    if "locality" in fields:
        b.locality = _norm(data.locality)
    if "tags" in fields:
        b.tags = data.tags or []
    if "images" in fields:
        b.images = data.images or []
    if "cover_image" in fields:
        b.cover_image = data.cover_image
    if "services" in fields:
        repo.replace_services(b, [(clean(s.name), _norm(s.price)) for s in (data.services or [])])
    if not b.short_desc and b.description:
        b.short_desc = b.description[:160].rsplit(" ", 1)[0] if len(b.description) > 160 else b.description
    if not b.price_label and (b.price_min is not None or b.price_max is not None):
        b.price_label = None  # computed on the fly from min/max by the presenter
    if "price_min" in fields or "price_max" in fields:
        if b.price_min is not None and b.price_max is not None and b.price_min > b.price_max:
            raise _invalid("priceMin", "Minimum price cannot be greater than maximum price")
        if "price_label" not in fields:
            b.price_label = format_range(b.price_min, b.price_max) or None
    b.search_text = business_search_text(b)


def _completeness_problems(b: Business) -> list[dict]:
    problems = []
    if len((b.description or "").strip()) < 20:
        problems.append({"field": "description", "message": "Add a description of at least 20 characters before submitting."})
    if not b.city:
        problems.append({"field": "city", "message": "Add the city you operate in before submitting."})
    if not (b.phone or b.email):
        problems.append({"field": "phone", "message": "Add a phone number or email so people can reach you."})
    return problems


def create_business(db: Session, user: User, data: BusinessCreate) -> Business:
    b = Business(owner_id=user.id, kind="business", name="", category="", status="draft", verification="pending")
    _apply_business(db, b, data, set(data.model_fields_set) | {"name", "category"})
    if data.submit:
        problems = _completeness_problems(b)
        if problems:
            raise AppError(problems[0]["message"], code="validation_error", status_code=422, details=problems)
        b.status = "pending"
    db.add(b)
    db.commit()
    return b


def _load_business(db: Session, business_id: int) -> Business:
    b = db.get(Business, business_id)
    if not b:
        raise NotFound("Business not found.")
    return b


def _can_edit(user: User, owner_id: int | None) -> bool:
    return _is_admin(user) or (owner_id is not None and owner_id == user.id)


def get_business(db: Session, business_id: int, viewer: User | None, *, count_view: bool = False) -> Business:
    b = _load_business(db, business_id)
    privileged = viewer is not None and _can_edit(viewer, b.owner_id)
    if b.status != "approved" and not privileged:
        raise NotFound("Business not found.")
    if count_view and not privileged:
        db.execute(update(Business).where(Business.id == b.id).values(view_count=Business.view_count + 1))
        db.commit()
        db.refresh(b)
    return b


def update_business(db: Session, user: User, business_id: int, data: BusinessUpdate) -> Business:
    b = _load_business(db, business_id)
    if not _can_edit(user, b.owner_id):
        raise Forbidden("You can only edit your own listings.")
    _apply_business(db, b, data, set(data.model_fields_set))
    db.commit()
    return b


def submit_business(db: Session, user: User, business_id: int) -> Business:
    b = _load_business(db, business_id)
    if not _can_edit(user, b.owner_id):
        raise Forbidden("You can only submit your own listings.")
    if b.status not in ("draft", "rejected"):
        raise AppError("Only drafts or rejected listings can be submitted for review.", code="invalid_state", status_code=409)
    problems = _completeness_problems(b)
    if problems:
        raise AppError(problems[0]["message"], code="validation_error", status_code=422, details=problems)
    b.status = "pending"
    db.commit()
    return b


def delete_business(db: Session, user: User, business_id: int) -> None:
    b = _load_business(db, business_id)
    if not _can_edit(user, b.owner_id):
        raise Forbidden("You can only delete your own listings.")
    _purge_dependents(db, "business", b.id)
    db.delete(b)
    db.commit()


# ======================================================================= properties
def property_search_text(p: Property) -> str:
    return build_search_text(p.title, p.property_type, p.listing_type, p.description, p.city, p.locality, p.furnishing,
                             p.amenities, f"{p.bedrooms} bhk" if p.bedrooms else None, "rent rental" if p.listing_type == "rent" else
                             "sale buy" if p.listing_type == "sale" else p.listing_type)


def _apply_property(p: Property, data, fields: set[str], user: User) -> None:
    for f in ("listing_type", "property_type", "price", "price_period", "bedrooms", "bathrooms", "area_sqft",
              "furnishing", "poster_type", "availability", "images"):
        if f in fields:
            v = getattr(data, f)
            if v is None and f in ("listing_type", "property_type", "price", "price_period", "poster_type"):
                continue
            setattr(p, f, _norm(v) if isinstance(v, str) else (v if f != "images" else (v or [])))
    if "title" in fields and data.title:
        p.title = clean(data.title)
    if "description" in fields:
        p.description = clean_multiline(data.description)
    for f in ("city", "locality", "address"):
        if f in fields:
            setattr(p, f, _norm(getattr(data, f)))
    if "amenities" in fields:
        p.amenities = data.amenities or []
    if "price_period" not in fields and ("listing_type" in fields or not p.price_period):
        p.price_period = "total" if p.listing_type == "sale" else "month"
    if "status" in fields and data.status:
        if p.status == "hidden" and not _is_admin(user):
            raise Forbidden("This listing was hidden by a moderator.")
        p.status = data.status
    p.search_text = property_search_text(p)


def create_property(db: Session, user: User, data: PropertyCreate) -> Property:
    p = Property(owner_id=user.id, title="", listing_type=data.listing_type, price=data.price, status="active")
    _apply_property(p, data, set(data.model_fields_set) | {"title", "listing_type", "price", "property_type"}, user)
    db.add(p)
    db.commit()
    return p


def _load_property(db: Session, pid: int) -> Property:
    p = db.get(Property, pid)
    if not p:
        raise NotFound("Property not found.")
    return p


def get_property(db: Session, pid: int, viewer: User | None) -> Property:
    p = _load_property(db, pid)
    if p.status != "active" and not (viewer and _can_edit(viewer, p.owner_id)):
        raise NotFound("Property not found.")
    return p


def update_property(db: Session, user: User, pid: int, data: PropertyUpdate) -> Property:
    p = _load_property(db, pid)
    if not _can_edit(user, p.owner_id):
        raise Forbidden("You can only edit your own listings.")
    _apply_property(p, data, set(data.model_fields_set), user)
    db.commit()
    return p


def delete_property(db: Session, user: User, pid: int) -> None:
    p = _load_property(db, pid)
    if not _can_edit(user, p.owner_id):
        raise Forbidden("You can only delete your own listings.")
    _purge_dependents(db, "property", p.id)
    db.delete(p)
    db.commit()


# ======================================================================= marketplace
def market_search_text(m: MarketplaceItem) -> str:
    return build_search_text(m.title, m.category, m.description, m.condition, m.city, m.locality, "used second hand")


def _apply_market(db: Session, m: MarketplaceItem, data, fields: set[str], user: User) -> None:
    for f in ("price", "negotiable", "condition", "images"):
        if f in fields:
            v = getattr(data, f)
            if v is None and f != "images":
                continue
            setattr(m, f, v if f != "images" else (v or []))
    if "title" in fields and data.title:
        m.title = clean(data.title)
    if "description" in fields:
        m.description = clean_multiline(data.description)
    if "category" in fields and data.category:
        m.category = _check_category(db, "marketplace", data.category)
    for f in ("city", "locality"):
        if f in fields:
            setattr(m, f, _norm(getattr(data, f)))
    if "status" in fields and data.status:
        if m.status == "hidden" and not _is_admin(user):
            raise Forbidden("This listing was hidden by a moderator.")
        m.status = data.status
    m.search_text = market_search_text(m)


def create_market(db: Session, user: User, data: MarketplaceCreate) -> MarketplaceItem:
    m = MarketplaceItem(seller_id=user.id, title="", category="", price=data.price, status="active")
    _apply_market(db, m, data, set(data.model_fields_set) | {"title", "category", "price", "condition"}, user)
    db.add(m)
    db.commit()
    return m


def _load_market(db: Session, mid: int) -> MarketplaceItem:
    m = db.get(MarketplaceItem, mid)
    if not m:
        raise NotFound("Listing not found.")
    return m


def get_market(db: Session, mid: int, viewer: User | None) -> MarketplaceItem:
    m = _load_market(db, mid)
    if m.status != "active" and not (viewer and _can_edit(viewer, m.seller_id)):
        raise NotFound("Listing not found.")
    return m


def update_market(db: Session, user: User, mid: int, data: MarketplaceUpdate) -> MarketplaceItem:
    m = _load_market(db, mid)
    if not _can_edit(user, m.seller_id):
        raise Forbidden("You can only edit your own listings.")
    _apply_market(db, m, data, set(data.model_fields_set), user)
    db.commit()
    return m


def delete_market(db: Session, user: User, mid: int) -> None:
    m = _load_market(db, mid)
    if not _can_edit(user, m.seller_id):
        raise Forbidden("You can only delete your own listings.")
    _purge_dependents(db, "marketplace", m.id)
    db.delete(m)
    db.commit()


# ======================================================================= shared
def _purge_dependents(db: Session, entity_type: str, entity_id: int) -> None:
    """Favorites/embeddings/reports reference listings polymorphically, so there is no FK to cascade."""
    from sqlalchemy import delete
    from app.models import Embedding, Favorite, Report
    db.execute(delete(Favorite).where(Favorite.entity_type == entity_type, Favorite.entity_id == entity_id))
    db.execute(delete(Embedding).where(Embedding.entity_type == entity_type, Embedding.entity_id == entity_id))
    db.execute(delete(Report).where(Report.entity_type == entity_type, Report.entity_id == entity_id))


def purge_dependents(db: Session, entity_type: str, entity_id: int) -> None:
    _purge_dependents(db, entity_type, entity_id)


def mine(db: Session, user: User) -> dict[str, list]:
    biz = db.scalars(select(Business).where(Business.owner_id == user.id).order_by(Business.created_at.desc())).all()
    props = db.scalars(select(Property).where(Property.owner_id == user.id).order_by(Property.created_at.desc())).all()
    items = db.scalars(select(MarketplaceItem).where(MarketplaceItem.seller_id == user.id).order_by(MarketplaceItem.created_at.desc())).all()
    return {"businesses": list(biz), "properties": list(props), "marketplace": list(items)}


def invalidate_taxonomy() -> None:
    taxonomy.invalidate()
