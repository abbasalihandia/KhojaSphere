from __future__ import annotations

from sqlalchemy import func, select
from sqlalchemy.orm import Session

from app.models import Business, Inquiry, MarketplaceItem, Property, User
from app.repositories import social as srepo
from app.utils.formatting import time_ago


def summary(db: Session, user: User) -> dict:
    def n(model, *where):
        return db.scalar(select(func.count()).select_from(model).where(*where)) or 0
    active = (n(Business, Business.owner_id == user.id, Business.status == "approved")
              + n(Property, Property.owner_id == user.id, Property.status == "active")
              + n(MarketplaceItem, MarketplaceItem.seller_id == user.id, MarketplaceItem.status == "active"))
    pending = n(Business, Business.owner_id == user.id, Business.status == "pending")
    drafts = n(Business, Business.owner_id == user.id, Business.status == "draft")
    views = db.scalar(select(func.coalesce(func.sum(Business.view_count), 0)).where(Business.owner_id == user.id)) or 0
    activity = []
    for i in srepo.recent_received(db, user.id, 5):
        activity.append({"kind": "inquiry", "text": f"{i.sender_name} sent an inquiry about {i.target_title}", "time": time_ago(i.created_at), "at": i.created_at})
    for b in db.scalars(select(Business).where(Business.owner_id == user.id, Business.view_count > 0)
                        .order_by(Business.updated_at.desc()).limit(3)).all():
        activity.append({"kind": "views", "text": f"Your listing \"{b.name}\" was viewed {b.view_count} time{'s' if b.view_count != 1 else ''}",
                         "time": time_ago(b.updated_at), "at": b.updated_at})
    for b in db.scalars(select(Business).where(Business.owner_id == user.id, Business.status == "draft")
                        .order_by(Business.updated_at.desc()).limit(2)).all():
        activity.append({"kind": "draft", "text": f"Draft listing \"{b.name}\" was saved", "time": time_ago(b.updated_at), "at": b.updated_at})
    activity.sort(key=lambda a: a["at"], reverse=True)
    for a in activity:
        a.pop("at")
    return {
        "activeListings": active, "pendingReview": pending, "savedItems": srepo.count_favorites(db, user.id),
        "newInquiries": srepo.unread_count(db, user.id), "drafts": drafts, "totalViews": int(views),
        "activity": activity[:8],
    }


def public_stats(db: Session) -> dict:
    def n(model, *where):
        return db.scalar(select(func.count()).select_from(model).where(*where)) or 0
    cities = db.scalar(select(func.count(func.distinct(Business.city))).where(Business.status == "approved")) or 0
    return {
        "businesses": n(Business, Business.status == "approved"), "properties": n(Property, Property.status == "active"),
        "marketplaceItems": n(MarketplaceItem, MarketplaceItem.status == "active"), "cities": int(cities),
    }
