from __future__ import annotations

from datetime import datetime, timezone

from sqlalchemy import delete, func, select
from sqlalchemy.orm import Session

from app.models import PasswordResetToken, RevokedToken, User
from app.repositories.common import paginate
from app.utils.text import escape_like


def get_user(db: Session, user_id: int) -> User | None:
    return db.get(User, user_id)


def get_user_by_email(db: Session, email: str) -> User | None:
    return db.scalar(select(User).where(User.email == email.lower()))


def add_user(db: Session, user: User) -> User:
    db.add(user)
    db.flush()
    return user


def list_users(db: Session, *, q: str | None, role: str | None, page: int, limit: int):
    stmt = select(User)
    if q:
        like = f"%{escape_like(q.lower())}%"
        stmt = stmt.where(func.lower(User.name).like(like, escape="\\") | func.lower(User.email).like(like, escape="\\"))
    if role:
        stmt = stmt.where(User.role == role)
    return paginate(db, stmt.order_by(User.created_at.desc(), User.id.desc()), page, limit)


def count_users(db: Session) -> int:
    return db.scalar(select(func.count()).select_from(User)) or 0


def revoke_token(db: Session, jti: str, expires_at: datetime) -> None:
    if db.get(RevokedToken, jti) is None:
        db.add(RevokedToken(jti=jti, expires_at=expires_at))
    db.execute(delete(RevokedToken).where(RevokedToken.expires_at < datetime.now(timezone.utc)))


def is_revoked(db: Session, jti: str) -> bool:
    return db.get(RevokedToken, jti) is not None


def add_reset_token(db: Session, user_id: int, token_hash: str, expires_at: datetime) -> None:
    db.execute(delete(PasswordResetToken).where(PasswordResetToken.user_id == user_id))
    db.add(PasswordResetToken(user_id=user_id, token_hash=token_hash, expires_at=expires_at))


def get_reset_token(db: Session, token_hash: str) -> PasswordResetToken | None:
    return db.scalar(select(PasswordResetToken).where(PasswordResetToken.token_hash == token_hash))
