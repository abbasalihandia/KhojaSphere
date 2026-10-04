from __future__ import annotations

import re
from typing import Annotated, Generic, TypeVar

from pydantic import BaseModel, BeforeValidator, ConfigDict
from pydantic.alias_generators import to_camel

T = TypeVar("T")


class CamelModel(BaseModel):
    """camelCase on the wire (matches the existing frontend field names), snake_case in Python."""

    model_config = ConfigDict(alias_generator=to_camel, populate_by_name=True, str_strip_whitespace=True)


class Page(CamelModel, Generic[T]):
    items: list[T]
    total: int
    page: int
    limit: int
    pages: int


class Message(CamelModel):
    message: str


def _check_image(u: str) -> str:
    u = (u or "").strip()
    if len(u) > 500:
        raise ValueError("Image URL is too long")
    if not (u.startswith("https://") or u.startswith("http://") or u.startswith("/uploads/")):
        raise ValueError("Images must be uploaded through KhojaSphere or be http(s) URLs")
    if ".." in u or "\\" in u or any(c in u for c in "<>\"' "):
        raise ValueError("Invalid image URL")
    return u


ImageUrl = Annotated[str, BeforeValidator(_check_image)]

_PHONE_RE = re.compile(r"^[0-9xX+\-()\s.]{6,24}$")


def _check_phone(v):
    if v in (None, ""):
        return None
    v = str(v).strip()
    if not _PHONE_RE.match(v) or sum(ch.isdigit() for ch in v) < 6 and "x" not in v.lower():
        raise ValueError("Enter a valid phone number")
    return v


Phone = Annotated[str | None, BeforeValidator(_check_phone)]


def build_page(items: list, total: int, page: int, limit: int) -> dict:
    return {"items": items, "total": total, "page": page, "limit": limit, "pages": max(1, -(-total // limit)) if total else 1}
