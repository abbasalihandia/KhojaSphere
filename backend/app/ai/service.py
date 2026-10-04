"""AIService: single entry point used by the rest of the app. Picks Ollama when it is configured and healthy,
otherwise the deterministic FallbackProvider. Callers never see provider errors."""
from __future__ import annotations

import logging
from dataclasses import replace

from app.ai.fallback_provider import FallbackProvider
from app.ai.ollama_client import OllamaClient
from app.ai.ollama_provider import OllamaProvider
from app.ai.provider import AIProviderError
from app.ai.types import DraftResult, ParsedQuery, Taxonomy
from app.core.config import Settings, get_settings
from app.schemas.ai import AIStatus

log = logging.getLogger("khojasphere.ai")


def _merge(llm: ParsedQuery, rules: ParsedQuery) -> ParsedQuery:
    """Trust deterministic extraction for numbers; let the model fill gaps and add keywords."""
    out = replace(llm)
    for f in ("category", "market_category", "city", "locality", "listing_type"):
        if getattr(out, f) is None:
            setattr(out, f, getattr(rules, f))
    out.bedrooms = rules.bedrooms or out.bedrooms
    out.price_min = rules.price_min or out.price_min
    out.price_max = rules.price_max or out.price_max
    out.types = out.types or rules.types
    out.sort = rules.sort
    if rules.intent == "create_listing":
        out.intent = "create_listing"
    seen, kws = set(), []
    for k in [*llm.keywords, *rules.keywords]:
        if k not in seen:
            seen.add(k)
            kws.append(k)
    out.keywords = kws[:8]
    return out


class AIService:
    def __init__(self, settings: Settings | None = None, client: OllamaClient | None = None):
        self.settings = settings or get_settings()
        self.fallback = FallbackProvider()
        self.client = client
        if self.client is None and self.settings.ai_enabled:
            self.client = OllamaClient(self.settings.ollama_base_url, self.settings.ollama_model,
                                       self.settings.ollama_embed_model, self.settings.ollama_timeout_seconds)
        self.ollama = OllamaProvider(self.client) if self.client else None

    # -- status ----------------------------------------------------------
    def _llm_ready(self) -> bool:
        return bool(self.settings.ai_enabled and self.client and self.client.chat_ready())

    def semantic_ready(self) -> bool:
        return bool(self.settings.ai_enabled and self.settings.semantic_search_enabled and self.client and self.client.embed_ready())

    def status(self) -> AIStatus:
        s = self.settings
        if not s.ai_enabled:
            return AIStatus(enabled=False, provider="fallback", available=False, detail="AI is disabled (AI_ENABLED=false). Using built-in smart search.")
        ready = self._llm_ready()
        if ready:
            return AIStatus(enabled=True, provider="ollama", available=True, chat_model=s.ollama_model,
                            embed_model=s.ollama_embed_model if self.semantic_ready() else None,
                            semantic_search=self.semantic_ready(), detail="Ollama is connected.")
        detail = self.client.last_error if self.client and self.client.last_error else (
            f"Model '{s.ollama_model}' is not installed in Ollama." if self.client and self.client.reachable() else "Ollama is not running.")
        return AIStatus(enabled=True, provider="fallback", available=False, chat_model=s.ollama_model,
                        detail=f"{detail} Using built-in smart search.")

    # -- capabilities ----------------------------------------------------
    def parse_query(self, text: str, tax: Taxonomy) -> tuple[ParsedQuery, str]:
        rules = self.fallback.parse_query(text, tax)
        if self.ollama and self._llm_ready():
            try:
                return _merge(self.ollama.parse_query(text, tax), rules), "ollama"
            except AIProviderError as exc:
                log.warning("Ollama parse failed, using fallback: %s", exc)
        return rules, "fallback"

    def compose_reply(self, message: str, history: list[dict], parsed: ParsedQuery, results: list[dict]) -> tuple[str, str]:
        if parsed.intent != "create_listing" and self.ollama and self._llm_ready():
            try:
                return self.ollama.compose_reply(message, history, parsed, results), "ollama"
            except AIProviderError as exc:
                log.warning("Ollama reply failed, using fallback: %s", exc)
        return self.fallback.compose_reply(message, history, parsed, results), "fallback"

    def draft_listing(self, kind: str, text: str, tax: Taxonomy) -> tuple[DraftResult, str]:
        if self.ollama and self._llm_ready():
            try:
                return self.ollama.draft_listing(kind, text, tax), "ollama"
            except AIProviderError as exc:
                log.warning("Ollama draft failed, using fallback: %s", exc)
        return self.fallback.draft_listing(kind, text, tax), "fallback"

    def embed(self, texts: list[str]) -> list[list[float]] | None:
        if not texts or not self.semantic_ready():
            return None
        try:
            return self.client.embed(texts)  # type: ignore[union-attr]
        except AIProviderError as exc:
            log.warning("Embedding failed: %s", exc)
            return None


_service: AIService | None = None


def get_ai_service() -> AIService:
    global _service
    if _service is None:
        _service = AIService()
    return _service


def reset_ai_service() -> None:
    global _service
    _service = None
