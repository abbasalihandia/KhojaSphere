from __future__ import annotations

from typing import Literal

from pydantic import Field

from app.schemas.common import CamelModel
from app.schemas.listings import SearchItem


class ChatTurn(CamelModel):
    role: Literal["user", "ai"]
    text: str = Field(max_length=4000)


class ChatIn(CamelModel):
    message: str = Field(min_length=1, max_length=1000)
    history: list[ChatTurn] = Field(default_factory=list, max_length=20)


class ChatOut(CamelModel):
    reply: str
    results: list[SearchItem] = []
    filters: list[str] = []
    action: str | None = None  # "open_listing_assistant"
    provider: str  # ollama | fallback
    degraded: bool = False


class DraftIn(CamelModel):
    kind: Literal["business", "property", "marketplace"] = "business"
    text: str = Field(min_length=10, max_length=3000)


class DraftOut(CamelModel):
    kind: str
    title: str
    description: str
    short_desc: str = ""
    category: str
    tags: list[str] = []
    fields: dict = {}
    missing: list[str] = []
    provider: str
    degraded: bool = False


class AIStatus(CamelModel):
    enabled: bool
    provider: str  # ollama | fallback
    available: bool
    chat_model: str | None = None
    embed_model: str | None = None
    semantic_search: bool = False
    detail: str = ""
