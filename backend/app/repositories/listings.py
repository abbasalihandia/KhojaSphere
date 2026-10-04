from __future__ import annotations

from sqlalchemy import and_, func, or_, select
from sqlalchemy.orm import Session

from app.models import Business, BusinessService, MarketplaceItem, Property
from app.repositories.common import keyword_clause, paginate
from app.utils.text import escape_like

ENTITY_MODEL = {"business": Business, "property": Property, "marketplace": MarketplaceItem}
OWNER_ATTR = {"business": "owner_id", "property": "owner_id", "marketplace": "seller_id"}
VISIBLE_STATUS = {"business": "approved", "property": "active", "marketplace": "active"}


def title_of(entity_type: str, obj) -> str:
    return obj.name if entity_type == "business" else obj.title


def owner_of(entity_type: str, obj) -> int | None:
    return getattr(obj, OWNER_ATTR[entity_type])


def get_entity(db: Session, entity_type: str, entity_id: int):
    return db.get(ENTITY_MODEL[entity_type], entity_id)


def visible_clause(entity_type: str):
    model = ENTITY_MODEL[entity_type]
    return model.status == VISIBLE_STATUS[entity_type]


def _ilike(col, value: str):
    return func.lower(col).like(f"%{escape_like(value.lower())}%", escape="\\")


# --------------------------------------------------------------------- businesses
def _business_conditions(*, q=None, category=None, city=None, locality=None, kind=None, price_min=None,
                         price_max=None, statuses=None, owner_id=None, require_all=True):
    conds = []
    if statuses is not None:
        conds.append(Business.status.in_(statuses))
    if owner_id is not None:
        conds.append(Business.owner_id == owner_id)
    if category:
        conds.append(func.lower(Business.category) == category.lower())
    if city:
        conds.append(func.lower(Business.city) == city.lower())
    if locality:
        conds.append(_ilike(Business.locality, locality))
    if kind:
        conds.append(Business.kind == kind)
    # budget: ranges that overlap the requested band (businesses without a price are excluded when filtering)
    if price_min is not None:
        conds.append(or_(Business.price_max >= price_min, and_(Business.price_max.is_(None), Business.price_min >= price_min)))
    if price_max is not None:
        conds.append(Business.price_min <= price_max)
    kw = keyword_clause(Business.search_text, q, require_all=require_all)
    if kw is not None:
        conds.append(kw)
    return conds


def _business_order(sort: str | None):
    if sort == "name":
        return [func.lower(Business.name), Business.id]
    if sort == "price_asc":
        return [Business.price_min.is_(None), Business.price_min.asc(), Business.id]
    if sort == "price_desc":
        return [Business.price_max.is_(None), Business.price_max.desc(), Business.id]
    return [Business.created_at.desc(), Business.id.desc()]


def list_businesses(db: Session, *, page=1, limit=12, sort=None, **filters):
    stmt = select(Business).where(*_business_conditions(**filters)).order_by(*_business_order(sort))
    return paginate(db, stmt, page, limit)


def candidate_businesses(db: Session, cap=400, **filters) -> list[Business]:
    stmt = select(Business).where(*_business_conditions(**filters, require_all=False)).order_by(Business.created_at.desc()).limit(cap)
    return list(db.scalars(stmt).all())


def count_businesses_by_category(db: Session) -> dict[str, int]:
    rows = db.execute(select(Business.category, func.count()).where(Business.status == "approved").group_by(Business.category)).all()
    return {c: n for c, n in rows}


def replace_services(b: Business, services: list[tuple[str, str | None]]) -> None:
    b.services.clear()
    for i, (name, price) in enumerate(services):
        b.services.append(BusinessService(name=name, price_label=price, position=i))


# --------------------------------------------------------------------- properties
def _property_conditions(*, q=None, listing_type=None, property_type=None, city=None, locality=None, bedrooms=None,
                         furnishing=None, price_min=None, price_max=None, statuses=None, owner_id=None, require_all=True):
    conds = []
    if statuses is not None:
        conds.append(Property.status.in_(statuses))
    if owner_id is not None:
        conds.append(Property.owner_id == owner_id)
    if listing_type:
        conds.append(Property.listing_type == listing_type)
    if property_type:
        conds.append(func.lower(Property.property_type) == property_type.lower())
    if city:
        conds.append(func.lower(Property.city) == city.lower())
    if locality:
        conds.append(_ilike(Property.locality, locality))
    if bedrooms is not None:
        conds.append(Property.bedrooms >= 4 if bedrooms >= 4 else Property.bedrooms == bedrooms)
    if furnishing:
        conds.append(func.lower(Property.furnishing) == furnishing.lower())
    if price_min is not None:
        conds.append(Property.price >= price_min)
    if price_max is not None:
        conds.append(Property.price <= price_max)
    kw = keyword_clause(Property.search_text, q, require_all=require_all)
    if kw is not None:
        conds.append(kw)
    return conds


def _property_order(sort: str | None):
    if sort == "price_asc":
        return [Property.price.asc(), Property.id]
    if sort == "price_desc":
        return [Property.price.desc(), Property.id]
    return [Property.created_at.desc(), Property.id.desc()]


def list_properties(db: Session, *, page=1, limit=12, sort=None, **filters):
    stmt = select(Property).where(*_property_conditions(**filters)).order_by(*_property_order(sort))
    return paginate(db, stmt, page, limit)


def candidate_properties(db: Session, cap=400, **filters) -> list[Property]:
    stmt = select(Property).where(*_property_conditions(**filters, require_all=False)).order_by(Property.created_at.desc()).limit(cap)
    return list(db.scalars(stmt).all())


# --------------------------------------------------------------------- marketplace
def _market_conditions(*, q=None, category=None, city=None, locality=None, condition=None, price_min=None,
                       price_max=None, statuses=None, owner_id=None, require_all=True):
    conds = []
    if statuses is not None:
        conds.append(MarketplaceItem.status.in_(statuses))
    if owner_id is not None:
        conds.append(MarketplaceItem.seller_id == owner_id)
    if category and category.lower() != "all":
        conds.append(func.lower(MarketplaceItem.category) == category.lower())
    if city:
        conds.append(func.lower(MarketplaceItem.city) == city.lower())
    if locality:
        conds.append(_ilike(MarketplaceItem.locality, locality))
    if condition:
        conds.append(func.lower(MarketplaceItem.condition) == condition.lower())
    if price_min is not None:
        conds.append(MarketplaceItem.price >= price_min)
    if price_max is not None:
        conds.append(MarketplaceItem.price <= price_max)
    kw = keyword_clause(MarketplaceItem.search_text, q, require_all=require_all)
    if kw is not None:
        conds.append(kw)
    return conds


def _market_order(sort: str | None):
    if sort == "price_asc":
        return [MarketplaceItem.price.asc(), MarketplaceItem.id]
    if sort == "price_desc":
        return [MarketplaceItem.price.desc(), MarketplaceItem.id]
    return [MarketplaceItem.created_at.desc(), MarketplaceItem.id.desc()]


def list_market(db: Session, *, page=1, limit=12, sort=None, **filters):
    stmt = select(MarketplaceItem).where(*_market_conditions(**filters)).order_by(*_market_order(sort))
    return paginate(db, stmt, page, limit)


def candidate_market(db: Session, cap=400, **filters) -> list[MarketplaceItem]:
    stmt = select(MarketplaceItem).where(*_market_conditions(**filters, require_all=False)).order_by(MarketplaceItem.created_at.desc()).limit(cap)
    return list(db.scalars(stmt).all())
