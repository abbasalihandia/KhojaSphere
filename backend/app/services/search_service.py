"""Unified search across businesses, professionals, properties and marketplace listings.

Pipeline: (optional) natural-language parsing -> SQL candidate retrieval -> keyword ranking
-> (optional) semantic blending -> sort -> paginate. Every optional stage degrades silently."""
from __future__ import annotations

from dataclasses import dataclass, replace

from sqlalchemy.orm import Session

from app.ai.lexicon import STOPWORDS, SYNONYMS
from app.ai.service import AIService, get_ai_service
from app.ai.types import ParsedQuery
from app.models import User
from app.repositories import listings as repo
from app.schemas.listings import SearchItem
from app.services import embedding_service, presenters, taxonomy
from app.utils.text import tokenize

ALL_TYPES = ["business", "professional", "property", "marketplace"]
CAP = 400


@dataclass
class SearchParams:
    q: str | None = None
    category: str | None = None
    city: str | None = None
    locality: str | None = None
    type: str | None = None  # business | professional | property | marketplace
    price_min: int | None = None
    price_max: int | None = None
    sort: str = "relevant"
    page: int = 1
    limit: int = 10
    ai: bool = True
    property_listing_type: str | None = None
    bedrooms: int | None = None


@dataclass
class Hit:
    kind: str  # one of ALL_TYPES
    obj: object
    kw: float = 0.0
    sem: float = 0.0
    score: float = 0.0

    @property
    def key(self):
        return ("business" if self.kind in ("business", "professional") else self.kind, self.obj.id)


def _fields(hit: Hit) -> list[tuple[str, float]]:
    o = hit.obj
    if hit.kind in ("business", "professional"):
        return [(o.name, 5), (o.category, 3), (" ".join(o.tags or []), 3), (o.short_desc, 2),
                (o.description, 1), (f"{o.locality or ''} {o.city or ''}", 1)]
    if hit.kind == "property":
        return [(o.title, 5), (f"{o.property_type} {o.listing_type}", 3), (" ".join(o.amenities or []), 2),
                (o.description, 1), (f"{o.locality or ''} {o.city or ''} {o.furnishing or ''}", 1)]
    return [(o.title, 5), (o.category, 3), (o.condition, 1), (o.description, 1), (f"{o.locality or ''} {o.city or ''}", 1)]


def keyword_score(hit: Hit, keywords: list[str]) -> float:
    if not keywords:
        return 0.5
    fields = [(" ".join(tokenize(t or "")), w) for t, w in _fields(hit)]
    total = 0.0
    for kw in keywords:
        variants = {kw, *SYNONYMS.get(kw, ())}
        best = 0.0
        for text, w in fields:
            if any(v in text for v in variants):
                best = max(best, w)
        total += best
    return total / (5 * len(keywords))


def _scope(p: SearchParams, parsed: ParsedQuery | None, market_cats: set[str], category: str | None) -> list[str]:
    if p.type:
        return [p.type]
    if category:
        return ["marketplace"] if category.lower() in market_cats else ["business", "professional"]
    if parsed and parsed.types:
        return parsed.types
    return list(ALL_TYPES)


def _retrieve(db: Session, kinds: list[str], *, q, category, market_category, city, locality, price_min, price_max,
              listing_type, bedrooms) -> list[Hit]:
    hits: list[Hit] = []
    common = dict(city=city, locality=locality, price_min=price_min, price_max=price_max)
    kinds_biz = [k for k in kinds if k in ("business", "professional")]
    if kinds_biz:
        kind = kinds_biz[0] if len(kinds_biz) == 1 else None
        for b in repo.candidate_businesses(db, CAP, q=q, category=category, kind=kind, statuses=["approved"], **common):
            hits.append(Hit(b.kind, b))
    if "property" in kinds:
        for p in repo.candidate_properties(db, CAP, q=q, listing_type=listing_type, bedrooms=bedrooms, statuses=["active"], **common):
            hits.append(Hit("property", p))
    if "marketplace" in kinds:
        for m in repo.candidate_market(db, CAP, q=q, category=market_category, statuses=["active"], **common):
            hits.append(Hit("marketplace", m))
    return hits


def _to_item(h: Hit) -> SearchItem:
    if h.kind in ("business", "professional"):
        return presenters.business_item(h.obj, h.score)
    if h.kind == "property":
        return presenters.property_item(h.obj, h.score)
    return presenters.market_item(h.obj, h.score)


def _sort_key_price(h: Hit) -> float:
    o = h.obj
    v = getattr(o, "price", None)
    if v is None:
        v = getattr(o, "price_min", None)
    return float(v) if v is not None else float("inf")


