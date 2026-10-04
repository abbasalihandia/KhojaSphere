from __future__ import annotations

from datetime import datetime

from sqlalchemy import BigInteger, Boolean, ForeignKey, Index, Integer, String, Text, UniqueConstraint
from sqlalchemy.orm import Mapped, mapped_column, relationship
from sqlalchemy.types import JSON

from app.database.session import Base
from app.models.types import UTCDateTime, utcnow


class Category(Base):
    __tablename__ = "categories"
    __table_args__ = (UniqueConstraint("kind", "name", name="uq_category_kind_name"),)

    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    kind: Mapped[str] = mapped_column(String(20), index=True)  # business | marketplace
    name: Mapped[str] = mapped_column(String(80))
    icon: Mapped[str | None] = mapped_column(String(40))
    sort_order: Mapped[int] = mapped_column(Integer, default=0)
    is_active: Mapped[bool] = mapped_column(Boolean, default=True)


class Business(Base):
    """A business or an independent professional (kind) listed in the directory."""

    __tablename__ = "businesses"
    __table_args__ = (Index("ix_business_visible", "status", "category", "city"),)

    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    owner_id: Mapped[int | None] = mapped_column(ForeignKey("users.id", ondelete="SET NULL"), index=True)
    kind: Mapped[str] = mapped_column(String(20), default="business")  # business | professional
    name: Mapped[str] = mapped_column(String(160))
    category: Mapped[str] = mapped_column(String(80), index=True)
    short_desc: Mapped[str] = mapped_column(String(300), default="")
    description: Mapped[str] = mapped_column(Text, default="")
    city: Mapped[str | None] = mapped_column(String(80), index=True)
    locality: Mapped[str | None] = mapped_column(String(80))
    address: Mapped[str | None] = mapped_column(String(300))
    phone: Mapped[str | None] = mapped_column(String(40))
    email: Mapped[str | None] = mapped_column(String(254))
    website: Mapped[str | None] = mapped_column(String(300))
    instagram: Mapped[str | None] = mapped_column(String(80))
    hours: Mapped[str | None] = mapped_column(String(160))
    price_min: Mapped[int | None] = mapped_column(BigInteger)
    price_max: Mapped[int | None] = mapped_column(BigInteger)
    price_label: Mapped[str | None] = mapped_column(String(120))
    tags: Mapped[list] = mapped_column(JSON, default=list)
    images: Mapped[list] = mapped_column(JSON, default=list)
    cover_image: Mapped[str | None] = mapped_column(String(500))
    verification: Mapped[str] = mapped_column(String(12), default="pending")  # sample|pending|verified|claimed
    status: Mapped[str] = mapped_column(String(12), default="draft", index=True)  # draft|pending|approved|rejected|hidden
    is_sample: Mapped[bool] = mapped_column(Boolean, default=False)
    view_count: Mapped[int] = mapped_column(Integer, default=0)
    search_text: Mapped[str] = mapped_column(Text, default="")
    created_at: Mapped[datetime] = mapped_column(UTCDateTime, default=utcnow, index=True)
    updated_at: Mapped[datetime] = mapped_column(UTCDateTime, default=utcnow, onupdate=utcnow)

    services: Mapped[list["BusinessService"]] = relationship(
        back_populates="business", cascade="all, delete-orphan", order_by="BusinessService.position", lazy="selectin")


class BusinessService(Base):
    __tablename__ = "business_services"

    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    business_id: Mapped[int] = mapped_column(ForeignKey("businesses.id", ondelete="CASCADE"), index=True)
    name: Mapped[str] = mapped_column(String(160))
    price_label: Mapped[str | None] = mapped_column(String(80))
    position: Mapped[int] = mapped_column(Integer, default=0)

    business: Mapped[Business] = relationship(back_populates="services")


