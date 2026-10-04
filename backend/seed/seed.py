"""Seed the database with clearly-marked SAMPLE data so the UI is not empty.

Usage (from backend/):   python -m seed.seed [--reset]

Credentials are never hardcoded: set ADMIN_EMAIL / ADMIN_PASSWORD / SEED_PASSWORD in .env, or let this script
generate random passwords and print them once.
"""
from __future__ import annotations

import argparse
import secrets
from datetime import datetime, timedelta, timezone

from sqlalchemy import delete, func, select
from sqlalchemy.orm import Session

from app.ai.lexicon import BUSINESS_CATEGORIES_SEED, MARKETPLACE_CATEGORIES_SEED
from app.core.config import get_settings
from app.core.security import hash_password
from app.database.session import SessionLocal
from app.models import (Business, BusinessService, Category, Embedding, Favorite, Inquiry, MarketplaceItem, MentorProfile,
                        Property, Report, User)
from app.services import listing_service as ls
from app.services import social_service
from app.utils.formatting import format_range

NOTE = " [Sample listing — contact details are illustrative only]"
U = "https://images.unsplash.com/"
DEMO_EMAILS = ["demo.owner@khojasphere.example", "demo.lister@khojasphere.example", "demo.seller@khojasphere.example",
               "demo.member@khojasphere.example"]


def _pw() -> str:
    return secrets.token_urlsafe(12) + "A1"


def _ago(days: float) -> datetime:
    return datetime.now(timezone.utc) - timedelta(days=days)


