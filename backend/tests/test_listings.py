from __future__ import annotations

BIZ = {"name": "Moon Bakery", "category": "Restaurants & Food", "description": "Fresh bread, cakes and pastries baked daily.",
       "city": "Mumbai", "locality": "Bandra", "phone": "+91 98765 43210", "tags": ["Bakery", "Cakes"],
       "services": [{"name": "Custom cake", "price": "From ₹900"}], "priceMin": 200, "priceMax": 1500}


def test_business_lifecycle_draft_submit_approve(client, make_user, admin):
    u = make_user("Baker", account_type="business")
    h = u["headers"]
    r = client.post("/api/businesses", headers=h, json=BIZ)
    assert r.status_code == 201, r.text
    b = r.json()
    assert b["listingStatus"] == "draft" and b["isOwner"] is True and b["location"] == "Bandra, Mumbai"
    assert b["priceRange"] == "₹200 – ₹1,500" and b["services"][0]["price"] == "From ₹900"
    bid = b["id"]
    # drafts are invisible to the public and to other users, but visible to the owner
    assert client.get(f"/api/businesses/{bid}").status_code == 404
    assert client.get(f"/api/businesses/{bid}", headers=h).status_code == 200
    assert bid not in [x["id"] for x in client.get("/api/businesses?limit=50").json()["items"]]
    assert [x["id"] for x in client.get("/api/businesses/mine", headers=h).json()] == [bid]
    # submit -> pending (still hidden) -> admin approves -> public
    assert client.post(f"/api/businesses/{bid}/submit", headers=h).json()["listingStatus"] == "pending"
    assert client.get(f"/api/businesses/{bid}").status_code == 404
    assert client.post(f"/api/admin/businesses/{bid}/moderate", headers=admin, json={"action": "approve"}).json()["listingStatus"] == "approved"
    pub = client.get(f"/api/businesses/{bid}")
    assert pub.status_code == 200 and pub.json()["name"] == "Moon Bakery" and pub.json()["isOwner"] is False
    assert pub.json().get("viewCount") is None  # owner-only metric
    assert pub.json().get("ownerId") is None
    assert client.get(f"/api/businesses/{bid}", headers=h).json()["viewCount"] == 1  # public view counted, owner view not


def test_business_validation(client, make_user, seeded):
    h = make_user("Vera")["headers"]
    assert client.post("/api/businesses", headers=h, json={**BIZ, "category": "Nonsense"}).status_code == 422
    assert client.post("/api/businesses", headers=h, json={**BIZ, "priceMin": 900, "priceMax": 100}).status_code == 422
    assert client.post("/api/businesses", headers=h, json={**BIZ, "email": "bad"}).status_code == 422
    assert client.post("/api/businesses", headers=h, json={**BIZ, "images": ["ftp://x/y.png"]}).status_code == 422
    assert client.post("/api/businesses", headers=h, json={**BIZ, "tags": [str(i) for i in range(20)]}).status_code == 422
    assert client.post("/api/businesses", headers=h, json={"category": "Healthcare"}).status_code == 422  # name required
    # submitting an incomplete listing is rejected with actionable details
    r = client.post("/api/businesses", headers=h, json={"name": "Thin Listing", "category": "Healthcare", "submit": True})
    assert r.status_code == 422 and {d["field"] for d in r.json()["error"]["details"]} >= {"description", "city", "phone"}
    assert client.post("/api/businesses", json=BIZ).status_code == 401


def test_business_ownership_rules(client, make_user, admin):
    a, b = make_user("Alice"), make_user("Bob")
    bid = client.post("/api/businesses", headers=a["headers"], json=BIZ).json()["id"]
    assert client.put(f"/api/businesses/{bid}", headers=b["headers"], json={"name": "Hijacked"}).status_code == 403
    assert client.delete(f"/api/businesses/{bid}", headers=b["headers"]).status_code == 403
    assert client.post(f"/api/businesses/{bid}/submit", headers=b["headers"]).status_code == 403
    r = client.put(f"/api/businesses/{bid}", headers=a["headers"], json={"name": "Moon Bakery & Cafe", "tags": ["Cafe"],
                                                                      "services": [{"name": "Coffee", "price": "₹120"}]})
    assert r.status_code == 200 and r.json()["name"] == "Moon Bakery & Cafe" and [s["name"] for s in r.json()["services"]] == ["Coffee"]
    assert client.put(f"/api/businesses/{bid}", headers=admin, json={"hours": "Daily 8-8"}).status_code == 200  # admin override
    assert client.put("/api/businesses/99999", headers=a["headers"], json={"name": "Nope"}).status_code == 404
    assert client.delete(f"/api/businesses/{bid}", headers=a["headers"]).status_code == 200
    assert client.get(f"/api/businesses/{bid}", headers=a["headers"]).status_code == 404


