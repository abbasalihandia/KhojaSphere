from __future__ import annotations

from datetime import datetime
from typing import Literal

from pydantic import Field

from app.schemas.common import CamelModel, ImageUrl

EntityType = Literal["business", "property", "marketplace"]
InquiryTarget = Literal["business", "property", "marketplace", "mentor"]


class FavoriteIn(CamelModel):
    entity_type: EntityType
    entity_id: int = Field(ge=1)


class FavoriteIds(CamelModel):
    business: list[int] = []
    property: list[int] = []
    marketplace: list[int] = []


class InquiryIn(CamelModel):
    target_type: InquiryTarget
    target_id: int = Field(ge=1)
    name: str = Field(min_length=2, max_length=120)
    message: str = Field(min_length=5, max_length=2000)
    contact_method: Literal["platform", "email", "phone"] = "platform"


class ReplyIn(CamelModel):
    text: str = Field(min_length=1, max_length=2000)


class InquiryOut(CamelModel):
    id: int
    target_type: str
    target_id: int
    target_title: str
    sender_name: str
    message: str
    contact_method: str
    status: str  # unread | read | replied
    reply_text: str | None = None
    replied_at: datetime | None = None
    created_at: datetime
    time: str
    box: str  # received | sent


REPORT_REASONS = [
    "Incorrect contact info", "Photos do not match listing", "Suspected duplicate listing", "Missing business details",
    "Scam or fraud", "Inappropriate content", "Other",
]


class ReportIn(CamelModel):
    entity_type: EntityType
    entity_id: int = Field(ge=1)
    reason: str = Field(min_length=3, max_length=120)
    details: str | None = Field(default=None, max_length=1000)


class ReportOut(CamelModel):
    id: int
    listing: str
    type: str
    entity_type: str
    entity_id: int
    reason: str
    details: str | None = None
    status: str  # display label
    status_key: str
    date: str


class MentorOut(CamelModel):
    id: int
    name: str
    role: str
    expertise: list[str] = []
    education: str | None = None
    format: str | None = None
    availability: str | None = None
    image: str | None = None
    bio: str | None = None
    status: str
    is_sample: bool = False
    requested: bool = False
    is_owner: bool = False


class MentorProfileIn(CamelModel):
    headline: str = Field(min_length=3, max_length=160)
    expertise: list[str] = Field(min_length=1, max_length=10)
    education: str | None = Field(default=None, max_length=200)
    format: str | None = Field(default=None, max_length=80)
    availability: str | None = Field(default=None, max_length=120)
    bio: str | None = Field(default=None, max_length=2000)
    image: ImageUrl | None = None


class MentorRequestIn(CamelModel):
    message: str | None = Field(default=None, max_length=1000)
