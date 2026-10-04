from __future__ import annotations

from sqlalchemy import Select, func, or_, select
from sqlalchemy.orm import Session

from app.ai.lexicon import STOPWORDS, expand_tokens
from app.utils.text import escape_like, tokenize


def paginate(db: Session, stmt: Select, page: int, limit: int):
    total = db.scalar(select(func.count()).select_from(stmt.order_by(None).subquery())) or 0
    rows = db.scalars(stmt.limit(limit).offset((page - 1) * limit)).all()
    return list(rows), int(total)


def like_any(column, terms: list[str]):
    return or_(*[func.lower(column).like(f"%{escape_like(t)}%", escape="\\") for t in terms])


def keyword_clause(column, q: str | None, *, require_all: bool = True):
    """Match free text against a lowercase `search_text` column. Synonyms are OR-ed per word; words are AND-ed
    (list endpoints) or OR-ed (ranked search)."""
    if not q:
        return None
    words = [t for t in tokenize(q) if t not in STOPWORDS] or tokenize(q)
    if not words:
        return None
    groups = [like_any(column, expand_tokens([w])) for w in words]
    if require_all:
        from sqlalchemy import and_
        return and_(*groups)
    return or_(*groups)
