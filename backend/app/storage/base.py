"""Storage abstraction. Local disk is implemented; an S3 backend only needs to implement
`save`/`delete`/`url_for` and be returned from `get_storage()` (see README, "Cloud storage")."""
from __future__ import annotations

import os
import uuid
from abc import ABC, abstractmethod
from functools import lru_cache
from pathlib import Path

from app.core.config import get_settings


class StorageBackend(ABC):
    @abstractmethod
    def save(self, data: bytes, *, ext: str, folder: str = "") -> str:
        """Persist bytes and return a stored reference (what goes in the database)."""

    @abstractmethod
    def delete(self, ref: str) -> None: ...

    @abstractmethod
    def url_for(self, ref: str) -> str:
        """Public URL for a stored reference."""


class LocalStorage(StorageBackend):
    def __init__(self, root: str, base_url: str):
        self.root = Path(root).resolve()
        self.root.mkdir(parents=True, exist_ok=True)
        self.base_url = base_url.rstrip("/")

    def save(self, data: bytes, *, ext: str, folder: str = "") -> str:
        name = f"{uuid.uuid4().hex}.{ext.lstrip('.')}"
        target_dir = (self.root / folder) if folder else self.root
        target_dir.mkdir(parents=True, exist_ok=True)
        path = target_dir / name
        with open(path, "wb") as fh:
            fh.write(data)
        os.chmod(path, 0o644)
        return f"/uploads/{folder + '/' if folder else ''}{name}"

    def delete(self, ref: str) -> None:
        if not ref.startswith("/uploads/"):
            return
        path = (self.root / ref[len("/uploads/"):]).resolve()
        if self.root in path.parents and path.is_file():
            path.unlink(missing_ok=True)

    def url_for(self, ref: str) -> str:
        return f"{self.base_url}{ref}" if ref.startswith("/uploads/") else ref


@lru_cache
def get_storage() -> StorageBackend:
    s = get_settings()
    if s.storage_backend == "local":
        return LocalStorage(s.upload_dir, s.backend_url)
    raise RuntimeError(f"Unsupported STORAGE_BACKEND '{s.storage_backend}'. Implement StorageBackend for it.")


def public_url(ref: str | None) -> str | None:
    if not ref:
        return None
    if ref.startswith("http://") or ref.startswith("https://"):
        return ref
    return get_storage().url_for(ref)
