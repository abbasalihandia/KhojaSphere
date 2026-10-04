from __future__ import annotations

from fastapi import Depends
from fastapi.security import HTTPAuthorizationCredentials, HTTPBearer
from sqlalchemy.orm import Session

from app.core.errors import Forbidden, Unauthorized
from app.database.session import get_db
from app.models import User
from app.services import auth_service

bearer = HTTPBearer(auto_error=False, description="Paste the token returned by /api/auth/login")


def get_token(creds: HTTPAuthorizationCredentials | None = Depends(bearer)) -> str:
    if creds is None or creds.scheme.lower() != "bearer":
        raise Unauthorized("Please sign in to continue.", code="not_authenticated", headers={"WWW-Authenticate": "Bearer"})
    return creds.credentials


def current_user(token: str = Depends(get_token), db: Session = Depends(get_db)) -> User:
    return auth_service.authenticate_token(db, token)


def optional_user(creds: HTTPAuthorizationCredentials | None = Depends(bearer), db: Session = Depends(get_db)) -> User | None:
    """Anonymous visitors are fine; a *present but invalid* token is still rejected so the client can re-authenticate."""
    if creds is None:
        return None
    return auth_service.authenticate_token(db, creds.credentials)


def admin_user(user: User = Depends(current_user)) -> User:
    if user.role != "admin":
        raise Forbidden("Administrator access is required.")
    return user