def test_admin_hidden_business_not_public_and_owner_cannot_unhide(client, owner, admin):
    mine = client.get("/api/businesses/mine", headers=owner).json()
    bid = mine[0]["id"]
    assert client.get(f"/api/businesses/{bid}").status_code == 200
    client.post(f"/api/admin/businesses/{bid}/moderate", headers=admin, json={"action": "hide"})
    assert client.get(f"/api/businesses/{bid}").status_code == 404
    assert client.get(f"/api/businesses/{bid}", headers=owner).status_code == 200


PROP = {"title": "2 BHK in Powai", "listingType": "rent", "price": 55000, "propertyType": "Apartment", "bedrooms": 2,
        "bathrooms": 2, "areaSqft": 900, "furnishing": "Furnished", "city": "Mumbai", "locality": "Powai", "amenities": ["Gym", "Lift"]}


def test_property_crud_and_labels(client, make_user, admin):
    a, b = make_user("Lister"), make_user("Other")
    r = client.post("/api/properties", headers=a["headers"], json=PROP)
    assert r.status_code == 201, r.text
    p = r.json()
    assert p["price"] == "₹55,000/month" and p["area"] == "900 sqft" and p["type"] == "rent" and p["pricePeriod"] == "month"
    pid = p["id"]
    sale = client.post("/api/properties", headers=a["headers"], json={**PROP, "title": "Buy me please", "listingType": "sale", "price": 18500000}).json()
    assert sale["price"] == "₹1.85 Cr" and sale["pricePeriod"] == "total"
    assert client.put(f"/api/properties/{pid}", headers=b["headers"], json={"price": 1}).status_code == 403
    assert client.put(f"/api/properties/{pid}", headers=a["headers"], json={"price": 60000, "status": "closed"}).json()["status"] == "closed"
    assert client.get(f"/api/properties/{pid}").status_code == 404  # closed = not public
    assert client.get(f"/api/properties/{pid}", headers=a["headers"]).status_code == 200
    assert client.delete(f"/api/properties/{pid}", headers=b["headers"]).status_code == 403
    assert client.delete(f"/api/properties/{pid}", headers=a["headers"]).status_code == 200
    # validation
    assert client.post("/api/properties", headers=a["headers"], json={**PROP, "price": -5}).status_code == 422
    assert client.post("/api/properties", headers=a["headers"], json={**PROP, "propertyType": "Castle"}).status_code == 422
    assert client.post("/api/properties", headers=a["headers"], json={**PROP, "furnishing": "Plush"}).status_code == 422
    assert client.post("/api/properties", headers=a["headers"], json={**PROP, "bedrooms": 99}).status_code == 422
    assert client.post("/api/properties", json=PROP).status_code == 401


def test_marketplace_crud_and_moderation(client, make_user, admin):
    a, b = make_user("Seller"), make_user("Buyer")
    item = {"title": "Standing desk", "category": "Furniture", "price": 7000, "condition": "Good", "negotiable": True,
            "city": "Mumbai", "locality": "Malad"}
    r = client.post("/api/marketplace", headers=a["headers"], json=item)
    assert r.status_code == 201, r.text
    m = r.json()
    assert m["price"] == "₹7,000" and m["negotiable"] is True and m["posted"] == "just now"
    mid = m["id"]
    assert client.post("/api/marketplace", headers=a["headers"], json={**item, "category": "Spaceships"}).status_code == 422
    assert client.post("/api/marketplace", headers=a["headers"], json={**item, "condition": "Haunted"}).status_code == 422
    assert client.put(f"/api/marketplace/{mid}", headers=b["headers"], json={"price": 1}).status_code == 403
    assert client.put(f"/api/marketplace/{mid}", headers=a["headers"], json={"price": 6500, "status": "sold"}).json()["status"] == "sold"
    client.put(f"/api/marketplace/{mid}", headers=a["headers"], json={"status": "active"})
    # admin hides it; owner may not undo a moderator's decision
    assert client.post(f"/api/admin/listings/marketplace/{mid}/status", headers=admin, json={"status": "hidden"}).status_code == 200
    assert client.put(f"/api/marketplace/{mid}", headers=a["headers"], json={"status": "active"}).status_code == 403
    assert client.get(f"/api/marketplace/{mid}").status_code == 404
    assert client.delete(f"/api/marketplace/{mid}", headers=a["headers"]).status_code == 200


