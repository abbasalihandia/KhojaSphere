from __future__ import annotations

from datetime import datetime

from sqlalchemy import ForeignKey, Index, Integer, String, Text, UniqueConstraint
from sqlalchemy.orm import Mapped, mapped_column
from sqlalchemy.types import JSON

from app.database.session import Base
from app.models.types import UTCDateTime, utcnow


class Favorite(Base):
    __tablename__ = "favorites"
    __table_args__ = (UniqueConstraint("user_id", "entity_type", "entity_id", name="uq_favorite"),)

    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    user_id: Mapped[int] = mapped_column(ForeignKey("users.id", ondelete="CASCADE"), index=True)
    entity_type: Mapped[str] = mapped_column(String(12))  # business | property | marketplace
    entity_id: Mapped[int] = mapped_column(Integer)
    created_at: Mapped[datetime] = mapped_column(UTCDateTime, default=utcnow)


class Inquiry(Base):
    """A message routed through the platform (no direct contact details are exchanged)."""

    __tablename__ = "inquiries"
    __table_args__ = (Index("ix_inquiry_target", "target_type", "target_id"),)

    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    sender_id: Mapped[int] = mapped_column(ForeignKey("users.id", ondelete="CASCADE"), index=True)
    receiver_id: Mapped[int | None] = mapped_column(ForeignKey("users.id", ondelete="SET NULL"), index=True)
    target_type: Mapped[str] = mapped_column(String(12))  # business | property | marketplace | mentor
    target_id: Mapped[int] = mapped_column(Integer)
    target_title: Mapped[str] = mapped_column(String(200))
    sender_name: Mapped[str] = mapped_column(String(120))
    message: Mapped[str] = mapped_column(Text)
    contact_method: Mapped[str] = mapped_column(String(10), default="platform")  # platform|email|phone
    status: Mapped[str] = mapped_column(String(10), default="unread")  # unread|read|replied
    reply_text: Mapped[str | None] = mapped_column(Text)
    replied_at: Mapped[datetime | None] = mapped_column(UTCDateTime)
    created_at: Mapped[datetime] = mapped_column(UTCDateTime, default=utcnow, index=True)


class Report(Base):
    __tablename__ = "reports"

    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    reporter_id: Mapped[int | None] = mapped_column(ForeignKey("users.id", ondelete="SET NULL"))
    entity_type: Mapped[str] = mapped_column(String(12))  # business | property | marketplace
    entity_id: Mapped[int] = mapped_column(Integer)
    entity_title: Mapped[str] = mapped_column(String(200))
    reason: Mapped[str] = mapped_column(String(120))
    details: Mapped[str | None] = mapped_column(Text)
    status: Mapped[str] = mapped_column(String(14), default="pending", index=True)  # pending|under_review|resolved
    created_at: Mapped[datetime] = mapped_column(UTCDateTime, default=utcnow, index=True)
    updated_at: Mapped[datetime] = mapped_column(UTCDateTime, default=utcnow, onupdate=utcnow)


class Embedding(Base):
    """Optional semantic-search vectors (only populated when an embedding model is available)."""

    __tablename__ = "embeddings"
    __table_args__ = (UniqueConstraint("entity_type", "entity_id", name="uq_embedding_entity"),)

    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    entity_type: Mapped[str] = mapped_column(String(12))
    entity_id: Mapped[int] = mapped_column(Integer)
    model: Mapped[str] = mapped_column(String(80))
    text_hash: Mapped[str] = mapped_column(String(64))
    vector: Mapped[list] = mapped_column(JSON)
    updated_at: Mapped[datetime] = mapped_column(UTCDateTime, default=utcnow, onupdate=utcnow)