def search(db: Session, p: SearchParams, viewer: User | None = None, ai: AIService | None = None) -> dict:
    ai = ai or get_ai_service()
    tax = taxonomy.load(db)
    market_cats = {c.lower() for c in tax.market_categories}
    q = (p.q or "").strip() or None
    parsed: ParsedQuery | None = None
    provider = "none"
    if q and p.ai:
        parsed, provider = ai.parse_query(q, tax)
    elif q:
        parsed = ParsedQuery(keywords=[t for t in tokenize(q) if t not in STOPWORDS] or tokenize(q))
    keywords = list(parsed.keywords) if parsed else []

    category = p.category or (parsed.category if parsed else None)
    city = p.city or (parsed.city if parsed else None)
    locality = p.locality or (parsed.locality if parsed else None)
    price_min = p.price_min if p.price_min is not None else (parsed.price_min if parsed else None)
    price_max = p.price_max if p.price_max is not None else (parsed.price_max if parsed else None)
    listing_type = p.property_listing_type or (parsed.listing_type if parsed else None)
    bedrooms = p.bedrooms if p.bedrooms is not None else (parsed.bedrooms if parsed else None)
    market_category = (p.category if p.category and p.category.lower() in market_cats else None) or (parsed.market_category if parsed else None)
    if category and category.lower() in market_cats:
        market_category, category = category, None
    kinds = _scope(p, parsed, market_cats, p.category)
    sort = p.sort
    if sort == "relevant" and parsed and parsed.sort == "price_asc":
        sort = "price_asc"

    def run(kw, cat, mcat, loc_city, loc_loc):
        return _retrieve(db, kinds, q=" ".join(kw) or None, category=cat, market_category=mcat, city=loc_city,
                         locality=loc_loc, price_min=price_min, price_max=price_max, listing_type=listing_type, bedrooms=bedrooms)

    hits = run(keywords, category, market_category, city, locality)
    relaxed = False
    if not hits and q and p.ai:
        # Relax one constraint at a time, but never down to "no keyword and no category" (that would return everything).
        original = (tuple(keywords), category, market_category, locality)
        for kw, cat, mcat, loc in (([], category, market_category, locality), (keywords, None, None, locality),
                                   (keywords, category, market_category, None), ([], category, market_category, None),
                                   (keywords, None, None, None)):
            if not (kw or cat or mcat) or (tuple(kw), cat, mcat, loc) == original:
                continue
            hits = run(kw, cat, mcat, city, loc)
            if hits:
                relaxed, keywords = True, kw
                break

    # semantic blending (silently skipped when no embedding model is available)
    sims: dict = {}
    if q and p.ai and parsed and parsed.intent == "search":
        sims = embedding_service.semantic_scores(db, ai, q, {"business", "property", "marketplace"} if not p.type else
                                                 {"business" if p.type in ("business", "professional") else p.type})
    for h in hits:
        h.kw = keyword_score(h, keywords)
        h.sem = sims.get(h.key, 0.0)
        sem_norm = max(0.0, min(1.0, (h.sem - 0.3) / 0.5)) if sims else 0.0
        bonus = 0.05 if getattr(h.obj, "verification", "") in ("verified", "claimed") else 0.0
        h.score = (0.65 * h.kw + 0.35 * sem_norm if sims else h.kw) + bonus
    if sims and parsed:  # semantic-only discoveries (no keyword overlap), still subject to every filter
        seen = {h.key for h in hits}
        extra = [k for k, v in sims.items() if v >= 0.6 and k not in seen]
        for h in _hydrate_semantic(db, extra, kinds, category, market_category, city, locality, price_min, price_max,
                                   listing_type, bedrooms):
            h.sem = sims[h.key]
            h.score = 0.35 * max(0.0, min(1.0, (h.sem - 0.3) / 0.5))
            hits.append(h)

    if sort == "newest" or (sort == "relevant" and not q):
        hits.sort(key=lambda h: (h.obj.created_at, h.obj.id), reverse=True)
    elif sort == "name":
        hits.sort(key=lambda h: (getattr(h.obj, "name", None) or h.obj.title).lower())
    elif sort == "price_asc":
        hits.sort(key=_sort_key_price)
    elif sort == "price_desc":
        hits.sort(key=lambda h: -(_sort_key_price(h) if _sort_key_price(h) != float("inf") else -1))
    else:
        hits.sort(key=lambda h: (h.score, h.obj.created_at), reverse=True)

    total = len(hits)
    start = (p.page - 1) * p.limit
    page_hits = hits[start:start + p.limit]
    return {
        "items": [_to_item(h) for h in page_hits], "total": total, "page": p.page, "limit": p.limit,
        "pages": max(1, -(-total // p.limit)) if total else 1,
        "filters": parsed.chips() if parsed else [], "provider": provider if provider != "none" else "keyword",
        "relaxed": relaxed, "parsed": parsed,
    }


def _hydrate_semantic(db, keys, kinds, category, market_category, city, locality, price_min, price_max, listing_type, bedrooms):
    out: list[Hit] = []
    for et, eid in keys[:50]:
        obj = repo.get_entity(db, et, eid)
        if obj is None or obj.status != repo.VISIBLE_STATUS[et]:
            continue
        kind = obj.kind if et == "business" else et
        if kind not in kinds:
            continue
        if city and (obj.city or "").lower() != city.lower():
            continue
        if locality and locality.lower() not in (obj.locality or "").lower():
            continue
        if et == "business" and category and obj.category.lower() != category.lower():
            continue
        if et == "marketplace" and market_category and obj.category.lower() != market_category.lower():
            continue
        if et == "property" and ((listing_type and obj.listing_type != listing_type) or
                                 (bedrooms is not None and (obj.bedrooms or 0) < bedrooms)):
            continue
        price = obj.price if et != "business" else obj.price_min
        if (price_min is not None or price_max is not None) and price is None:
            continue
        if price_min is not None and price is not None and price < price_min:
            continue
        if price_max is not None and price is not None and price > price_max:
            continue
        out.append(Hit(kind, obj))
    return out


def chat_search(db: Session, message: str, history: list[dict], viewer: User | None, ai: AIService | None = None):
    """Assistant helper: short follow-ups ("in Pune?") are interpreted together with the previous user message."""
    prev = next((h["text"] for h in reversed(history) if h.get("role") == "user"), None)
    effective = f"{prev} {message}" if prev and len(tokenize(message)) <= 3 else message
    res = search(db, SearchParams(q=effective, limit=5, ai=True), viewer, ai)
    return res