def test_list_filters_sort_and_pagination(client, seeded):
    r = client.get("/api/properties?type=rent&limit=2&page=1").json()
    assert r["total"] >= 4 and len(r["items"]) == 2 and r["pages"] == -(-r["total"] // 2)
    page2 = client.get("/api/properties?type=rent&limit=2&page=2").json()
    assert {i["id"] for i in r["items"]}.isdisjoint({i["id"] for i in page2["items"]})
    assert all(i["type"] == "rent" for i in r["items"])
    assert {i["type"] for i in client.get("/api/properties?type=shared").json()["items"]} == {"shared"}
    assert {i["type"] for i in client.get("/api/properties?type=commercial").json()["items"]} == {"commercial"}
    asc = [i["priceValue"] for i in client.get("/api/properties?type=rent&sort=price_asc").json()["items"]]
    assert asc == sorted(asc) and len(asc) > 1
    desc = [i["priceValue"] for i in client.get("/api/properties?type=rent&sort=price_desc").json()["items"]]
    assert desc == sorted(desc, reverse=True)
    assert all(i["bedrooms"] >= 4 for i in client.get("/api/properties?bedrooms=4").json()["items"])
    assert all(i["bedrooms"] == 2 for i in client.get("/api/properties?bedrooms=2").json()["items"])
    assert all(i["furnishing"] == "Furnished" for i in client.get("/api/properties?furnishing=Furnished").json()["items"])
    assert all("andheri" in i["location"].lower() for i in client.get("/api/properties?locality=Andheri").json()["items"])
    assert all(i["propertyType"] == "Studio" for i in client.get("/api/properties?property_type=Studio").json()["items"])
    mk = client.get("/api/marketplace?category=Electronics").json()
    assert mk["total"] >= 2 and {i["category"] for i in mk["items"]} == {"Electronics"}
    assert client.get("/api/marketplace?category=All").json()["total"] >= 8
    cheap = client.get("/api/marketplace?price_max=3000").json()["items"]
    assert cheap and all(i["priceValue"] <= 3000 for i in cheap)
    # bad query parameters are rejected, not passed to the database
    for bad in ("page=0", "limit=0", "limit=1000", "page=abc", "type=castle", "sort=chaos", "bedrooms=-1"):
        assert client.get(f"/api/properties?{bad}").status_code == 422, bad


def test_sql_injection_and_like_wildcards_are_inert(client, seeded):
    r = client.get("/api/businesses", params={"q": "'; DROP TABLE businesses; --"})
    assert r.status_code == 200 and r.json()["total"] == 0
    # punctuation-only input is ignored (never interpreted as a LIKE wildcard that adds a filter or breaks the query)
    assert client.get("/api/businesses", params={"q": "%"}).json()["total"] == client.get("/api/businesses").json()["total"]
    from app.utils.text import escape_like
    assert escape_like("50%_off\\") == "50\\%\\_off\\\\"
    assert client.get("/api/stats").json()["businesses"] >= 10  # table still there


def test_delete_listing_cleans_favorites(client, make_user, seeded):
    a, fan = make_user("Owner2"), make_user("Fan")
    bid = client.post("/api/businesses", headers=a["headers"], json={**BIZ, "submit": True}).json()["id"]
    # (pending listings can't be favorited)
    assert client.post("/api/favorites", headers=fan["headers"], json={"entityType": "business", "entityId": bid}).status_code == 404
    pid = client.post("/api/properties", headers=a["headers"], json=PROP).json()["id"]
    assert client.post("/api/favorites", headers=fan["headers"], json={"entityType": "property", "entityId": pid}).status_code == 201
    client.delete(f"/api/properties/{pid}", headers=a["headers"])
    assert client.get("/api/favorites/ids", headers=fan["headers"]).json()["property"] == []
