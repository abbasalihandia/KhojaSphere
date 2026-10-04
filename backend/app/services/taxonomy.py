from __future__ import annotations

import threading
import time

from sqlalchemy import select
from sqlalchemy.orm import Session

from app.ai.lexicon import DEFAULT_CITIES, DEFAULT_LOCALITIES
from app.ai.types import Taxonomy
from app.models import Business, Category, MarketplaceItem, Property

_lock = threading.Lock()
_cache: tuple[float, Taxonomy] | None = None


def invalidate() -> None:
    global _cache
    with _lock:
        _cache = None


def load(db: Session) -> Taxonomy:
    global _cache
    now = time.monotonic()
    with _lock:
        if _cache and now - _cache[0] < 60:
            return _cache[1]
    cats = db.scalars(select(Category).where(Category.is_active.is_(True)).order_by(Category.sort_order, Category.name)).all()
    cities = list(DEFAULT_CITIES)
    localities = list(DEFAULT_LOCALITIES)
    for model in (Business, Property, MarketplaceItem):
        for c in db.scalars(select(model.city).where(model.city.is_not(None)).distinct()).all():
            if c and c not in cities:
                cities.append(c)
        for loc in db.scalars(select(model.locality).where(model.locality.is_not(None)).distinct()).all():
            first = loc.split(" ")[0] if loc and loc.split(" ")[0] in localities else loc
            if loc and loc not in localities and first not in localities:
                localities.append(loc)
    tax = Taxonomy(business_categories=[c.name for c in cats if c.kind == "business"],
                   market_categories=[c.name for c in cats if c.kind == "marketplace"], cities=cities, localities=localities)
    with _lock:
        _cache = (now, tax)
    return tax
