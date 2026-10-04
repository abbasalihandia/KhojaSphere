"""Thin httpx wrapper around the Ollama HTTP API with a circuit breaker so an offline Ollama never slows requests down."""
from __future__ import annotations

import json
import logging
import threading
import time

import httpx

from app.ai.provider import AIProviderError

log = logging.getLogger("khojasphere.ai")


class OllamaClient:
    def __init__(self, base_url: str, chat_model: str, embed_model: str, timeout: float):
        self.base_url = base_url.rstrip("/")
        self.chat_model = chat_model
        self.embed_model = embed_model
        self.timeout = timeout
        self._lock = threading.Lock()
        self._models: set[str] = set()
        self._checked_at = 0.0
        self._reachable = False
        self._down_until = 0.0
        self.last_error = ""

    # -- availability -------------------------------------------------
    def _refresh(self, force: bool = False) -> None:
        now = time.monotonic()
        with self._lock:
            if not force and (now < self._down_until or now - self._checked_at < 20):
                return
            self._checked_at = now
        try:
            r = httpx.get(f"{self.base_url}/api/tags", timeout=3.0)
            r.raise_for_status()
            names = {m.get("name", "") for m in r.json().get("models", [])}
            with self._lock:
                self._models, self._reachable, self.last_error = names, True, ""
        except Exception as exc:  # network error, timeout, bad status, bad JSON
            with self._lock:
                self._reachable, self._models = False, set()
                self._down_until = time.monotonic() + 30
                self.last_error = f"Ollama not reachable at {self.base_url} ({exc.__class__.__name__})"

    def _has(self, model: str) -> bool:
        if not model:
            return False
        base = model.split(":")[0]
        return any(m == model or m == f"{model}:latest" or (":" not in model and m.split(":")[0] == base) for m in self._models)

    def reachable(self) -> bool:
        self._refresh()
        return self._reachable

    def chat_ready(self) -> bool:
        self._refresh()
        return self._reachable and self._has(self.chat_model)

    def embed_ready(self) -> bool:
        self._refresh()
        return self._reachable and self._has(self.embed_model)

    def mark_failed(self, reason: str) -> None:
        with self._lock:
            self._down_until = time.monotonic() + 20
            self._reachable = False
            self.last_error = reason

    # -- calls --------------------------------------------------------
    def chat(self, system: str, messages: list[dict], *, json_mode: bool = False) -> str:
        payload = {
            "model": self.chat_model, "stream": False,
            "messages": [{"role": "system", "content": system}, *messages],
            "options": {"temperature": 0.1 if json_mode else 0.4, "num_predict": 700},
        }
        if json_mode:
            payload["format"] = "json"
        try:
            r = httpx.post(f"{self.base_url}/api/chat", json=payload, timeout=httpx.Timeout(self.timeout, connect=2.0))
            r.raise_for_status()
            content = r.json()["message"]["content"]
        except (httpx.HTTPError, KeyError, ValueError) as exc:
            self.mark_failed(f"Ollama chat failed ({exc.__class__.__name__})")
            raise AIProviderError(f"Ollama chat failed: {exc.__class__.__name__}") from exc
        if not isinstance(content, str) or not content.strip():
            raise AIProviderError("Ollama returned an empty response")
        return content.strip()

    def chat_json(self, system: str, user: str) -> dict:
        content = self.chat(system, [{"role": "user", "content": user}], json_mode=True)
        try:
            data = json.loads(content)
        except json.JSONDecodeError:
            start, end = content.find("{"), content.rfind("}")
            try:
                data = json.loads(content[start:end + 1])
            except (json.JSONDecodeError, ValueError) as exc:
                raise AIProviderError("Ollama returned invalid JSON") from exc
        if not isinstance(data, dict):
            raise AIProviderError("Ollama JSON was not an object")
        return data

    def embed(self, texts: list[str]) -> list[list[float]]:
        try:
            r = httpx.post(f"{self.base_url}/api/embed", json={"model": self.embed_model, "input": texts}, timeout=httpx.Timeout(self.timeout, connect=2.0))
            r.raise_for_status()
            vecs = r.json()["embeddings"]
        except (httpx.HTTPError, KeyError, ValueError) as exc:
            self.mark_failed(f"Ollama embed failed ({exc.__class__.__name__})")
            raise AIProviderError(f"Ollama embed failed: {exc.__class__.__name__}") from exc
        if len(vecs) != len(texts) or not all(isinstance(v, list) and v for v in vecs):
            raise AIProviderError("Ollama returned malformed embeddings")
        return vecs
