from __future__ import annotations

from datetime import datetime
from typing import Literal

from pydantic import EmailStr, Field, field_validator, model_validator

from app.ai.lexicon import CONDITIONS, FURNISHING, LISTING_TYPES, PROPERTY_TYPES
from app.schemas.common import CamelModel, ImageUrl, Phone

PRICE_MAX = 100_000_000_000


def _tags(v):
    if v is None:
        return v
    out, seen = [], set()
    for t in v:
        t = " ".join(str(t).split())[:40]
        if t and t.lower() not in seen:
            seen.add(t.lower())
            out.append(t)
    if len(out) > 12:
        raise ValueError("At most 12 tags")
    return out


# ---------------- Business ----------------
class ServiceIn(CamelModel):
    name: str = Field(min_length=1, max_length=160)
    price: str | None = Field(default=None, max_length=80)


class BusinessFields(CamelModel):
    kind: Literal["business", "professional"] | None = None
    name: str | None = Field(default=None, min_length=2, max_length=160)
    category: str | None = Field(default=None, min_length=2, max_length=80)
    short_desc: str | None = Field(default=None, max_length=300)
    description: str | None = Field(default=None, max_length=5000)
    city: str | None = Field(default=None, max_length=80)
    locality: str | None = Field(default=None, max_length=80)
    address: str | None = Field(default=None, max_length=300)
    phone: Phone = None
    email: EmailStr | None = None
    website: str | None = Field(default=None, max_length=300)
    instagram: str | None = Field(default=None, max_length=80)
    hours: str | None = Field(default=None, max_length=160)
    price_min: int | None = Field(default=None, ge=0, le=PRICE_MAX)
    price_max: int | None = Field(default=None, ge=0, le=PRICE_MAX)
    price_label: str | None = Field(default=None, max_length=120)
    tags: list[str] | None = None
    services: list[ServiceIn] | None = Field(default=None, max_length=20)
    images: list[ImageUrl] | None = Field(default=None, max_length=8)
    cover_image: ImageUrl | None = None

    _t = field_validator("tags")(_tags)

    @model_validator(mode="after")
    def _range(self):
        if self.price_min is not None and self.price_max is not None and self.price_min > self.price_max:
            raise ValueError("Minimum price cannot be greater than maximum price")
        return self


class BusinessCreate(BusinessFields):
    name: str = Field(min_length=2, max_length=160)
    category: str = Field(min_length=2, max_length=80)
    submit: bool = False  # false = save as draft, true = send for review


class BusinessUpdate(BusinessFields):
    pass


class ServiceOut(CamelModel):
    name: str
    price: str | None = None


class BusinessOut(CamelModel):
    id: int
    kind: str
    name: str
    category: str
    short_desc: str
    description: str
    location: str
    city: str | None = None
    locality: str | None = None
    address: str | None = None
    image: str | None = None
    images: list[str] = []
    cover_image: str | None = None
    tags: list[str] = []
    status: str  # display label, e.g. "Verification pending"
    verification: str
    listing_status: str  # draft | pending | approved | rejected | hidden
    price_range: str = ""
    price_min: int | None = None
    price_max: int | None = None
    phone: str | None = None
    email: str | None = None
    website: str | None = None
    instagram: str | None = None
    hours: str | None = None
    services: list[ServiceOut] = []
    owner_id: int | None = None
    is_owner: bool = False
    is_sample: bool = False
    view_count: int | None = None
    created_at: datetime
    updated_at: datetime


