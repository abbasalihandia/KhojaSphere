from __future__ import annotations

from typing import Literal

from fastapi import APIRouter, BackgroundTasks, Depends, Query
from sqlalchemy.orm import Session

from app.api.deps import current_user, optional_user
from app.database.session import get_db
from app.models import User
from app.repositories import listings as repo
from app.schemas.common import Message, Page, build_page
from app.schemas.listings import (BusinessCreate, BusinessOut, BusinessUpdate, MarketplaceCreate, MarketplaceOut,
                                  MarketplaceUpdate, PropertyCreate, PropertyOut, PropertyUpdate)
from app.services import embedding_service as emb
from app.services import listing_service as svc
from app.services import presenters

PageQ = Query(1, ge=1, le=10_000)
LimitQ = Query(12, ge=1, le=50)

# ============================================================== businesses
businesses = APIRouter(prefix="/businesses", tags=["Businesses"])


@businesses.get("", response_model=Page[BusinessOut])
def list_businesses(q: str | None = Query(None, max_length=200), category: str | None = None, city: str | None = None,
                    locality: str | None = None, kind: Literal["business", "professional"] | None = None,
                    price_min: int | None = Query(None, ge=0), price_max: int | None = Query(None, ge=0),
                    sort: Literal["newest", "name", "price_asc", "price_desc"] = "newest", page: int = PageQ,
                    limit: int = LimitQ, db: Session = Depends(get_db), viewer: User | None = Depends(optional_user)):
    """Public directory: only approved listings."""
    rows, total = repo.list_businesses(db, q=q, category=category, city=city, locality=locality, kind=kind, price_min=price_min,
                                       price_max=price_max, statuses=["approved"], sort=sort, page=page, limit=limit)
    return build_page([presenters.business_out(b, viewer) for b in rows], total, page, limit)


@businesses.get("/mine", response_model=list[BusinessOut])
def my_businesses(user: User = Depends(current_user), db: Session = Depends(get_db)):
    return [presenters.business_out(b, user) for b in svc.mine(db, user)["businesses"]]


@businesses.get("/{business_id}", response_model=BusinessOut)
def get_business(business_id: int, db: Session = Depends(get_db), viewer: User | None = Depends(optional_user)):
    """Also counts a view for non-owners."""
    return presenters.business_out(svc.get_business(db, business_id, viewer, count_view=True), viewer)


@businesses.post("", response_model=BusinessOut, status_code=201)
def create_business(data: BusinessCreate, bg: BackgroundTasks, user: User = Depends(current_user), db: Session = Depends(get_db)):
    """`submit=false` saves a draft; `submit=true` sends it for moderator review."""
    b = svc.create_business(db, user, data)
    bg.add_task(emb.index_entity_task, "business", b.id)
    return presenters.business_out(b, user)


@businesses.put("/{business_id}", response_model=BusinessOut)
def update_business(business_id: int, data: BusinessUpdate, bg: BackgroundTasks, user: User = Depends(current_user),
                    db: Session = Depends(get_db)):
    b = svc.update_business(db, user, business_id, data)
    bg.add_task(emb.index_entity_task, "business", b.id)
    return presenters.business_out(b, user)


@businesses.post("/{business_id}/submit", response_model=BusinessOut)
def submit_business(business_id: int, user: User = Depends(current_user), db: Session = Depends(get_db)):
    return presenters.business_out(svc.submit_business(db, user, business_id), user)


@businesses.delete("/{business_id}", response_model=Message)
def delete_business(business_id: int, user: User = Depends(current_user), db: Session = Depends(get_db)):
    svc.delete_business(db, user, business_id)
    return Message(message="Listing deleted.")


# ============================================================== properties
properties = APIRouter(prefix="/properties", tags=["Properties"])


@properties.get("", response_model=Page[PropertyOut])
def list_properties(q: str | None = Query(None, max_length=200), type: Literal["rent", "sale", "shared", "commercial"] | None = None,
                    property_type: str | None = None, city: str | None = None, locality: str | None = None,
                    bedrooms: int | None = Query(None, ge=0, le=20), furnishing: str | None = None,
                    price_min: int | None = Query(None, ge=0), price_max: int | None = Query(None, ge=0),
                    sort: Literal["newest", "price_asc", "price_desc"] = "newest", page: int = PageQ, limit: int = LimitQ,
                    db: Session = Depends(get_db), viewer: User | None = Depends(optional_user)):
    rows, total = repo.list_properties(db, q=q, listing_type=type, property_type=property_type, city=city, locality=locality,
                                       bedrooms=bedrooms, furnishing=furnishing, price_min=price_min, price_max=price_max,
                                       statuses=["active"], sort=sort, page=page, limit=limit)
    return build_page([presenters.property_out(p, viewer) for p in rows], total, page, limit)


