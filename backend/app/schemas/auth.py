from __future__ import annotations

from datetime import datetime
from typing import Literal

from pydantic import EmailStr, Field, field_validator

from app.core.security import MAX_PASSWORD_BYTES
from app.schemas.common import CamelModel, ImageUrl, Phone

AccountType = Literal["member", "business", "professional", "property", "seller", "mentor"]


def validate_password_strength(v: str) -> str:
    if len(v) < 8:
        raise ValueError("Password must be at least 8 characters")
    if len(v.encode("utf-8")) > MAX_PASSWORD_BYTES:
        raise ValueError("Password is too long (max 72 bytes)")
    if not any(c.isalpha() for c in v) or not any(c.isdigit() for c in v):
        raise ValueError("Password must include at least one letter and one number")
    return v


class RegisterIn(CamelModel):
    name: str = Field(min_length=2, max_length=120)
    email: EmailStr
    password: str
    city: str = Field(min_length=2, max_length=80)
    account_type: AccountType = "member"
    phone: Phone = None

    _pw = field_validator("password")(validate_password_strength)

    @field_validator("email")
    @classmethod
    def _lower(cls, v: str) -> str:
        return v.lower()


class LoginIn(CamelModel):
    email: EmailStr
    password: str = Field(min_length=1, max_length=200)

    @field_validator("email")
    @classmethod
    def _lower(cls, v: str) -> str:
        return v.lower()


class ForgotIn(CamelModel):
    email: EmailStr


class ResetIn(CamelModel):
    token: str = Field(min_length=10, max_length=200)
    new_password: str

    _pw = field_validator("new_password")(validate_password_strength)


class ChangePasswordIn(CamelModel):
    current_password: str = Field(min_length=1, max_length=200)
    new_password: str

    _pw = field_validator("new_password")(validate_password_strength)


class ProfileUpdateIn(CamelModel):
    name: str | None = Field(default=None, min_length=2, max_length=120)
    phone: Phone = None
    city: str | None = Field(default=None, max_length=80)
    bio: str | None = Field(default=None, max_length=1000)
    avatar_url: ImageUrl | None = None


class UserOut(CamelModel):
    id: int
    name: str
    email: str
    phone: str | None = None
    avatar_url: str | None = None
    city: str | None = None
    bio: str | None = None
    account_type: str
    role: str
    created_at: datetime


class AuthOut(CamelModel):
    token: str
    token_type: str = "bearer"
    expires_at: datetime
    user: UserOut
