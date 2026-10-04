from __future__ import annotations


def s(client, **params):
    r = client.get("/api/search", params=params)
    assert r.status_code == 200, r.text
    return r.json()


def names(res):
    return [i["name"] for i in res["items"]]


def test_keyword_search_across_types(client, seeded):
    res = s(client, q="wedding", ai="false")
    kinds = {i["type"] for i in res["items"]}
    assert "business" in kinds and res["total"] >= 3
    assert "Demo Photography Studio" in names(res)
    assert s(client, q="zzzzqqqq", ai="false")["total"] == 0


def test_filters_category_city_locality_type(client, seeded):
    assert all(i["category"] == "Accountants & CAs" for i in s(client, category="Accountants & CAs")["items"])
    pune = s(client, city="Pune")
    assert pune["total"] >= 2 and all("Pune" in i["location"] for i in pune["items"])
    loc = s(client, locality="Bandra", type="business")
    assert loc["total"] >= 2 and all("Bandra" in i["location"] for i in loc["items"])
    assert {i["type"] for i in s(client, type="professional")["items"]} == {"professional"}
    assert {i["type"] for i in s(client, type="property")["items"]} == {"property"}
    assert {i["type"] for i in s(client, type="marketplace")["items"]} == {"marketplace"}
    assert {i["category"] for i in s(client, category="Furniture")["items"]} == {"Furniture"}  # marketplace category implies marketplace


def test_budget_filters(client, seeded):
    lo = s(client, type="marketplace", price_max=5000)
    assert lo["total"] >= 2 and all(int(i["priceRange"].replace("₹", "").replace(",", "")) <= 5000 for i in lo["items"])
    biz = s(client, type="business", price_min=100000)  # ranges overlapping "above 1L"
    assert biz["total"] >= 1 and "Demo Event Management" in names(biz)
    assert "Demo Photography Studio" not in names(biz)  # 25k-75k does not overlap


def test_pagination_and_sorting(client, seeded):
    p1, p2 = s(client, limit=5, page=1), s(client, limit=5, page=2)
    assert len(p1["items"]) == 5 and p1["total"] > 5 and p1["pages"] >= 2
    assert not ({(i["type"], i["id"]) for i in p1["items"]} & {(i["type"], i["id"]) for i in p2["items"]})
    az = names(s(client, type="business", sort="name", limit=50))
    assert az == sorted(az, key=str.lower)
    far = s(client, limit=5, page=999)
    assert far["items"] == [] and far["total"] > 0


def test_natural_language_queries_without_ai(client, seeded):
    r = s(client, q="Find a photographer for an event in Mumbai")
    assert "Demo Photography Studio" in names(r) and "Mumbai" in r["filters"] and r["provider"] == "fallback"
    assert "Demo Wedding Photographers Pune" not in names(r)  # city interpreted as a filter
    r = s(client, q="CA for GST")
    assert r["total"] >= 2 and all("CA" in i["name"] or "Tax" in i["name"] for i in r["items"])
    r = s(client, q="Rental apartments in Andheri")
    assert r["total"] >= 1 and all(i["type"] == "property" and "Andheri" in i["location"] for i in r["items"])
    r = s(client, q="2BHK flats for rent under 50k")
    assert r["total"] >= 1 and "Under ₹50,000" in r["filters"] and all(i["type"] == "property" for i in r["items"])
    r = s(client, q="used office furniture")
    assert r["total"] >= 3 and {i["category"] for i in r["items"]} == {"Furniture"}
    r = s(client, q="4 BHK for sale in Powai above 1 crore")
    assert names(r) == ["4 BHK Apartment for Sale in Powai"]
    r = s(client, q="cheap sofa")
    assert "Lowest price first" in r["filters"]


def test_explicit_filters_override_parsed_ones(client, seeded):
    r = s(client, q="photographer in Mumbai", city="Pune")
    assert names(r) == ["Demo Wedding Photographers Pune"]


def test_query_relaxation(client, seeded):
    r = s(client, q="photographer in Andheri")  # nobody in Andheri: falls back to the category elsewhere
    assert r["total"] >= 1 and r["relaxed"] is True
    assert s(client, q="photographer", ai="false")["relaxed"] is False
    assert s(client, q="qwertyuiop asdfghjkl")["total"] == 0  # never degrades to "return everything"


def test_search_hides_non_public_listings(client, make_user, seeded):
    u = make_user("Hidden")
    client.post("/api/businesses", headers=u["headers"], json={"name": "Secret Draft Studio", "category": "Healthcare"})
    assert "Secret Draft Studio" not in names(s(client, q="secret draft studio", ai="false"))


def test_search_validation(client, seeded):
    for bad in ("limit=500", "page=0", "type=castle", "sort=chaos", "price_min=-1", "price_min=10&price_max=5"):
        assert client.get(f"/api/search?{bad}").status_code == 422, bad


def test_categories_and_stats_are_live(client, seeded):
    cats = client.get("/api/categories?kind=business").json()
    assert len(cats) == 12 and sum(c["count"] for c in cats) == client.get("/api/stats").json()["businesses"]
    assert {c["name"] for c in client.get("/api/categories?kind=marketplace").json()} >= {"Furniture", "Electronics"}
