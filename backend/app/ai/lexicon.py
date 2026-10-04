"""Shared vocabulary for keyword search and the rule-based (no-LLM) query parser.

This is deliberately plain data so that discovery works well even when no AI model is running.
"""
from __future__ import annotations

STOPWORDS = {
    "a", "an", "the", "and", "or", "of", "for", "to", "in", "on", "at", "by", "with", "from", "near", "me", "my",
    "i", "we", "you", "is", "are", "be", "can", "could", "would", "should", "please", "find", "show", "need", "want",
    "looking", "look", "get", "give", "help", "who", "which", "that", "this", "some", "any", "available", "there",
    "do", "does", "have", "has", "also", "around", "within", "under", "below", "above", "over", "than", "less",
    "more", "up", "upto", "best", "good", "top", "nearby", "s", "im", "ive", "what", "where", "about", "works",
    "work", "small", "affordable", "cheap", "budget", "event", "events", "business", "businesses", "services", "service",
}

# canonical business category -> trigger words
BUSINESS_CATEGORY_WORDS: dict[str, set[str]] = {
    "Photography & Videography": {"photographer", "photographers", "photography", "photo", "photos", "videographer",
                                  "videography", "video", "cinematographer", "prewedding", "pre-wedding"},
    "Accountants & CAs": {"ca", "cas", "accountant", "accountants", "accounting", "gst", "itr", "tax", "taxes",
                          "audit", "chartered", "bookkeeping", "tds"},
    "Legal Services": {"lawyer", "lawyers", "legal", "advocate", "attorney", "law", "contract", "contracts",
                       "litigation", "notary"},
    "Healthcare": {"doctor", "doctors", "clinic", "hospital", "dentist", "physiotherapist", "physio", "health",
                   "healthcare", "medical", "pharmacy"},
    "Restaurants & Food": {"restaurant", "restaurants", "food", "catering", "caterer", "caterers", "cafe", "bakery",
                           "chef", "tiffin", "biryani", "meals"},
    "Event Services": {"planner", "planners", "decorator", "decorators", "decor", "decoration", "emcee", "organizer",
                       "organiser", "dj", "mehendi", "mehndi"},
    "Real Estate": {"broker", "brokers", "realtor", "agent", "agents", "realty"},
    "IT Services": {"developer", "developers", "software", "website", "programmer", "tech", "seo", "designer",
                    "devops", "cloud"},
    "Education": {"tutor", "tutors", "tuition", "teacher", "coaching", "classes", "school", "academy", "education",
                  "training"},
    "Travel": {"travel", "tour", "tours", "trip", "visa", "flights", "holiday", "umrah", "hajj"},
    "Consultants": {"consultant", "consultants", "consulting", "advisor", "advisory", "strategy", "coach"},
    "Home Services": {"plumber", "plumbers", "electrician", "electricians", "carpenter", "painter", "cleaning",
                      "repair", "ac", "pest", "handyman", "movers", "packers"},
}

MARKETPLACE_CATEGORY_WORDS: dict[str, set[str]] = {
    "Furniture": {"chair", "chairs", "sofa", "table", "desk", "bookshelf", "shelf", "bed", "wardrobe", "furniture",
                  "cupboard", "mattress"},
    "Electronics": {"tv", "television", "camera", "dslr", "laptop", "phone", "mobile", "speaker", "headphones",
                    "monitor", "electronics", "tablet", "printer", "fridge", "refrigerator", "washing"},
    "Books": {"book", "books", "novel", "textbook", "textbooks", "notes"},
    "Household": {"utensils", "cooker", "mixer", "grinder", "iron", "household", "kitchen", "vacuum", "fan"},
    "Office Equipment": {"office", "printer", "projector", "whiteboard", "cabinet", "stationery"},
}

# extra words that help matching ("photographer" should also hit "photography")
SYNONYMS: dict[str, set[str]] = {
    "photographer": {"photography", "photographers", "photo", "videography"},
    "photographers": {"photography", "photographer"},
    "videographer": {"videography", "video"},
    "ca": {"chartered", "accountant", "accountants", "accounting", "gst", "tax"},
    "accountant": {"accounting", "accountants", "ca", "tax"},
    "lawyer": {"legal", "advocate", "law"},
    "caterer": {"catering", "food"},
    "caterers": {"catering"},
    "plumber": {"plumbing"},
    "electrician": {"electrical"},
    "tutor": {"tuition", "coaching", "teacher"},
    "doctor": {"clinic", "physician", "healthcare"},
    "planner": {"planning", "management", "coordination"},
    "flat": {"apartment"},
    "apartment": {"flat"},
    "tv": {"television"},
}

PROPERTY_WORDS = {"rent", "rental", "rentals", "lease", "flat", "flats", "apartment", "apartments", "bhk", "house",
                  "villa", "studio", "penthouse", "pg", "property", "properties", "accommodation", "room", "rooms",
                  "roommate", "flatmate", "office space", "shop", "commercial"}
SALE_WORDS = {"buy", "purchase", "sale", "own"}
RENT_WORDS = {"rent", "rental", "rentals", "lease", "monthly"}
SHARED_WORDS = {"shared", "pg", "roommate", "roommates", "flatmate", "hostel", "sharing"}
COMMERCIAL_WORDS = {"commercial", "office", "shop", "showroom", "warehouse"}
MARKET_WORDS = {"used", "secondhand", "second-hand", "preowned", "pre-owned", "sell", "selling", "marketplace"}
PROFESSIONAL_WORDS = {"professional", "professionals", "freelancer", "freelancers", "independent"}

PROPERTY_TYPES = ["Apartment", "Villa", "Studio", "Penthouse", "Row House", "Office", "Shop", "Shared Room"]
FURNISHING = ["Furnished", "Semi-furnished", "Unfurnished"]
CONDITIONS = ["New", "Like New", "Good", "Fair"]
LISTING_TYPES = ["rent", "sale", "shared", "commercial"]

CITY_ALIASES = {"bombay": "Mumbai", "bangalore": "Bengaluru", "poona": "Pune", "navi mumbai": "Navi Mumbai"}
DEFAULT_CITIES = ["Mumbai", "Pune", "Delhi", "Bengaluru", "Ahmedabad", "Hyderabad", "Chennai", "Thane", "Navi Mumbai"]
DEFAULT_LOCALITIES = ["Bandra", "Andheri", "Juhu", "Fort", "Powai", "Borivali", "Malad", "Goregaon", "Dadar",
                      "Colaba", "Nariman Point", "Worli", "Kurla", "Mulund", "Vile Parle", "Santacruz"]

BUSINESS_CATEGORIES_SEED = [
    ("Accountants & CAs", "calculator"), ("Legal Services", "scale"), ("Healthcare", "activity"),
    ("Restaurants & Food", "utensils"), ("Photography & Videography", "camera"), ("Event Services", "calendar"),
    ("Real Estate", "building"), ("IT Services", "monitor"), ("Education", "book"), ("Travel", "plane"),
    ("Consultants", "briefcase"), ("Home Services", "wrench"),
]
MARKETPLACE_CATEGORIES_SEED = ["Furniture", "Electronics", "Books", "Household", "Office Equipment", "Other"]


def expand_tokens(tokens: list[str]) -> list[str]:
    out: list[str] = []
    for t in tokens:
        out.append(t)
        out.extend(sorted(SYNONYMS.get(t, ())))
    seen: set[str] = set()
    return [t for t in out if not (t in seen or seen.add(t))]
