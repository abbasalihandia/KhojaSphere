"""Turn ORM rows into the response shapes the frontend components already expect."""
from __future__ import annotations

from app.models import Business, MarketplaceItem, MentorProfile, Property, User
from app.schemas.auth import UserOut
from app.schemas.listings import BusinessOut, MarketplaceOut, PropertyOut, SearchItem, ServiceOut
from app.schemas.social import MentorOut
from app.storage import public_url
from app.utils.formatting import format_area, format_price, format_range, time_ago

VERIFICATION_LABEL = {
    "sample": "Sample listing", "pending": "Verification pending", "verified": "Verified", "claimed": "Profile claimed",
}
LISTING_TYPE_LABEL = {"rent": "For Rent", "sale": "For Sale", "shared": "Shared Accommodation", "commercial": "Commercial"}


def _loc(locality: str | None, city: str | None) -> str:
    return ", ".join(x for x in (locality, city) if x)


def _imgs(images: list | None) -> list[str]:
    return [u for u in (public_url(i) for i in (images or [])) if u]


def user_out(u: User) -> UserOut:
    return UserOut(id=u.id, name=u.name, email=u.email, phone=u.phone, avatar_url=public_url(u.avatar_url), city=u.city,
                   bio=u.bio, account_type=u.account_type, role=u.role, created_at=u.created_at)


def business_out(b: Business, viewer: User | None = None) -> BusinessOut:
    imgs = _imgs(b.images)
    is_owner = bool(viewer and b.owner_id and viewer.id == b.owner_id)
    privileged = is_owner or bool(viewer and viewer.role == "admin")
    label = b.price_label or format_range(b.price_min, b.price_max)
    return BusinessOut(
        id=b.id, kind=b.kind, name=b.name, category=b.category, short_desc=b.short_desc or "", description=b.description or "",
        location=_loc(b.locality, b.city), city=b.city, locality=b.locality, address=b.address,
        image=imgs[0] if imgs else None, images=imgs, cover_image=public_url(b.cover_image) or (imgs[0] if imgs else None),
        tags=list(b.tags or []), status=VERIFICATION_LABEL.get(b.verification, b.verification), verification=b.verification,
        listing_status=b.status, price_range=label, price_min=b.price_min, price_max=b.price_max,
        phone=b.phone, email=b.email, website=b.website, instagram=b.instagram, hours=b.hours,
        services=[ServiceOut(name=s.name, price=s.price_label) for s in b.services],
        owner_id=b.owner_id if privileged else None, is_owner=is_owner, is_sample=b.is_sample,
        view_count=b.view_count if privileged else None, created_at=b.created_at, updated_at=b.updated_at,
    )


def property_out(p: Property, viewer: User | None = None) -> PropertyOut:
    imgs = _imgs(p.images)
    is_owner = bool(viewer and p.owner_id and viewer.id == p.owner_id)
    return PropertyOut(
        id=p.id, title=p.title, description=p.description or "", type=p.listing_type, property_type=p.property_type,
        price=format_price(p.price, p.price_period), price_value=p.price, price_period=p.price_period,
        location=_loc(p.locality, p.city), city=p.city, locality=p.locality, address=p.address, bedrooms=p.bedrooms,
        bathrooms=p.bathrooms, area=format_area(p.area_sqft), area_sqft=p.area_sqft, furnishing=p.furnishing,
        amenities=list(p.amenities or []), image=imgs[0] if imgs else None, images=imgs, owner=p.poster_type,
        owner_id=p.owner_id if (is_owner or (viewer and viewer.role == "admin")) else None, is_owner=is_owner,
        available=p.availability, label="Sample listing" if p.is_sample else "", status=p.status, is_sample=p.is_sample,
        posted=time_ago(p.created_at), created_at=p.created_at,
    )


def market_out(m: MarketplaceItem, viewer: User | None = None) -> MarketplaceOut:
    imgs = _imgs(m.images)
    is_owner = bool(viewer and m.seller_id and viewer.id == m.seller_id)
    return MarketplaceOut(
        id=m.id, title=m.title, description=m.description or "", price=format_price(m.price), price_value=m.price,
        condition=m.condition, location=_loc(m.locality, m.city), city=m.city, locality=m.locality, negotiable=m.negotiable,
        category=m.category, image=imgs[0] if imgs else None, images=imgs, posted=time_ago(m.created_at),
        label="Sample listing" if m.is_sample else "", status=m.status,
        seller_id=m.seller_id if (is_owner or (viewer and viewer.role == "admin")) else None, is_owner=is_owner,
        is_sample=m.is_sample, created_at=m.created_at,
    )


def mentor_out(m: MentorProfile, viewer: User | None = None, requested: bool = False) -> MentorOut:
    return MentorOut(
        id=m.id, name=m.name, role=m.headline, expertise=list(m.expertise or []), education=m.education, format=m.format,
        availability=m.availability, image=public_url(m.image_url), bio=m.bio, status=m.status, is_sample=m.is_sample,
        requested=requested, is_owner=bool(viewer and m.user_id and m.user_id == viewer.id),
    )


# ---- unified search items ----
def business_item(b: Business, score: float = 0.0) -> SearchItem:
    imgs = _imgs(b.images)
    return SearchItem(
        type=b.kind, id=b.id, name=b.name, category=b.category, short_desc=b.short_desc or "",
        location=_loc(b.locality, b.city), image=imgs[0] if imgs else None, tags=list(b.tags or []),
        status=VERIFICATION_LABEL.get(b.verification, b.verification),
        price_range=b.price_label or format_range(b.price_min, b.price_max), is_sample=b.is_sample, score=round(score, 3))


def property_item(p: Property, score: float = 0.0) -> SearchItem:
    imgs = _imgs(p.images)
    bits = [f"{p.bedrooms} BHK" if p.bedrooms else None, format_area(p.area_sqft) or None, p.furnishing]
    return SearchItem(
        type="property", id=p.id, name=p.title, category=f"{p.property_type} · {LISTING_TYPE_LABEL.get(p.listing_type, '')}",
        short_desc=" · ".join(b for b in bits if b), location=_loc(p.locality, p.city), image=imgs[0] if imgs else None,
        tags=list(p.amenities or [])[:6], status="Sample listing" if p.is_sample else p.poster_type,
        price_range=format_price(p.price, p.price_period), is_sample=p.is_sample, score=round(score, 3))


def market_item(m: MarketplaceItem, score: float = 0.0) -> SearchItem:
    imgs = _imgs(m.images)
    return SearchItem(
        type="marketplace", id=m.id, name=m.title, category=m.category,
        short_desc=f"{m.condition}{' · Negotiable' if m.negotiable else ''}", location=_loc(m.locality, m.city),
        image=imgs[0] if imgs else None, tags=[m.condition], status="Sample listing" if m.is_sample else "Marketplace",
        price_range=format_price(m.price), is_sample=m.is_sample, score=round(score, 3))
