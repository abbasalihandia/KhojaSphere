"""Deterministic provider: no model required. Rule-based parsing, templated replies and listing drafts.
Never invents facts: every value it outputs is either taken from the user's text or from the database."""
from __future__ import annotations

import re

from app.ai.lexicon import (BUSINESS_CATEGORY_WORDS, CITY_ALIASES, COMMERCIAL_WORDS, CONDITIONS, FURNISHING,
                            MARKET_WORDS, MARKETPLACE_CATEGORY_WORDS, PROFESSIONAL_WORDS, PROPERTY_TYPES, PROPERTY_WORDS,
                            RENT_WORDS, SALE_WORDS, SHARED_WORDS, STOPWORDS)
from app.ai.types import DraftResult, ParsedQuery, Taxonomy
from app.utils.formatting import indian_group
from app.utils.text import clean, tokenize

_UNIT = {"k": 1_000, "l": 100_000, "lac": 100_000, "lakh": 100_000, "lakhs": 100_000, "cr": 10_000_000,
         "crore": 10_000_000, "crores": 10_000_000}
_AMT = r"(?:₹|rs\.?|inr)?\s*([\d,]+(?:\.\d+)?)\s*(k|lakhs?|lacs?|l|crores?|cr)?\b"
_MAX_CUES = r"(?:under|below|less than|within|upto|up to|max(?:imum)?|budget(?: of)?|not more than)"
_MIN_CUES = r"(?:above|over|more than|at least|min(?:imum)?|starting(?: from)?)"
_CREATE = re.compile(r"\b(create|add|post|publish|write|make|start)\b.{0,30}\b(listing|ad|advert|business profile)\b|"
                     r"\blist (?:my|a|an|our)\b|\bregister (?:my|a|our) business\b|\bhelp me (?:to )?(?:create|list|post)\b")
_PHONE = re.compile(r"(?<!\d)(?:\+?91[\s-]?)?[6-9]\d{4}[\s-]?\d{5}(?!\d)")
_EMAIL = re.compile(r"[\w.+-]+@[\w-]+\.[\w.-]+")


def _amount(num: str, unit: str | None) -> int | None:
    try:
        v = float(num.replace(",", ""))
    except ValueError:
        return None
    mult = _UNIT.get((unit or "").lower(), 1)
    out = int(round(v * mult))
    return out if out > 0 else None


def _find_cities(low: str, tax: Taxonomy) -> tuple[str | None, set[str]]:
    consumed: set[str] = set()
    found = None
    for alias, city in CITY_ALIASES.items():
        if re.search(rf"\b{re.escape(alias)}\b", low):
            found = city
            consumed.update(tokenize(alias))
    # longest names first so "Navi Mumbai" wins over "Mumbai"
    for c in sorted(set(tax.cities), key=len, reverse=True):
        if re.search(rf"\b{re.escape(c.lower())}\b", low):
            found = found or c
            consumed.update(tokenize(c))
            break
    return found, consumed


def _find_locality(low: str, tax: Taxonomy) -> tuple[str | None, set[str]]:
    for loc in sorted(set(tax.localities), key=len, reverse=True):
        if re.search(rf"\b{re.escape(loc.lower())}\b", low):
            return loc, set(tokenize(loc))
    return None, set()


def _best_category(tokens: list[str], low: str, mapping: dict[str, set[str]], allowed: list[str]) -> str | None:
    best, best_key = None, (0, -1)
    allowed_l = {a.lower(): a for a in allowed}
    for cat, words in mapping.items():
        if cat.lower() not in allowed_l:
            continue
        hits = [i for i, t in enumerate(tokens) if t in words]
        if hits:
            key = (len(hits), max(hits))
            if key > best_key:
                best, best_key = allowed_l[cat.lower()], key
    if best is None:  # the category's own name appears in the text ("event services")
        for a in allowed:
            if a.lower() in low:
                return a
    return best