# ---------------- Property ----------------
class PropertyFields(CamelModel):
    title: str | None = Field(default=None, min_length=3, max_length=200)
    description: str | None = Field(default=None, max_length=5000)
    listing_type: Literal["rent", "sale", "shared", "commercial"] | None = None
    property_type: str | None = None
    price: int | None = Field(default=None, ge=1, le=PRICE_MAX)
    price_period: Literal["month", "total"] | None = None
    city: str | None = Field(default=None, max_length=80)
    locality: str | None = Field(default=None, max_length=80)
    address: str | None = Field(default=None, max_length=300)
    bedrooms: int | None = Field(default=None, ge=0, le=20)
    bathrooms: int | None = Field(default=None, ge=0, le=20)
    area_sqft: int | None = Field(default=None, ge=1, le=1_000_000)
    furnishing: str | None = None
    amenities: list[str] | None = None
    images: list[ImageUrl] | None = Field(default=None, max_length=10)
    poster_type: Literal["Owner listing", "Agent listing"] | None = None
    availability: str | None = Field(default=None, max_length=80)
    status: Literal["active", "closed"] | None = None

    _a = field_validator("amenities")(_tags)

    @field_validator("property_type")
    @classmethod
    def _ptype(cls, v):
        if v is not None and v not in PROPERTY_TYPES:
            raise ValueError(f"Property type must be one of: {', '.join(PROPERTY_TYPES)}")
        return v

    @field_validator("furnishing")
    @classmethod
    def _furn(cls, v):
        if v in (None, ""):
            return None
        if v not in FURNISHING:
            raise ValueError(f"Furnishing must be one of: {', '.join(FURNISHING)}")
        return v


class PropertyCreate(PropertyFields):
    title: str = Field(min_length=3, max_length=200)
    listing_type: Literal["rent", "sale", "shared", "commercial"]
    price: int = Field(ge=1, le=PRICE_MAX)
    property_type: str = "Apartment"


class PropertyUpdate(PropertyFields):
    pass


class PropertyOut(CamelModel):
    id: int
    title: str
    description: str
    type: str  # rent | sale | shared | commercial
    property_type: str
    price: str  # display label
    price_value: int
    price_period: str
    location: str
    city: str | None = None
    locality: str | None = None
    address: str | None = None
    bedrooms: int | None = None
    bathrooms: int | None = None
    area: str = ""
    area_sqft: int | None = None
    furnishing: str | None = None
    amenities: list[str] = []
    image: str | None = None
    images: list[str] = []
    owner: str
    owner_id: int | None = None
    is_owner: bool = False
    available: str | None = None
    label: str = ""
    status: str
    is_sample: bool = False
    posted: str
    created_at: datetime


# ---------------- Marketplace ----------------
class MarketplaceFields(CamelModel):
    title: str | None = Field(default=None, min_length=3, max_length=200)
    description: str | None = Field(default=None, max_length=5000)
    category: str | None = Field(default=None, max_length=80)
    price: int | None = Field(default=None, ge=0, le=PRICE_MAX)
    negotiable: bool | None = None
    condition: str | None = None
    city: str | None = Field(default=None, max_length=80)
    locality: str | None = Field(default=None, max_length=80)
    images: list[ImageUrl] | None = Field(default=None, max_length=10)
    status: Literal["active", "sold"] | None = None

    @field_validator("condition")
    @classmethod
    def _cond(cls, v):
        if v is not None and v not in CONDITIONS:
            raise ValueError(f"Condition must be one of: {', '.join(CONDITIONS)}")
        return v


class MarketplaceCreate(MarketplaceFields):
    title: str = Field(min_length=3, max_length=200)
    category: str = Field(min_length=2, max_length=80)
    price: int = Field(ge=0, le=PRICE_MAX)
    condition: str = "Good"


class MarketplaceUpdate(MarketplaceFields):
    pass


class MarketplaceOut(CamelModel):
    id: int
    title: str
    description: str
    price: str
    price_value: int
    condition: str
    location: str
    city: str | None = None
    locality: str | None = None
    negotiable: bool
    category: str
    image: str | None = None
    images: list[str] = []
    posted: str
    label: str = ""
    status: str
    seller_id: int | None = None
    is_owner: bool = False
    is_sample: bool = False
    created_at: datetime


# ---------------- Search ----------------
class SearchItem(CamelModel):
    type: str  # business | professional | property | marketplace
    id: int
    name: str
    category: str
    short_desc: str
    location: str
    image: str | None = None
    tags: list[str] = []
    status: str = ""
    price_range: str = ""
    is_sample: bool = False
    score: float = 0.0


class CategoryOut(CamelModel):
    id: int
    kind: str
    name: str
    icon: str | None = None
    count: int = 0
    is_active: bool = True
    sort_order: int = 0
