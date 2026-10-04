"""Password hashing and JWT helpers."""
from __future__ import annotations

import hashlib
import secrets
import uuid
from datetime import datetime, timedelta, timezone

import bcrypt
import jwt

from app.core.config import get_settings

MAX_PASSWORD_BYTES = 72  # bcrypt limit; enforced by validation so nothing is silently truncated
_DUMMY_HASH = bcrypt.hashpw(b"khojasphere-dummy", bcrypt.gensalt(rounds=4)).decode()


def hash_password(password: str) -> str:
    return bcrypt.hashpw(password.encode("utf-8"), bcrypt.gensalt(rounds=get_settings().bcrypt_rounds)).decode()


def verify_password(password: str, password_hash: str | None) -> bool:
    """Always performs one bcrypt comparison so timing does not reveal whether an account exists."""
    try:
        target = (password_hash or _DUMMY_HASH).encode()
        ok = bcrypt.checkpw(password.encode("utf-8")[:MAX_PASSWORD_BYTES], target)
        return ok and password_hash is not None
    except ValueError:
        return False


def create_access_token(user_id: int) -> tuple[str, str, datetime]:
    s = get_settings()
    now = datetime.now(timezone.utc)
    exp = now + timedelta(minutes=s.access_token_expire_minutes)
    jti = uuid.uuid4().hex
    token = jwt.encode({"sub": str(user_id), "jti": jti, "iat": now, "exp": exp}, s.jwt_secret, algorithm=s.jwt_algorithm)
    return token, jti, exp


def decode_token(token: str) -> dict:
    s = get_settings()
    return jwt.decode(token, s.jwt_secret, algorithms=[s.jwt_algorithm], options={"require": ["exp", "sub", "jti"]})


def new_reset_token() -> tuple[str, str]:
    raw = secrets.token_urlsafe(32)
    return raw, hash_token(raw)


def hash_token(raw: str) -> str:
    return hashlib.sha256(raw.encode()).hexdigest()