BUSINESSES = [
    # name, category, kind, locality, city, verification, tags, (min, max, label), short, description, services, hours, instagram, images, cover
    ("Demo Photography Studio", "Photography & Videography", "business", "Bandra West", "Mumbai", "claimed",
     ["Wedding Photography", "Events", "Videography", "Pre-wedding"], (25000, 75000, None),
     "Professional wedding and event photography services across Mumbai and Pune.",
     "Demo Photography Studio is a Mumbai-based photography and videography team specialising in weddings, corporate events, and pre-wedding shoots. Our team brings a cinematic, story-driven approach to every project.",
     [("Wedding Photography", "From ₹45,000"), ("Wedding Videography", "From ₹35,000"), ("Event Coverage", "From ₹15,000"),
      ("Pre-Wedding Shoot", "From ₹18,000")], "Mon–Sat 10:00 AM – 7:00 PM", "@demophotostudio",
     [U + "photo-1542038374657-6b562f3e9c3c?w=600&h=380&fit=crop&auto=format"],
     U + "photo-1519741497674-611481863552?w=1200&h=400&fit=crop&auto=format"),
    ("Sample Tax & Advisory", "Accountants & CAs", "professional", "Fort", "Mumbai", "pending",
     ["GST", "ITR Filing", "Business Advisory", "Audit"], (2000, 15000, None),
     "Chartered Accountancy practice offering GST, ITR filing, and business advisory.",
     "Sample Tax & Advisory provides comprehensive accounting, GST compliance, and business advisory services for SMEs and individuals.",
     [("GST Registration & Filing", "From ₹3,000"), ("ITR Filing", "From ₹2,000"), ("Company Audit", "From ₹15,000")],
     "Mon–Fri 9:30 AM – 6:00 PM", None, [U + "photo-1554224155-6726b3ff858f?w=600&h=380&fit=crop&auto=format"],
     U + "photo-1554224155-6726b3ff858f?w=1200&h=400&fit=crop&auto=format"),
    ("Demo Catering Co.", "Restaurants & Food", "business", "Andheri East", "Mumbai", "sample",
     ["Wedding Catering", "Corporate Events", "Private Parties"], (800, 2500, "₹800 – ₹2,500 per plate"),
     "Full-service catering for weddings, corporate events, and private celebrations.",
     "Demo Catering Co. offers multi-cuisine catering services for events of all sizes, from intimate gatherings to large wedding receptions.",
     [("Wedding Buffet", "From ₹1,200/plate"), ("Corporate Lunch Boxes", "From ₹300/box"), ("Live Counters", "From ₹800/counter")],
     "Mon–Sun 8:00 AM – 9:00 PM", "@democatering", [U + "photo-1547592166-23ac45744acd?w=600&h=380&fit=crop&auto=format"],
     U + "photo-1547592166-23ac45744acd?w=1200&h=400&fit=crop&auto=format"),
    ("Demo Event Management", "Event Services", "business", "Juhu", "Mumbai", "sample",
     ["Weddings", "Corporate", "Décor", "Coordination"], (50000, 500000, "₹50,000 – ₹5,00,000"),
     "Full-service event planning for weddings, corporate galas, and private celebrations.",
     "Demo Event Management plans and coordinates weddings, corporate galas and private celebrations end to end, including décor and vendor coordination.",
     [("Wedding Planning", "From ₹1,50,000"), ("Corporate Events", "From ₹50,000"), ("Décor & Styling", "From ₹40,000")],
     "Mon–Sat 10:00 AM – 7:00 PM", None, [U + "photo-1540575467063-178a50c2df87?w=600&h=380&fit=crop&auto=format"], None),
    ("Sample Legal Associates", "Legal Services", "professional", "Nariman Point", "Mumbai", "pending",
     ["Business Law", "Contracts", "Disputes"], (5000, 50000, None),
     "Business law, contracts, and dispute resolution for SMEs and startups.",
     "Sample Legal Associates advises small businesses and startups on contracts, compliance and dispute resolution.",
     [("Contract Drafting & Review", "From ₹5,000"), ("Legal Notice", "From ₹3,000"), ("Company Incorporation", "From ₹12,000")],
     "Mon–Fri 10:00 AM – 6:00 PM", None, [U + "photo-1436979858842-d82c2c9cae4f?w=600&h=380&fit=crop&auto=format"], None),
    ("Sample Family Clinic", "Healthcare", "business", "Borivali West", "Mumbai", "sample", ["General Physician", "Vaccination", "Health Checks"],
     (500, 2000, None), "Neighbourhood family clinic for routine consultations and health checks.",
     "Sample Family Clinic offers routine consultations, vaccinations and preventive health checks for families.",
     [("Consultation", "₹500"), ("Annual Health Check", "From ₹2,000")], "Mon–Sat 9:00 AM – 8:00 PM", None, [], None),
    ("Demo Web Studio", "IT Services", "business", "Powai", "Mumbai", "sample", ["Website Design", "Mobile Apps", "SEO"],
     (20000, 150000, None), "Websites and mobile apps for small businesses.",
     "Demo Web Studio designs and builds websites, e-commerce stores and mobile apps for small businesses.",
     [("Business Website", "From ₹20,000"), ("E-commerce Store", "From ₹60,000"), ("SEO Package", "From ₹8,000/month")],
     "Mon–Fri 10:00 AM – 7:00 PM", "@demowebstudio", [], None),
    ("Sample Maths Tuition Hub", "Education", "business", "Dadar", "Mumbai", "sample", ["Maths", "Science", "Exam Preparation"],
     (1500, 6000, None), "Small-batch tuition for grades 8–12.", "Sample Maths Tuition Hub runs small-batch tuition for school students with regular practice tests.",
     [("Grade 8–10 Batch", "₹1,500/month"), ("Grade 11–12 Batch", "₹3,000/month")], "Mon–Sat 4:00 PM – 9:00 PM", None, [], None),
    ("Demo Holiday Planners", "Travel", "business", "Andheri West", "Mumbai", "sample", ["Holiday Packages", "Visa Help", "Group Tours"],
     (15000, 200000, None), "Custom holiday packages, visa help and group tours.",
     "Demo Holiday Planners puts together domestic and international holiday packages and helps with visa paperwork.",
     [("Domestic Package", "From ₹15,000"), ("International Package", "From ₹60,000"), ("Visa Assistance", "From ₹3,000")],
     "Mon–Sat 10:00 AM – 7:00 PM", None, [], None),
    ("Sample Strategy Consultants", "Consultants", "professional", "Fort", "Mumbai", "pending", ["Business Strategy", "Operations", "Startups"],
     (15000, 100000, None), "Independent consulting for small businesses and startups.",
     "Sample Strategy Consultants helps small businesses with planning, operations and growth strategy.",
     [("Strategy Workshop", "From ₹15,000"), ("Monthly Advisory", "From ₹30,000")], "By appointment", None, [], None),
    ("Demo Home Fix Services", "Home Services", "business", "Malad West", "Mumbai", "sample", ["Plumbing", "Electrical", "AC Repair"],
     (300, 3000, None), "Plumbers, electricians and AC technicians on call.",
     "Demo Home Fix Services sends vetted technicians for plumbing, electrical and AC repair.",
     [("Plumbing Visit", "From ₹300"), ("AC Service", "From ₹800"), ("Electrical Repair", "From ₹400")], "Mon–Sun 8:00 AM – 8:00 PM", None, [], None),
    ("Sample Realty Advisors", "Real Estate", "business", "Powai", "Mumbai", "sample", ["Rentals", "Resale", "Property Advice"],
     (None, None, "Brokerage as per market norms"), "Rental and resale advice across western and central Mumbai suburbs.",
     "Sample Realty Advisors helps tenants and buyers shortlist and negotiate homes.", [("Rental Search", None), ("Resale Advisory", None)],
     "Mon–Sat 10:00 AM – 7:00 PM", None, [], None),
    ("Demo Wedding Photographers Pune", "Photography & Videography", "business", "Koregaon Park", "Pune", "sample",
     ["Wedding Photography", "Candid", "Albums"], (30000, 90000, None), "Candid wedding photography in Pune and nearby.",
     "Demo Wedding Photographers Pune captures candid wedding stories with printed albums.",
     [("Wedding Day Coverage", "From ₹55,000"), ("Album Design", "From ₹8,000")], "Mon–Sat 10:00 AM – 7:00 PM", None, [], None),
    ("Sample CA Associates Pune", "Accountants & CAs", "professional", "Kothrud", "Pune", "sample", ["GST", "Bookkeeping", "TDS"],
     (1500, 12000, None), "Bookkeeping, GST and TDS compliance for small businesses.",
     "Sample CA Associates Pune handles monthly bookkeeping, GST returns and TDS filings for small businesses.",
     [("Monthly Bookkeeping", "From ₹3,000"), ("GST Returns", "From ₹1,500")], "Mon–Fri 10:00 AM – 6:00 PM", None, [], None),
    ("Demo Bakery & Café", "Restaurants & Food", "business", "Bandra West", "Mumbai", "sample", ["Bakery", "Café", "Custom Cakes"],
     (200, 1500, None), "Fresh bakes, coffee and custom celebration cakes.",
     "Demo Bakery & Café bakes fresh bread and pastries daily and takes custom cake orders.",
     [("Custom Cake", "From ₹900"), ("Breakfast Platter", "₹350")], "Mon–Sun 8:00 AM – 10:00 PM", "@demobakerycafe", [], None),
]

