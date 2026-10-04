from __future__ import annotations

from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

from app.api.deps import current_user, get_token
from app.core.rate_limit import rate_limit
from app.database.session import get_db
from app.models import User
from app.schemas.auth import (AuthOut, ChangePasswordIn, ForgotIn, LoginIn, ProfileUpdateIn, RegisterIn, ResetIn,
                              UserOut)
from app.schemas.common import Message
from app.services import auth_service, presenters

router = APIRouter(prefix="/auth", tags=["Auth"])


@router.post("/register", response_model=AuthOut, status_code=201, dependencies=[Depends(rate_limit("register", 10, 3600))])
def register(data: RegisterIn, db: Session = Depends(get_db)):
    """Create an account and sign in. Admin accounts cannot be created here."""
    return auth_service.register(db, data)


@router.post("/login", response_model=AuthOut, dependencies=[Depends(rate_limit("login", 10, 60))])
def login(data: LoginIn, db: Session = Depends(get_db)):
    return auth_service.login(db, data)


@router.post("/logout", response_model=Message)
def logout(token: str = Depends(get_token), db: Session = Depends(get_db)):
    """Revokes the presented token server-side."""
    auth_service.logout(db, token)
    return Message(message="Signed out.")


@router.get("/me", response_model=UserOut)
def me(user: User = Depends(current_user)):
    return presenters.user_out(user)


@router.post("/forgot-password", response_model=Message, dependencies=[Depends(rate_limit("forgot", 5, 3600))])
def forgot_password(data: ForgotIn, db: Session = Depends(get_db)):
    auth_service.forgot_password(db, data.email)
    return Message(message="If an account exists for that email, a reset link has been sent.")


@router.post("/reset-password", response_model=Message, dependencies=[Depends(rate_limit("reset", 10, 3600))])
def reset_password(data: ResetIn, db: Session = Depends(get_db)):
    auth_service.reset_password(db, data)
    return Message(message="Password updated. You can now sign in.")


@router.post("/change-password", response_model=Message)
def change_password(data: ChangePasswordIn, user: User = Depends(current_user), db: Session = Depends(get_db)):
    auth_service.change_password(db, user, data)
    return Message(message="Password changed.")


users_router = APIRouter(prefix="/users", tags=["Users"])


@users_router.get("/me", response_model=UserOut)
def get_me(user: User = Depends(current_user)):
    return presenters.user_out(user)


@users_router.put("/me", response_model=UserOut)
def update_me(data: ProfileUpdateIn, user: User = Depends(current_user), db: Session = Depends(get_db)):
    return presenters.user_out(auth_service.update_profile(db, user, data))