class Property(Base):
    __tablename__ = "properties"
    __table_args__ = (Index("ix_property_visible", "status", "listing_type", "city"),)

    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    owner_id: Mapped[int | None] = mapped_column(ForeignKey("users.id", ondelete="SET NULL"), index=True)
    title: Mapped[str] = mapped_column(String(200))
    description: Mapped[str] = mapped_column(Text, default="")
    listing_type: Mapped[str] = mapped_column(String(12))  # rent | sale | shared | commercial
    property_type: Mapped[str] = mapped_column(String(40), default="Apartment")
    price: Mapped[int] = mapped_column(BigInteger, index=True)
    price_period: Mapped[str] = mapped_column(String(10), default="month")  # month | total
    city: Mapped[str | None] = mapped_column(String(80), index=True)
    locality: Mapped[str | None] = mapped_column(String(80))
    address: Mapped[str | None] = mapped_column(String(300))
    bedrooms: Mapped[int | None] = mapped_column(Integer)
    bathrooms: Mapped[int | None] = mapped_column(Integer)
    area_sqft: Mapped[int | None] = mapped_column(Integer)
    furnishing: Mapped[str | None] = mapped_column(String(20))
    amenities: Mapped[list] = mapped_column(JSON, default=list)
    images: Mapped[list] = mapped_column(JSON, default=list)
    poster_type: Mapped[str] = mapped_column(String(20), default="Owner listing")
    availability: Mapped[str | None] = mapped_column(String(80))
    status: Mapped[str] = mapped_column(String(10), default="active", index=True)  # active|hidden|closed
    is_sample: Mapped[bool] = mapped_column(Boolean, default=False)
    search_text: Mapped[str] = mapped_column(Text, default="")
    created_at: Mapped[datetime] = mapped_column(UTCDateTime, default=utcnow, index=True)
    updated_at: Mapped[datetime] = mapped_column(UTCDateTime, default=utcnow, onupdate=utcnow)


class MarketplaceItem(Base):
    __tablename__ = "marketplace_items"
    __table_args__ = (Index("ix_market_visible", "status", "category", "city"),)

    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    seller_id: Mapped[int | None] = mapped_column(ForeignKey("users.id", ondelete="SET NULL"), index=True)
    title: Mapped[str] = mapped_column(String(200))
    description: Mapped[str] = mapped_column(Text, default="")
    category: Mapped[str] = mapped_column(String(80), index=True)
    price: Mapped[int] = mapped_column(BigInteger, index=True)
    negotiable: Mapped[bool] = mapped_column(Boolean, default=False)
    condition: Mapped[str] = mapped_column(String(12), default="Good")  # New|Like New|Good|Fair
    city: Mapped[str | None] = mapped_column(String(80), index=True)
    locality: Mapped[str | None] = mapped_column(String(80))
    images: Mapped[list] = mapped_column(JSON, default=list)
    status: Mapped[str] = mapped_column(String(10), default="active", index=True)  # active|hidden|sold
    is_sample: Mapped[bool] = mapped_column(Boolean, default=False)
    search_text: Mapped[str] = mapped_column(Text, default="")
    created_at: Mapped[datetime] = mapped_column(UTCDateTime, default=utcnow, index=True)
    updated_at: Mapped[datetime] = mapped_column(UTCDateTime, default=utcnow, onupdate=utcnow)


class MentorProfile(Base):
    __tablename__ = "mentor_profiles"

    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    user_id: Mapped[int | None] = mapped_column(ForeignKey("users.id", ondelete="CASCADE"), unique=True)
    name: Mapped[str] = mapped_column(String(120))
    headline: Mapped[str] = mapped_column(String(160), default="")
    expertise: Mapped[list] = mapped_column(JSON, default=list)
    education: Mapped[str | None] = mapped_column(String(200))
    format: Mapped[str | None] = mapped_column(String(80))
    availability: Mapped[str | None] = mapped_column(String(120))
    image_url: Mapped[str | None] = mapped_column(String(500))
    bio: Mapped[str | None] = mapped_column(Text)
    status: Mapped[str] = mapped_column(String(10), default="pending", index=True)  # pending|approved|rejected|hidden
    is_sample: Mapped[bool] = mapped_column(Boolean, default=False)
    search_text: Mapped[str] = mapped_column(Text, default="")
    created_at: Mapped[datetime] = mapped_column(UTCDateTime, default=utcnow)
    updated_at: Mapped[datetime] = mapped_column(UTCDateTime, default=utcnow, onupdate=utcnow)