PROPERTIES = [
    # title, listing, ptype, price, period, locality, city, beds, baths, sqft, furnishing, poster, availability, image, ago
    ("2 BHK Apartment in Andheri West", "rent", "Apartment", 45000, "month", "Andheri West", "Mumbai", 2, 2, 850, "Semi-furnished", "Owner listing",
     "Available from 1 Nov 2026", U + "photo-1545324418-cc1a3fa10c00?w=600&h=380&fit=crop&auto=format", 1),
    ("3 BHK Flat in Juhu", "rent", "Apartment", 85000, "month", "Juhu", "Mumbai", 3, 2, 1200, "Furnished", "Agent listing", "Immediately",
     U + "photo-1486325212027-8081e485255e?w=600&h=380&fit=crop&auto=format", 2),
    ("1 BHK in Borivali", "rent", "Apartment", 22000, "month", "Borivali West", "Mumbai", 1, 1, 550, "Unfurnished", "Owner listing",
     "Available from 15 Oct 2026", U + "photo-1560448204-e02f11c3d0e2?w=600&h=380&fit=crop&auto=format", 3),
    ("4 BHK Apartment for Sale in Powai", "sale", "Apartment", 18500000, "total", "Powai", "Mumbai", 4, 3, 1800, "Semi-furnished", "Agent listing",
     "Ready to move", U + "photo-1512917774080-9991f1c4c750?w=600&h=380&fit=crop&auto=format", 4),
    ("Studio Apartment in Powai", "rent", "Studio", 28000, "month", "Powai", "Mumbai", 1, 1, 420, "Furnished", "Owner listing", "Immediately", None, 5),
    ("2 BHK Flat for Sale in Borivali", "sale", "Apartment", 9500000, "total", "Borivali West", "Mumbai", 2, 2, 780, "Unfurnished", "Owner listing",
     "Ready to move", None, 6),
    ("Shared Room near Andheri Station", "shared", "Shared Room", 12000, "month", "Andheri East", "Mumbai", 1, 1, 180, "Furnished", "Owner listing",
     "Immediately", None, 2),
    ("PG for Students in Dadar", "shared", "Shared Room", 9000, "month", "Dadar", "Mumbai", 1, 1, 150, "Furnished", "Owner listing",
     "Available from 1 Nov 2026", None, 7),
    ("Office Space in Fort", "commercial", "Office", 120000, "month", "Fort", "Mumbai", None, 2, 1100, "Unfurnished", "Agent listing",
     "Immediately", None, 8),
    ("Retail Shop in Bandra", "commercial", "Shop", 150000, "month", "Bandra West", "Mumbai", None, 1, 600, "Unfurnished", "Agent listing",
     "Available from 1 Dec 2026", None, 9),
]