@properties.get("/mine", response_model=list[PropertyOut])
def my_properties(user: User = Depends(current_user), db: Session = Depends(get_db)):
    return [presenters.property_out(p, user) for p in svc.mine(db, user)["properties"]]


@properties.get("/{property_id}", response_model=PropertyOut)
def get_property(property_id: int, db: Session = Depends(get_db), viewer: User | None = Depends(optional_user)):
    return presenters.property_out(svc.get_property(db, property_id, viewer), viewer)


@properties.post("", response_model=PropertyOut, status_code=201)
def create_property(data: PropertyCreate, bg: BackgroundTasks, user: User = Depends(current_user), db: Session = Depends(get_db)):
    p = svc.create_property(db, user, data)
    bg.add_task(emb.index_entity_task, "property", p.id)
    return presenters.property_out(p, user)


@properties.put("/{property_id}", response_model=PropertyOut)
def update_property(property_id: int, data: PropertyUpdate, bg: BackgroundTasks, user: User = Depends(current_user),
                    db: Session = Depends(get_db)):
    p = svc.update_property(db, user, property_id, data)
    bg.add_task(emb.index_entity_task, "property", p.id)
    return presenters.property_out(p, user)


@properties.delete("/{property_id}", response_model=Message)
def delete_property(property_id: int, user: User = Depends(current_user), db: Session = Depends(get_db)):
    svc.delete_property(db, user, property_id)
    return Message(message="Listing deleted.")


# ============================================================== marketplace
marketplace = APIRouter(prefix="/marketplace", tags=["Marketplace"])


@marketplace.get("", response_model=Page[MarketplaceOut])
def list_marketplace(q: str | None = Query(None, max_length=200), category: str | None = None, city: str | None = None,
                     locality: str | None = None, condition: str | None = None, price_min: int | None = Query(None, ge=0),
                     price_max: int | None = Query(None, ge=0),
                     sort: Literal["newest", "price_asc", "price_desc"] = "newest", page: int = PageQ, limit: int = LimitQ,
                     db: Session = Depends(get_db), viewer: User | None = Depends(optional_user)):
    rows, total = repo.list_market(db, q=q, category=category, city=city, locality=locality, condition=condition,
                                   price_min=price_min, price_max=price_max, statuses=["active"], sort=sort, page=page, limit=limit)
    return build_page([presenters.market_out(m, viewer) for m in rows], total, page, limit)


@marketplace.get("/mine", response_model=list[MarketplaceOut])
def my_items(user: User = Depends(current_user), db: Session = Depends(get_db)):
    return [presenters.market_out(m, user) for m in svc.mine(db, user)["marketplace"]]


@marketplace.get("/{item_id}", response_model=MarketplaceOut)
def get_item(item_id: int, db: Session = Depends(get_db), viewer: User | None = Depends(optional_user)):
    return presenters.market_out(svc.get_market(db, item_id, viewer), viewer)


@marketplace.post("", response_model=MarketplaceOut, status_code=201)
def create_item(data: MarketplaceCreate, bg: BackgroundTasks, user: User = Depends(current_user), db: Session = Depends(get_db)):
    m = svc.create_market(db, user, data)
    bg.add_task(emb.index_entity_task, "marketplace", m.id)
    return presenters.market_out(m, user)


@marketplace.put("/{item_id}", response_model=MarketplaceOut)
def update_item(item_id: int, data: MarketplaceUpdate, bg: BackgroundTasks, user: User = Depends(current_user),
                db: Session = Depends(get_db)):
    m = svc.update_market(db, user, item_id, data)
    bg.add_task(emb.index_entity_task, "marketplace", m.id)
    return presenters.market_out(m, user)


@marketplace.delete("/{item_id}", response_model=Message)
def delete_item(item_id: int, user: User = Depends(current_user), db: Session = Depends(get_db)):
    svc.delete_market(db, user, item_id)
    return Message(message="Listing deleted.")
