"""Optional semantic index. Everything here is a no-op when no embedding model is available."""
from __future__ import annotations

import hashlib
import logging
import math

from sqlalchemy import select
from sqlalchemy.orm import Session

from app.ai.service import AIService, get_ai_service
from app.database.session import SessionLocal
from app.models import Business, Embedding, MarketplaceItem, Property
from app.repositories.listings import ENTITY_MODEL, VISIBLE_STATUS

log = logging.getLogger("khojasphere.embeddings")


def entity_text(entity_type: str, obj) -> str:
    if entity_type == "business":
        return f"{obj.name}. {obj.category}. {', '.join(obj.tags or [])}. {obj.short_desc} {(obj.description or '')[:400]} {obj.locality or ''} {obj.city or ''}"
    if entity_type == "property":
        return (f"{obj.title}. {obj.property_type} for {obj.listing_type}. {obj.bedrooms or ''} bedroom {obj.furnishing or ''}. "
                f"{', '.join(obj.amenities or [])}. {(obj.description or '')[:400]} {obj.locality or ''} {obj.city or ''}")
    return f"{obj.title}. {obj.category}. {obj.condition}. {(obj.description or '')[:400]} {obj.locality or ''} {obj.city or ''}"


def _hash(text: str, model: str) -> str:
    return hashlib.sha256(f"{model}|{text}".encode()).hexdigest()


def index_entities(db: Session, ai: AIService, items: list[tuple[str, object]]) -> int:
    if not items or not ai.semantic_ready():
        return 0
    model = ai.settings.ollama_embed_model
    todo: list[tuple[str, object, str, str]] = []
    for et, obj in items:
        text = entity_text(et, obj)
        h = _hash(text, model)
        row = db.scalar(select(Embedding).where(Embedding.entity_type == et, Embedding.entity_id == obj.id))
        if row and row.text_hash == h and row.model == model:
            continue
        todo.append((et, obj, text, h))
    done = 0
    for i in range(0, len(todo), 16):
        chunk = todo[i:i + 16]
        vecs = ai.embed([t[2] for t in chunk])
        if not vecs:
            break
        for (et, obj, _, h), vec in zip(chunk, vecs):
            row = db.scalar(select(Embedding).where(Embedding.entity_type == et, Embedding.entity_id == obj.id))
            if row:
                row.vector, row.text_hash, row.model = vec, h, model
            else:
                db.add(Embedding(entity_type=et, entity_id=obj.id, model=model, text_hash=h, vector=vec))
            done += 1
        db.commit()
    return done


def index_entity_task(entity_type: str, entity_id: int) -> None:
    """Background task: index one listing with its own DB session. Never raises."""
    try:
        ai = get_ai_service()
        if not ai.semantic_ready():
            return
        with SessionLocal() as db:
            obj = db.get(ENTITY_MODEL[entity_type], entity_id)
            if obj is not None:
                index_entities(db, ai, [(entity_type, obj)])
    except Exception:  # noqa: BLE001 - indexing is best effort
        log.warning("Indexing %s %s failed", entity_type, entity_id, exc_info=False)


def reindex_all(db: Session, ai: AIService | None = None) -> dict:
    ai = ai or get_ai_service()
    if not ai.semantic_ready():
        return {"indexed": 0, "available": False}
    total = 0
    for et, model in (("business", Business), ("property", Property), ("marketplace", MarketplaceItem)):
        rows = db.scalars(select(model).where(model.status == VISIBLE_STATUS[et])).all()
        total += index_entities(db, ai, [(et, r) for r in rows])
    return {"indexed": total, "available": True}


def _cos(a: list[float], b: list[float]) -> float:
    dot = sum(x * y for x, y in zip(a, b))
    na, nb = math.sqrt(sum(x * x for x in a)), math.sqrt(sum(y * y for y in b))
    return dot / (na * nb) if na and nb else 0.0


def semantic_scores(db: Session, ai: AIService, query: str, types: set[str]) -> dict[tuple[str, int], float]:
    """Cosine similarity of the query against every indexed listing of the requested kinds ({} if unavailable)."""
    if not ai.semantic_ready():
        return {}
    vecs = ai.embed([query])
    if not vecs:
        return {}
    q = vecs[0]
    model = ai.settings.ollama_embed_model
    out: dict[tuple[str, int], float] = {}
    for row in db.scalars(select(Embedding).where(Embedding.entity_type.in_(types), Embedding.model == model)).all():
        if len(row.vector) == len(q):
            out[(row.entity_type, row.entity_id)] = _cos(q, row.vector)
    return out