MARKET = [
    # title, category, price, condition, negotiable, locality, city, image, ago
    ("Used Office Chair – Ergonomic", "Furniture", 3500, "Good", True, "Andheri", "Mumbai",
     U + "photo-1555041469-a586c61ea9bc?w=600&h=380&fit=crop&auto=format", 2),
    ("Samsung 43\" Smart TV", "Electronics", 18000, "Like New", False, "Bandra", "Mumbai",
     U + "photo-1593359677879-a4bb92f4ffe2?w=600&h=380&fit=crop&auto=format", 5),
    ("Wooden Bookshelf – 5 Tier", "Furniture", 2200, "Good", True, "Goregaon", "Mumbai",
     U + "photo-1507003211169-0a1dd7228f2d?w=600&h=380&fit=crop&auto=format", 7),
    ("DSLR Camera Kit – Canon 200D", "Electronics", 32000, "Fair", True, "Malad", "Mumbai",
     U + "photo-1516035069371-29a1b244cc32?w=600&h=380&fit=crop&auto=format", 3),
    ("Study Desk with Drawers", "Furniture", 6500, "Good", True, "Powai", "Mumbai", None, 4),
    ("Engineering Maths Textbook Set", "Books", 1800, "Good", True, "Dadar", "Mumbai", None, 6),
    ("Pressure Cooker 5L", "Household", 900, "Like New", False, "Borivali", "Mumbai", None, 1),
    ("HP LaserJet Office Printer", "Office Equipment", 4500, "Fair", True, "Fort", "Mumbai", None, 8),
    ("3-Seater Fabric Sofa", "Furniture", 12000, "Good", True, "Juhu", "Mumbai", None, 10),
]

MENTORS = [
    ("Ali Reza Devjani", "Postgraduate admissions mentor", ["Applications", "Scholarships", "Personal statements"],
     "MSc, University College London", "Video or chat", "Weekday evenings",
     "/mentors/ali.jpg"),
     #"https://images.unsplash.com/photo-1770235621081-030607a06cee?auto=format&fit=crop&w=400&q=85"),
    ("Abbas Al  i Handia", "Engineering and career mentor", ["Engineering", "Career planning", "Interview prep"],
     "BTech, Computer Engineering", "Video", "Saturday mornings",
     "/mentors/abbas.jpg"),
    ("Hussain ladak", "Study skills mentor", ["Study plans", "Exam preparation", "Time management"], "MA, Education", "Chat or video",
     "Sunday afternoons", "/mentors/ladak.jpg"),
]


def _user(db, name, email, pw, account_type, city="Mumbai", role="user") -> User:
    u = db.scalar(select(User).where(User.email == email))
    if u:
        return u
    u = User(name=name, email=email, password_hash=hash_password(pw), account_type=account_type, city=city, role=role)
    db.add(u)
    db.flush()
    return u


