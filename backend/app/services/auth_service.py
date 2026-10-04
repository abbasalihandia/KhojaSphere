from __future__ import annotations

from datetime import datetime, timedelta, timezone

import jwt
from sqlalchemy.orm import Session

from app.core.config import get_settings
from app.core.errors import BadRequest, Conflict, Forbidden, Unauthorized
from app.core.security import (create_access_token, decode_token, hash_password, hash_token, new_reset_token,
                               verify_password)
from app.models import MentorProfile, User
from app.repositories import accounts as repo
from app.schemas.auth import AuthOut, ChangePasswordIn, LoginIn, ProfileUpdateIn, RegisterIn, ResetIn
from app.services import presenters
from app.services.email_service import send_email
from app.utils.text import clean

INVALID_LOGIN = "Invalid email or password."


def _auth_out(user: User) -> AuthOut:
    token, _, exp = create_access_token(user.id)
    return AuthOut(token=token, expires_at=exp, user=presenters.user_out(user))


def register(db: Session, data: RegisterIn) -> AuthOut:
    if repo.get_user_by_email(db, data.email):
        raise Conflict("An account with this email already exists.", code="email_taken")
    user = User(name=clean(data.name), email=data.email, phone=data.phone, city=clean(data.city),
                password_hash=hash_password(data.password), account_type=data.account_type, role="user")
    repo.add_user(db, user)
    db.commit()
    return _auth_out(user)


def login(db: Session, data: LoginIn) -> AuthOut:
    user = repo.get_user_by_email(db, data.email)
    ok = verify_password(data.password, user.password_hash if user else None)
    if not user or not ok:
        raise Unauthorized(INVALID_LOGIN, code="invalid_credentials")
    if not user.is_active:
        raise Forbidden("This account has been suspended. Please contact support.", code="account_disabled")
    return _auth_out(user)


def authenticate_token(db: Session, token: str) -> User:
    try:
        claims = decode_token(token)
    except jwt.ExpiredSignatureError:
        raise Unauthorized("Your session has expired. Please sign in again.", code="token_expired")
    except jwt.PyJWTError:
        raise Unauthorized("Invalid authentication token.", code="invalid_token")
    if repo.is_revoked(db, claims["jti"]):
        raise Unauthorized("You have been signed out. Please sign in again.", code="token_revoked")
    try:
        user = repo.get_user(db, int(claims["sub"]))
    except ValueError:
        raise Unauthorized("Invalid authentication token.", code="invalid_token")
    if not user:
        raise Unauthorized("Account not found.", code="invalid_token")
    if not user.is_active:
        raise Forbidden("This account has been suspended. Please contact support.", code="account_disabled")
    return user


def logout(db: Session, token: str) -> None:
    try:
        claims = decode_token(token)
    except jwt.PyJWTError:
        return
    repo.revoke_token(db, claims["jti"], datetime.fromtimestamp(claims["exp"], tz=timezone.utc))
    db.commit()


def forgot_password(db: Session, email: str) -> None:
    """Always succeeds from the caller's point of view so the endpoint cannot be used to discover accounts."""
    user = repo.get_user_by_email(db, email)
    if not user or not user.is_active:
        return
    s = get_settings()
    raw, hashed = new_reset_token()
    repo.add_reset_token(db, user.id, hashed, datetime.now(timezone.utc) + timedelta(minutes=s.password_reset_expire_minutes))
    db.commit()
    link = f"{s.primary_frontend_url}/#/auth-reset?token={raw}"
    send_email(user.email, "Reset your KhojaSphere password",
               f"Hi {user.name},\n\nUse this link to choose a new password (valid for {s.password_reset_expire_minutes} minutes):\n{link}\n\n"
               "If you did not ask for this, you can ignore this email.")


def reset_password(db: Session, data: ResetIn) -> None:
    tok = repo.get_reset_token(db, hash_token(data.token))
    now = datetime.now(timezone.utc)
    if not tok or tok.used_at is not None or tok.expires_at < now:
        raise BadRequest("This reset link is invalid or has expired. Please request a new one.", code="invalid_reset_token")
    user = repo.get_user(db, tok.user_id)
    if not user:
        raise BadRequest("This reset link is invalid or has expired.", code="invalid_reset_token")
    user.password_hash = hash_password(data.new_password)
    tok.used_at = now
    db.commit()


def change_password(db: Session, user: User, data: ChangePasswordIn) -> None:
    if not verify_password(data.current_password, user.password_hash):
        raise BadRequest("Your current password is incorrect.", code="wrong_password")
    user.password_hash = hash_password(data.new_password)
    db.commit()


def update_profile(db: Session, user: User, data: ProfileUpdateIn) -> User:
    fields = data.model_fields_set
    if "name" in fields and data.name:
        user.name = clean(data.name)
    if "phone" in fields:
        user.phone = data.phone
    if "city" in fields:
        user.city = clean(data.city) or None
    if "bio" in fields:
        user.bio = (data.bio or "").strip() or None
    if "avatar_url" in fields:
        user.avatar_url = data.avatar_url
    db.commit()
    return user
