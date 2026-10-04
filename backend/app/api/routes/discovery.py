from __future__ import annotations

from typing import Literal

from fastapi import APIRouter, Depends, File, Query, UploadFile
from sqlalchemy.orm import Session

from app.ai.service import AIService, get_ai_service
from app.api.deps import current_user, optional_user
from app.core.rate_limit import rate_limit
from app.database.session import get_db
from app.models import User
from app.repositories import listings as lrepo
from app.repositories import social as srepo
from app.schemas.ai import AIStatus, ChatIn, ChatOut, DraftIn, DraftOut
from app.schemas.common import CamelModel
from app.schemas.listings import CategoryOut, SearchItem
from app.services import dashboard_service, search_service, taxonomy, upload_service
from app.services.search_service import SearchParams

router = APIRouter()


class SearchPage(CamelModel):
    items: list[SearchItem]
    total: int
    page: int
    limit: int
    pages: int
    filters: list[str] = []
    provider: str = "keyword"
    relaxed: bool = False


@router.get("/search", response_model=SearchPage, tags=["Search"])
def search(q: str | None = Query(None, max_length=300), category: str | None = None, city: str | None = None,
           locality: str | None = None, type: Literal["business", "professional", "property", "marketplace"] | None = None,
           price_min: int | None = Query(None, ge=0), price_max: int | None = Query(None, ge=0),
           sort: Literal["relevant", "newest", "name", "price_asc", "price_desc"] = "relevant",
           ai: bool = True, page: int = Query(1, ge=1, le=10_000), limit: int = Query(10, ge=1, le=50),
           db: Session = Depends(get_db), viewer: User | None = Depends(optional_user),
           _rl=Depends(rate_limit("search", 120, 60))):
    """Keyword + filter search over all listing kinds. With `ai=true` the query is interpreted in natural language
    (via Ollama when available, otherwise built-in rules) and may add filters such as city or budget."""
    if price_min is not None and price_max is not None and price_min > price_max:
        from app.core.errors import AppError
        raise AppError("price_min cannot be greater than price_max", code="validation_error", status_code=422,
                       details=[{"field": "price_min", "message": "price_min cannot be greater than price_max"}])
    res = search_service.search(db, SearchParams(q=q, category=category, city=city, locality=locality, type=type,
                                                 price_min=price_min, price_max=price_max, sort=sort, page=page, limit=limit, ai=ai), viewer)
    res.pop("parsed", None)
    return res


@router.get("/categories", response_model=list[CategoryOut], tags=["Meta"])
def categories(kind: Literal["business", "marketplace"] | None = None, db: Session = Depends(get_db)):
    counts = lrepo.count_businesses_by_category(db)
    from sqlalchemy import func, select
    from app.models import MarketplaceItem
    mcounts = dict(db.execute(select(MarketplaceItem.category, func.count()).where(MarketplaceItem.status == "active")
                              .group_by(MarketplaceItem.category)).all())
    out = []
    for c in srepo.list_categories(db, kind):
        n = (counts if c.kind == "business" else mcounts).get(c.name, 0)
        out.append(CategoryOut(id=c.id, kind=c.kind, name=c.name, icon=c.icon, count=n, sort_order=c.sort_order))
    return out


@router.get("/stats", tags=["Meta"])
def stats(db: Session = Depends(get_db)):
    return dashboard_service.public_stats(db)


@router.get("/health", tags=["Meta"])
def health(db: Session = Depends(get_db)):
    from sqlalchemy import text
    db.execute(text("SELECT 1"))
    return {"status": "ok"}


@router.get("/dashboard/summary", tags=["Dashboard"])
def dashboard(user: User = Depends(current_user), db: Session = Depends(get_db)):
    return dashboard_service.summary(db, user)


# ------------------------------------------------------------------ uploads
@router.post("/uploads", tags=["Uploads"], dependencies=[Depends(rate_limit("upload", 40, 60))])
def upload_images(files: list[UploadFile] = File(...), user: User = Depends(current_user)):
    """Upload 1-8 images (JPG/PNG/WebP, max size from MAX_UPLOAD_MB). Returns URLs to put in `images` fields."""
    from app.core.errors import BadRequest
    if not 1 <= len(files) <= 8:
        raise BadRequest("Upload between 1 and 8 images at a time.", code="invalid_file_count")
    return {"files": [upload_service.save_image(f, folder=f"u{user.id}") for f in files]}


# ------------------------------------------------------------------ AI
@router.get("/ai/status", response_model=AIStatus, tags=["AI"])
def ai_status(ai: AIService = Depends(get_ai_service)):
    return ai.status()


@router.post("/ai/chat", response_model=ChatOut, tags=["AI"], dependencies=[Depends(rate_limit("ai", 30, 60))])
def ai_chat(data: ChatIn, db: Session = Depends(get_db), viewer: User | None = Depends(optional_user),
            ai: AIService = Depends(get_ai_service)):
    """Grounded discovery assistant: results always come from the database; the model only interprets the request and
    words the reply. Works without Ollama (rule-based fallback)."""
    history = [h.model_dump() for h in data.history]
    res = search_service.chat_search(db, data.message, history, viewer, ai)
    parsed = res["parsed"]
    results = [] if parsed and parsed.intent == "create_listing" else res["items"]
    reply, provider = ai.compose_reply(data.message, history, parsed, [r.model_dump() for r in results])
    used = "ollama" if "ollama" in (provider, res["provider"]) else "fallback"
    return ChatOut(reply=reply, results=results, filters=res["filters"],
                   action="open_listing_assistant" if parsed and parsed.intent == "create_listing" else None,
                   provider=used, degraded=ai.settings.ai_enabled and used == "fallback")


@router.post("/ai/listing-draft", response_model=DraftOut, tags=["AI"], dependencies=[Depends(rate_limit("ai", 30, 60))])
def ai_listing_draft(data: DraftIn, db: Session = Depends(get_db), user: User = Depends(current_user),
                     ai: AIService = Depends(get_ai_service)):
    """Turn a free-text description into a draft listing (title, description, category, tags, extracted fields and a
    list of missing information). Nothing is saved; the user reviews and publishes."""
    draft, provider = ai.draft_listing(data.kind, data.text, taxonomy.load(db))
    return DraftOut(kind=draft.kind, title=draft.title, description=draft.description, short_desc=draft.short_desc,
                    category=draft.category, tags=draft.tags, fields=draft.fields, missing=draft.missing, provider=provider,
                    degraded=ai.settings.ai_enabled and provider == "fallback")