def reset_sample_data(db: Session) -> None:
    for model in (Business, Property, MarketplaceItem):
        et = {"Business": "business", "Property": "property", "MarketplaceItem": "marketplace"}[model.__name__]
        ids = list(db.scalars(select(model.id).where(model.is_sample.is_(True))).all())
        if ids:
            for table in (Favorite, Embedding, Report):
                db.execute(delete(table).where(table.entity_type == et, table.entity_id.in_(ids)))
            db.execute(delete(model).where(model.id.in_(ids)))
    db.execute(delete(Inquiry).where(Inquiry.sender_id.in_(select(User.id).where(User.email.in_(DEMO_EMAILS)))))
    db.execute(delete(MentorProfile).where(MentorProfile.is_sample.is_(True)))
    db.commit()


def run(db: Session, *, admin_email: str, admin_password: str, demo_password: str, reset: bool = False) -> dict:
    if reset:
        reset_sample_data(db)
    # categories
    for i, (name, icon) in enumerate(BUSINESS_CATEGORIES_SEED):
        if not db.scalar(select(Category).where(Category.kind == "business", Category.name == name)):
            db.add(Category(kind="business", name=name, icon=icon, sort_order=i))
    for i, name in enumerate(MARKETPLACE_CATEGORIES_SEED):
        if not db.scalar(select(Category).where(Category.kind == "marketplace", Category.name == name)):
            db.add(Category(kind="marketplace", name=name, sort_order=i))
    db.flush()

    admin = _user(db, "KhojaSphere Admin", admin_email, admin_password, "member", role="admin")
    owner = _user(db, "Demo Business Owner", DEMO_EMAILS[0], demo_password, "business")
    lister = _user(db, "Demo Property Lister", DEMO_EMAILS[1], demo_password, "property")
    seller = _user(db, "Demo Seller", DEMO_EMAILS[2], demo_password, "seller")
    member = _user(db, "Demo Member", DEMO_EMAILS[3], demo_password, "member")

    if db.scalar(select(func.count()).select_from(Business).where(Business.is_sample.is_(True))):
        db.commit()
        return {"seeded": False, "admin": admin.email, "demo_users": DEMO_EMAILS}

    biz = []
    for i, (name, cat, kind, loc, city, ver, tags, (pmin, pmax, plabel), short, desc, services, hours, insta, imgs, cover) in enumerate(BUSINESSES):
        b = Business(owner_id=owner.id, kind=kind, name=name, category=cat, short_desc=short, description=desc + NOTE, city=city,
                     locality=loc, phone="+91 98765 XXXXX", email=f"hello@{name.lower().split()[0]}-{i}.example",
                     website=f"{name.lower().replace(' ', '-').replace('&', 'and').replace('.', '')}.example", instagram=insta, hours=hours,
                     price_min=pmin, price_max=pmax, price_label=plabel or format_range(pmin, pmax) or None, tags=tags, images=imgs,
                     cover_image=cover, verification=ver, status="approved", is_sample=True, view_count=0,
                     created_at=_ago(14 - i * 0.5))
        for pos, (sname, sprice) in enumerate(services):
            b.services.append(BusinessService(name=sname, price_label=sprice, position=pos))
        b.search_text = ls.business_search_text(b)
        db.add(b)
        biz.append(b)
    props = []
    for (title, lt, pt, price, period, loc, city, beds, baths, sqft, furn, poster, avail, img, ago) in PROPERTIES:
        p = Property(owner_id=lister.id, title=title, description=f"{title}. Sample listing for demonstration only.", listing_type=lt,
                     property_type=pt, price=price, price_period=period, city=city, locality=loc, bedrooms=beds, bathrooms=baths,
                     area_sqft=sqft, furnishing=furn, amenities=["Lift", "Parking"] if lt in ("rent", "sale") else [],
                     images=[img] if img else [], poster_type=poster, availability=avail, status="active", is_sample=True,
                     created_at=_ago(ago))
        p.search_text = ls.property_search_text(p)
        db.add(p)
        props.append(p)
    items = []
    for (title, cat, price, cond, nego, loc, city, img, ago) in MARKET:
        m = MarketplaceItem(seller_id=seller.id, title=title, description=f"{title}. Sample listing for demonstration only.", category=cat,
                            price=price, negotiable=nego, condition=cond, city=city, locality=loc, images=[img] if img else [],
                            status="active", is_sample=True, created_at=_ago(ago))
        m.search_text = ls.market_search_text(m)
        db.add(m)
        items.append(m)
    for (name, headline, expertise, edu, fmt, avail, img) in MENTORS:
        m = MentorProfile(name=name, headline=headline, expertise=expertise, education=edu, format=fmt, availability=avail,
                          image_url=img, status="approved", is_sample=True)
        m.search_text = social_service.mentor_search_text(m)
        db.add(m)
    db.flush()

    # a few reports and inquiries so the admin/dashboard screens have something to show
    by_name = {b.name: b for b in biz}
    db.add_all([
        Report(reporter_id=member.id, entity_type="business", entity_id=by_name["Demo Event Management"].id,
               entity_title="Demo Event Management", reason="Incorrect contact info", status="pending", created_at=_ago(1)),
        Report(reporter_id=member.id, entity_type="property", entity_id=props[0].id, entity_title=props[0].title,
               reason="Photos do not match listing", status="under_review", created_at=_ago(2)),
        Report(reporter_id=member.id, entity_type="marketplace", entity_id=items[0].id, entity_title=items[0].title,
               reason="Suspected duplicate listing", status="resolved", created_at=_ago(3)),
        Report(reporter_id=member.id, entity_type="business", entity_id=by_name["Sample Legal Associates"].id,
               entity_title="Sample Legal Associates", reason="Missing business details", status="pending", created_at=_ago(4)),
    ])
    first = biz[0]
    db.add_all([
        Inquiry(sender_id=member.id, receiver_id=owner.id, target_type="business", target_id=first.id, target_title=first.name,
                sender_name="Demo Member", message="Hi, I am interested in wedding photography services for November. Could you share your packages?",
                status="unread", created_at=_ago(0.1)),
        Inquiry(sender_id=member.id, receiver_id=owner.id, target_type="business", target_id=first.id, target_title=first.name,
                sender_name="Demo Member", message="Do you cover events in Pune as well?", status="read", created_at=_ago(1)),
    ])
    db.add(Favorite(user_id=member.id, entity_type="business", entity_id=first.id))
    db.commit()
    return {"seeded": True, "admin": admin.email, "demo_users": DEMO_EMAILS}