class FallbackProvider:
    name = "fallback"

    # ------------------------------------------------------------------ query parsing
    def parse_query(self, text: str, tax: Taxonomy) -> ParsedQuery:
        low = clean(text).lower()
        tokens = tokenize(low)
        pq = ParsedQuery()
        if _CREATE.search(low):
            pq.intent = "create_listing"

        pq.city, used = _find_cities(low, tax)
        pq.locality, used_loc = _find_locality(low, tax)
        used |= used_loc

        m = re.search(r"\b(\d)\s*(?:bhk|bed(?:room)?s?)\b", low)
        if m:
            pq.bedrooms = int(m.group(1))
            used.add(m.group(1) + "bhk")

        mx = re.search(_MAX_CUES + r"\s*(?:of\s*)?" + _AMT, low)
        mn = re.search(_MIN_CUES + r"\s*(?:of\s*)?" + _AMT, low)
        between = re.search(r"between\s*" + _AMT + r"\s*(?:and|to|-)\s*" + _AMT, low)
        if between:
            pq.price_min = _amount(between.group(1), between.group(2))
            pq.price_max = _amount(between.group(3), between.group(4))
        else:
            if mx:
                pq.price_max = _amount(mx.group(1), mx.group(2))
            if mn:
                pq.price_min = _amount(mn.group(1), mn.group(2))
        if re.search(r"\b(affordable|cheap|cheapest|budget|low cost|inexpensive)\b", low) and not pq.price_max:
            pq.sort = "price_asc"

        tokset = set(tokens)
        wants_property = bool(tokset & PROPERTY_WORDS) or pq.bedrooms is not None
        mkt_cat = _best_category(tokens, low, MARKETPLACE_CATEGORY_WORDS, tax.market_categories)
        wants_market = bool(tokset & MARKET_WORDS) or (mkt_cat is not None and not wants_property)
        biz_cat = _best_category(tokens, low, BUSINESS_CATEGORY_WORDS, tax.business_categories)

        if wants_property and not (tokset & MARKET_WORDS and mkt_cat):
            pq.types = ["property"]
            if tokset & SHARED_WORDS:
                pq.listing_type = "shared"
            elif tokset & COMMERCIAL_WORDS and not pq.bedrooms:
                pq.listing_type = "commercial"
            elif tokset & SALE_WORDS and not tokset & RENT_WORDS:
                pq.listing_type = "sale"
            elif tokset & RENT_WORDS:
                pq.listing_type = "rent"
        elif wants_market:
            pq.types = ["marketplace"]
            pq.market_category = mkt_cat
        elif biz_cat:
            pq.category = biz_cat
            pq.types = ["professional"] if tokset & PROFESSIONAL_WORDS else ["business", "professional"]
        elif tokset & PROFESSIONAL_WORDS:
            pq.types = ["professional"]

        skip = set(STOPWORDS) | used | {"bhk", *_UNIT} | PROFESSIONAL_WORDS
        if pq.types == ["property"]:
            skip |= PROPERTY_WORDS | SALE_WORDS | RENT_WORDS | SHARED_WORDS
        if pq.types == ["marketplace"]:
            skip |= MARKET_WORDS
        pq.keywords = [t for t in tokens if t not in skip and not t.isdigit() and not re.fullmatch(r"\d+(k|l|cr|lakh|lakhs)?", t)
                       and t not in {"rs", "inr", "₹"}]
        if pq.intent == "create_listing":
            pq.keywords = []
        return pq

    # ------------------------------------------------------------------ replies
    def compose_reply(self, message: str, history: list[dict], parsed: ParsedQuery, results: list[dict]) -> str:
        if parsed.intent == "create_listing":
            return ("I can help you create a listing! The AI Listing Assistant will guide you through describing it "
                    "and generate a draft you can review before publishing.")
        n = len(results)
        what = {"property": "properties", "marketplace": "marketplace listings"}.get(parsed.types[0] if len(parsed.types) == 1 else "", "community listings")
        where = f" in {parsed.locality or parsed.city}" if (parsed.locality or parsed.city) else ""
        if parsed.locality and parsed.city:
            where = f" in {parsed.locality}, {parsed.city}"
        if n == 0:
            return (f"I couldn't find {what}{where} that match that yet. Try a broader area, a different category, "
                    "or fewer details, and I'll look again.")
        refine = []
        if not parsed.locality and not parsed.city:
            refine.append("location")
        if not (parsed.price_max or parsed.price_min):
            refine.append("budget")
        text = f"I found {n} matching {what if n != 1 else what.rstrip('s')}{where}."
        if any(r.get("is_sample") for r in results):
            text += " Some of these are sample listings, so verify details before making contact."
        if refine:
            text += f" You can narrow things down by {' or '.join(refine)}."
        return text

    # ------------------------------------------------------------------ listing drafts
    def draft_listing(self, kind: str, text: str, tax: Taxonomy) -> DraftResult:
        raw = clean(text)
        low = raw.lower()
        tokens = tokenize(low)
        city, _ = _find_cities(low, tax)
        locality, _ = _find_locality(low, tax)
        phone = _PHONE.search(raw)
        email = _EMAIL.search(raw)
        fields: dict = {}
        if city:
            fields["city"] = city
        if locality:
            fields["locality"] = locality
        if phone:
            fields["phone"] = phone.group(0).strip()
        if email:
            fields["email"] = email.group(0)
        sentences = [s.strip() for s in re.split(r"(?<=[.!?])\s+", raw) if s.strip()]
        description = " ".join(s[0].upper() + s[1:] if s else s for s in sentences)
        if description and description[-1] not in ".!?":
            description += "."
        short = (sentences[0] if sentences else raw)[:160]

        if kind == "property":
            return self._draft_property(raw, low, tokens, tax, fields, description, short)
        if kind == "marketplace":
            return self._draft_market(raw, low, tokens, tax, fields, description, short)
        return self._draft_business(raw, low, tokens, tax, fields, description, short, city, locality)

    def _draft_business(self, raw, low, tokens, tax, fields, description, short, city, locality) -> DraftResult:
        cat = _best_category(tokens, low, BUSINESS_CATEGORY_WORDS, tax.business_categories) or ""
        m = re.search(r"\b(?:called|named)\s+([A-Z][\w&'.-]*(?:\s+[A-Z&][\w&'.-]*){0,5})", raw)
        place = city or locality
        if m:
            title = m.group(1).strip()
        elif cat:
            title = f"{cat}{'' if cat.endswith('Services') else ' Services'}" + (f" in {place}" if place else "")
        else:
            title = (short[:80] or "New listing")
        if re.search(r"\b(?:i am|i'm|as) an? (?:independent |freelance )?(?:ca|chartered|lawyer|advocate|doctor|consultant|tutor|freelancer)\b", low):
            fields["kind"] = "professional"
        words = BUSINESS_CATEGORY_WORDS.get(cat, set())
        tags = []
        for t in tokens:
            if t in words and len(t) > 2:
                tag = t.upper() if t in {"gst", "itr", "tds", "seo"} else t.title()
                if tag not in tags:
                    tags.append(tag)
        for extra in (city, locality, cat):
            if extra and extra not in tags:
                tags.append(extra)
        pm = re.search(r"(?:from|starting(?: at| from)?|rates?(?: start)?(?: at| from)?)\s*" + _AMT, low)
        if pm:
            v = _amount(pm.group(1), pm.group(2))
            if v:
                fields["priceMin"] = v
        missing = []
        if "priceMin" not in fields and not re.search(r"₹|\brs\b|\binr\b|\bprice|\bcharge|\brate", low):
            missing.append("Service pricing")
        if not re.search(r"\b(mon|tue|wed|thu|fri|sat|sun|weekday|weekend|daily|am|pm|hours|open|available|availability)\b", low):
            missing.append("Availability")
        if "phone" not in fields and "email" not in fields:
            missing.append("Contact details")
        if not locality and not re.search(r"\b(street|road|rd|lane|nagar|building|floor|shop no|office no)\b", low):
            missing.append("Business address")
        return DraftResult("business", title[:160], description, short, cat, tags[:8], fields, missing)

    def _draft_property(self, raw, low, tokens, tax, fields, description, short) -> DraftResult:
        tokset = set(tokens)
        m = re.search(r"\b(\d)\s*(?:bhk|bed(?:room)?s?)\b", low)
        beds = int(m.group(1)) if m else (1 if "studio" in tokset else None)
        if beds is not None:
            fields["bedrooms"] = beds
        mb = re.search(r"\b(\d)\s*(?:bath(?:room)?s?)\b", low)
        if mb:
            fields["bathrooms"] = int(mb.group(1))
        ma = re.search(r"([\d,]{3,7})\s*(?:sq\.?\s?ft|sqft|square feet|sft)", low)
        if ma:
            fields["areaSqft"] = int(ma.group(1).replace(",", ""))
        ptype = next((p for p in PROPERTY_TYPES if p.lower() in low), "Apartment" if tokset & {"flat", "apartment", "bhk"} else "")
        if ptype:
            fields["propertyType"] = ptype
        ltype = "sale" if (tokset & SALE_WORDS and not tokset & RENT_WORDS) else "shared" if tokset & SHARED_WORDS else \
            "commercial" if tokset & COMMERCIAL_WORDS else "rent"
        fields["listingType"] = ltype
        fields["pricePeriod"] = "total" if ltype == "sale" else "month"
        pm = re.search(r"(?:₹|rs\.?|inr)\s*([\d,]+(?:\.\d+)?)\s*(k|lakhs?|lacs?|l|crores?|cr)?|([\d,]+(?:\.\d+)?)\s*(lakhs?|lacs?|crores?|cr|k)\b", low)
        if pm:
            v = _amount(pm.group(1) or pm.group(3), pm.group(2) or pm.group(4))
            if v:
                fields["price"] = v
        for f, pat in (("Semi-furnished", r"semi[- ]?furnished"), ("Unfurnished", r"un[- ]?furnished"),
                       ("Furnished", r"(?<![\w-])(?:fully[- ])?furnished")):  # most specific first
            if re.search(pat, low):
                fields["furnishing"] = f
                break
        loc = fields.get("locality") or fields.get("city")
        title = f"{str(beds) + ' BHK ' if beds else ''}{ptype or 'Property'} for {'Sale' if ltype == 'sale' else 'Rent'}" + (f" in {loc}" if loc else "")
        tags = [t for t in ("parking", "lift", "gym", "balcony", "security", "garden", "swimming pool") if t in low]
        missing = []
        if "price" not in fields:
            missing.append("Price")
        if "areaSqft" not in fields:
            missing.append("Area (sqft)")
        if "furnishing" not in fields:
            missing.append("Furnishing")
        if not fields.get("locality"):
            missing.append("Locality")
        return DraftResult("property", title[:200], description, short, ptype or "Apartment", [t.title() for t in tags], fields, missing)

    def _draft_market(self, raw, low, tokens, tax, fields, description, short) -> DraftResult:
        cat = _best_category(tokens, low, MARKETPLACE_CATEGORY_WORDS, tax.market_categories) or ("Other" if "Other" in tax.market_categories else "")
        if re.search(r"\b(like new|barely used|hardly used|mint)\b", low):
            fields["condition"] = "Like New"
        elif re.search(r"\b(brand new|unused|sealed)\b", low):
            fields["condition"] = "New"
        elif re.search(r"\b(fair|worn|scratches|scratched)\b", low):
            fields["condition"] = "Fair"
        elif re.search(r"\b(good|working|well maintained|slightly used)\b", low):
            fields["condition"] = "Good"
        if re.search(r"\b(negotiable|nego|bargain|best offer|or nearest offer)\b", low):
            fields["negotiable"] = True
        pm = re.search(r"(?:₹|rs\.?|inr)\s*([\d,]+(?:\.\d+)?)\s*(k)?|([\d,]+(?:\.\d+)?)\s*(k)\b", low)
        if pm:
            v = _amount(pm.group(1) or pm.group(3), pm.group(2) or pm.group(4))
            if v is not None:
                fields["price"] = v
        first = re.split(r"[.,;\n]|\bfor\b|\bat\b|₹", raw)[0].strip()
        title = (first[0].upper() + first[1:])[:80] if first else "New item"
        missing = []
        if "price" not in fields:
            missing.append("Price")
        if "condition" not in fields:
            missing.append("Condition")
        if not fields.get("locality") and not fields.get("city"):
            missing.append("Pickup location")
        return DraftResult("marketplace", title, description, short, cat, [], fields, missing)
