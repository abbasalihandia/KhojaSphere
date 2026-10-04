from __future__ import annotations

from typing import Protocol

from app.ai.types import DraftResult, ParsedQuery, Taxonomy


class AIProviderError(Exception):
    """Raised when a provider cannot produce a usable answer (timeout, bad JSON, model missing...)."""


class AIProvider(Protocol):
    name: str

    def parse_query(self, text: str, tax: Taxonomy) -> ParsedQuery: ...

    def compose_reply(self, message: str, history: list[dict], parsed: ParsedQuery, results: list[dict]) -> str: ...

    def draft_listing(self, kind: str, text: str, tax: Taxonomy) -> DraftResult: ...