def main() -> None:
    ap = argparse.ArgumentParser(description="Seed KhojaSphere with sample data")
    ap.add_argument("--reset", action="store_true", help="delete existing sample data first, then re-seed")
    args = ap.parse_args()
    s = get_settings()
    admin_email = s.admin_email or "admin@khojasphere.example"
    admin_pw, demo_pw = s.admin_password or _pw(), s.seed_password or _pw()
    generated = []
    if not s.admin_password:
        generated.append(("admin", admin_email, admin_pw))
    if not s.seed_password:
        generated.append(("demo users (all)", ", ".join(DEMO_EMAILS), demo_pw))
    with SessionLocal() as db:
        res = run(db, admin_email=admin_email, admin_password=admin_pw, demo_password=demo_pw, reset=args.reset)
        try:  # semantic index is optional
            from app.services import embedding_service
            idx = embedding_service.reindex_all(db)
        except Exception:  # noqa: BLE001
            idx = {"indexed": 0, "available": False}
    print("Seed complete." if res["seeded"] else "Sample data already present (use --reset to rebuild). Accounts ensured.")
    print(f"Semantic index: {'indexed ' + str(idx['indexed']) if idx.get('available') else 'skipped (no embedding model available)'}")
    for who, email, pw in generated:
        print(f"  {who}: {email}   password: {pw}   <- generated, shown once; set ADMIN_PASSWORD / SEED_PASSWORD in .env to choose your own")
    if not generated:
        print(f"  admin: {admin_email} / demo users: {', '.join(DEMO_EMAILS)} (passwords from .env)")


if __name__ == "__main__":
    main()
