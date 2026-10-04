from __future__ import annotations

from dataclasses import dataclass, field

from app.utils.formatting import indian_group


@dataclass
class Taxonomy:
    business_categories: list[str]
    market_categories: list[str]
    cities: list[str]
    localities: list[str]


@dataclass
class ParsedQuery:
    keywords: list[str] = field(default_factory=list)
    category: str | None = None
    market_category: str | None = None
    city: str | None = None
    locality: str | None = None
    types: list[str] = field(default_factory=list)  # business | professional | property | marketplace
    listing_type: str | None = None
    bedrooms: int | None = None
    price_min: int | None = None
    price_max: int | None = None
    sort: str | None = None
    intent: str = "search"  # search | create_listing

    def chips(self) -> list[str]:
        out: list[str] = []
        if self.city:
            out.append(self.city)
        if self.locality:
            out.append(self.locality)
        if self.category:
            out.append(self.category)
        if self.market_category:
            out.append(self.market_category)
        if self.listing_type:
            out.append({"rent": "For rent", "sale": "For sale", "shared": "Shared", "commercial": "Commercial"}[self.listing_type])
        if self.bedrooms:
            out.append(f"{self.bedrooms} BHK")
        if self.price_max:
            out.append(f"Under ₹{indian_group(self.price_max)}")
        if self.price_min:
            out.append(f"Above ₹{indian_group(self.price_min)}")
        if self.sort == "price_asc":
            out.append("Lowest price first")
        return out


@dataclass
class DraftResult:
    kind: str
    title: str
    description: str
    short_desc: str
    category: str
    tags: list[str]
    fields: dict
    missing: list[str]
