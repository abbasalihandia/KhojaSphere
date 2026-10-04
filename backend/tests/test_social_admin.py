from __future__ import annotations

from tests.conftest import png_bytes


def first_biz(client):
    return client.get("/api/businesses?limit=1&sort=name").json()["items"][0]["id"]


def test_favorites_lifecycle_and_isolation(client, make_user, seeded):
    a, b = make_user("Fav One"), make_user("Fav Two")
    bid = first_biz(client)
    pid = client.get("/api/properties").json()["items"][0]["id"]
    mid = client.get("/api/marketplace").json()["items"][0]["id"]
    for t, i in (("business", bid), ("property", pid), ("marketplace", mid)):
        assert client.post("/api/favorites", headers=a["headers"], json={"entityType": t, "entityId": i}).status_code == 201
    assert client.post("/api/favorites", headers=a["headers"], json={"entityType": "business", "entityId": bid}).status_code == 201  # idempotent
    ids = client.get("/api/favorites/ids", headers=a["headers"]).json()
    assert ids == {"business": [bid], "property": [pid], "marketplace": [mid]}
    full = client.get("/api/favorites", headers=a["headers"]).json()
    assert [x["id"] for x in full["businesses"]] == [bid] and full["properties"][0]["price"].startswith("₹")
    assert client.get("/api/favorites/ids", headers=b["headers"]).json() == {"business": [], "property": [], "marketplace": []}
    assert client.delete(f"/api/favorites/business/{bid}", headers=a["headers"]).status_code == 200
    assert client.get("/api/favorites/ids", headers=a["headers"]).json()["business"] == []
    assert client.delete(f"/api/favorites/business/{bid}", headers=a["headers"]).status_code == 200  # idempotent
    assert client.post("/api/favorites", headers=a["headers"], json={"entityType": "business", "entityId": 99999}).status_code == 404
    assert client.post("/api/favorites", headers=a["headers"], json={"entityType": "spaceship", "entityId": 1}).status_code == 422
    assert client.post("/api/favorites", json={"entityType": "business", "entityId": bid}).status_code == 401


def test_inquiry_flow_send_read_reply(client, owner, member, seeded):
    mine = client.get("/api/businesses/mine", headers=owner).json()[0]
    before = client.get("/api/inquiries/unread-count", headers=owner).json()["count"]
    r = client.post("/api/inquiries", headers=member, json={"targetType": "business", "targetId": mine["id"], "name": "Demo Member",
                                                              "message": "Do you cover weddings in Thane?", "contactMethod": "email"})
    assert r.status_code == 201 and r.json()["status"] == "unread" and r.json()["box"] == "sent"
    iid = r.json()["id"]
    assert client.get("/api/inquiries/unread-count", headers=owner).json()["count"] == before + 1
    inbox = client.get("/api/inquiries?box=received", headers=owner).json()
    assert iid in [i["id"] for i in inbox["items"]]
    assert iid not in [i["id"] for i in client.get("/api/inquiries?box=received", headers=member).json()["items"]]
    assert client.post(f"/api/inquiries/{iid}/read", headers=member).status_code == 403  # only the receiver
    assert client.post(f"/api/inquiries/{iid}/reply", headers=member, json={"text": "hax"}).status_code == 403
    assert client.post(f"/api/inquiries/{iid}/read", headers=owner).json()["status"] == "read"
    rep = client.post(f"/api/inquiries/{iid}/reply", headers=owner, json={"text": "Yes, we travel to Thane."}).json()
    assert rep["status"] == "replied" and rep["replyText"] == "Yes, we travel to Thane."
    sent = client.get("/api/inquiries?box=sent", headers=member).json()["items"]
    assert any(i["id"] == iid and i["replyText"] for i in sent)


def test_inquiry_validation_and_rules(client, owner, member, seeded):
    mine = client.get("/api/businesses/mine", headers=owner).json()[0]
    base = {"targetType": "business", "targetId": mine["id"], "name": "X Person", "message": "Hello there friend"}
    assert client.post("/api/inquiries", headers=owner, json=base).status_code == 400  # own listing
    assert client.post("/api/inquiries", headers=member, json={**base, "message": "hi"}).status_code == 422
    assert client.post("/api/inquiries", headers=member, json={**base, "contactMethod": "pigeon"}).status_code == 422
    assert client.post("/api/inquiries", headers=member, json={**base, "targetId": 99999}).status_code == 404
    assert client.post("/api/inquiries", json=base).status_code == 401
    pid = client.get("/api/properties").json()["items"][0]["id"]
    assert client.post("/api/inquiries", headers=member, json={**base, "targetType": "property", "targetId": pid}).status_code == 201


def test_reports_and_admin_actions(client, member, admin, seeded):
    bid = first_biz(client)
    r = client.post("/api/reports", headers=member, json={"entityType": "business", "entityId": bid, "reason": "Scam or fraud", "details": "Looks fake"})
    assert r.status_code == 201 and r.json()["status"] == "Pending Review" and r.json()["type"] == "Business"
    assert client.post("/api/reports", headers=member, json={"entityType": "business", "entityId": bid, "reason": "Scam or fraud"}).status_code == 409
    assert client.post("/api/reports", headers=member, json={"entityType": "business", "entityId": 99999, "reason": "Scam"}).status_code == 404
    assert client.get("/api/admin/reports", headers=member).status_code == 403
    rep = client.get("/api/admin/reports", headers=admin).json()
    assert rep["total"] >= 5
    rid = r.json()["id"]
    assert client.patch(f"/api/admin/reports/{rid}", headers=admin, json={"status": "under_review"}).json()["status"] == "Under Review"
    hid = client.patch(f"/api/admin/reports/{rid}", headers=admin, json={"hideListing": True}).json()
    assert hid["status"] == "Resolved"
    assert client.get(f"/api/businesses/{bid}").status_code == 404  # hidden from the public
    assert client.get("/api/admin/overview", headers=admin).json()["openReports"] >= 3


def test_admin_authorization(client, make_user, admin, seeded):
    u = make_user("Plain User")
    for method, path in (("get", "/api/admin/overview"), ("get", "/api/admin/users"), ("get", "/api/admin/businesses"),
                         ("get", "/api/admin/properties"), ("get", "/api/admin/marketplace"), ("get", "/api/admin/categories"),
                         ("get", "/api/admin/mentors"), ("post", "/api/admin/reindex")):
        assert getattr(client, method)(path).status_code == 401, path
        assert getattr(client, method)(path, headers=u["headers"]).status_code == 403, path
        assert getattr(client, method)(path, headers=admin).status_code == 200, path


def test_admin_user_management(client, make_user, admin):
    u = make_user("Managed")
    users = client.get("/api/admin/users?q=managed", headers=admin).json()
    assert users["total"] == 1 and users["items"][0]["isActive"] is True
    assert client.patch(f"/api/admin/users/{u['id']}", headers=admin, json={"role": "admin"}).json()["role"] == "admin"
    me = client.get("/api/auth/me", headers=admin).json()
    assert client.patch(f"/api/admin/users/{me['id']}", headers=admin, json={"isActive": False}).status_code == 400  # no self lock-out
    assert client.patch(f"/api/admin/users/{me['id']}", headers=admin, json={"role": "user"}).status_code == 400
    assert client.patch("/api/admin/users/99999", headers=admin, json={"isActive": False}).status_code == 404
    assert client.patch(f"/api/admin/users/{u['id']}", headers=admin, json={"role": "superuser"}).status_code == 422


def test_admin_listing_management(client, admin, seeded):
    assert client.get("/api/admin/businesses?status=pending", headers=admin).json()["total"] == 0
    props = client.get("/api/admin/properties", headers=admin).json()
    pid = props["items"][0]["id"]
    assert client.post(f"/api/admin/listings/property/{pid}/status", headers=admin, json={"status": "hidden"}).status_code == 200
    assert client.get(f"/api/properties/{pid}").status_code == 404
    assert client.post(f"/api/admin/listings/property/{pid}/status", headers=admin, json={"status": "bogus"}).status_code == 422
    assert client.delete(f"/api/admin/listings/property/{pid}", headers=admin).status_code == 200
    assert client.delete(f"/api/admin/listings/property/{pid}", headers=admin).status_code == 404


def test_admin_categories_crud(client, admin, seeded):
    r = client.post("/api/admin/categories", headers=admin, json={"kind": "business", "name": "Pet Care", "icon": "briefcase"})
    assert r.status_code == 201
    cid = r.json()["id"]
    assert client.post("/api/admin/categories", headers=admin, json={"kind": "business", "name": "pet care"}).status_code == 409
    assert "Pet Care" in [c["name"] for c in client.get("/api/categories?kind=business").json()]
    client.patch(f"/api/admin/categories/{cid}", headers=admin, json={"isActive": False})
    assert "Pet Care" not in [c["name"] for c in client.get("/api/categories?kind=business").json()]
    assert client.delete(f"/api/admin/categories/{cid}", headers=admin).status_code == 200
    # a category in use cannot be deleted, but renaming it keeps its listings attached
    used = next(c for c in client.get("/api/admin/categories", headers=admin).json() if c["name"] == "Healthcare")
    assert client.delete(f"/api/admin/categories/{used['id']}", headers=admin).status_code == 409
    client.patch(f"/api/admin/categories/{used['id']}", headers=admin, json={"name": "Health & Wellness"})
    assert any(i["category"] == "Health & Wellness" for i in client.get("/api/businesses?category=Health%20%26%20Wellness").json()["items"])


def test_mentors_listing_request_and_profile_review(client, make_user, admin, seeded):
    u = make_user("Mentee")
    ms = client.get("/api/mentors", headers=u["headers"]).json()
    assert ms["total"] == 3 and all(m["requested"] is False for m in ms["items"])
    assert client.get("/api/mentors?q=scholarship").json()["total"] == 1
    mid = ms["items"][0]["id"]
    r = client.post(f"/api/mentors/{mid}/request", headers=u["headers"], json={})
    assert r.status_code == 201
    assert client.post(f"/api/mentors/{mid}/request", headers=u["headers"], json={}).status_code == 409
    assert next(m for m in client.get("/api/mentors", headers=u["headers"]).json()["items"] if m["id"] == mid)["requested"] is True
    assert client.post(f"/api/mentors/{mid}/request", json={}).status_code == 401
    # a real mentor registers a profile -> pending -> invisible until an admin approves it
    m = make_user("Real Mentor", account_type="mentor")
    prof = {"headline": "Career coach", "expertise": ["Careers", "CVs"], "education": "MBA", "format": "Video", "availability": "Evenings"}
    saved = client.put("/api/mentors/me", headers=m["headers"], json=prof).json()
    assert saved["status"] == "pending"
    assert client.get("/api/mentors").json()["total"] == 3
    assert client.get("/api/admin/mentors?status=pending", headers=admin).json()["total"] == 1
    assert client.post(f"/api/admin/mentors/{saved['id']}/moderate", headers=admin, json={"action": "approve"}).json()["status"] == "approved"
    assert client.get("/api/mentors?q=careers").json()["total"] == 1
    # requests to a real mentor land in their inbox
    client.post(f"/api/mentors/{saved['id']}/request", headers=u["headers"], json={"message": "Can you review my CV?"})
    inbox = client.get("/api/inquiries?box=received", headers=m["headers"]).json()
    assert inbox["total"] == 1 and inbox["items"][0]["message"] == "Can you review my CV?"
    assert client.put("/api/mentors/me", headers=m["headers"], json={**prof, "expertise": []}).status_code == 422
    assert client.get("/api/mentors/me", headers=u["headers"]).json() is None


def test_dashboard_summary(client, owner, seeded):
    d = client.get("/api/dashboard/summary", headers=owner).json()
    assert d["activeListings"] >= 10 and d["newInquiries"] == 1 and d["activity"]
    assert any("sent an inquiry" in a["text"] for a in d["activity"])


def test_upload_validation(client, make_user):
    h = make_user("Uploader")["headers"]
    ok = client.post("/api/uploads", headers=h, files=[("files", ("pic.png", png_bytes((3000, 2000)), "image/png"))])
    assert ok.status_code == 200, ok.text
    f = ok.json()["files"][0]
    assert f["url"].startswith("http://testserver/uploads/u") and f["path"].endswith(".png")
    from PIL import Image
    import io
    served = client.get(f["path"])
    assert served.status_code == 200 and served.headers["x-content-type-options"] == "nosniff"
    assert max(Image.open(io.BytesIO(served.content)).size) <= 1600  # resized
    # the returned URL can be attached to a listing
    prop = client.post("/api/properties", headers=h, json={"title": "With photo", "listingType": "rent", "price": 10000, "images": [f["url"]]})
    assert prop.status_code == 201 and prop.json()["image"] == f["url"]
    # rejects: wrong content, disguised content, svg, empty, too large, too many, anonymous
    bad = client.post("/api/uploads", headers=h, files=[("files", ("x.png", b"<?php echo 1;?>", "image/png"))])
    assert bad.status_code == 400 and bad.json()["error"]["code"] == "invalid_image"
    svg = client.post("/api/uploads", headers=h, files=[("files", ("x.svg", b"<svg xmlns='http://www.w3.org/2000/svg'><script>alert(1)</script></svg>", "image/svg+xml"))])
    assert svg.status_code == 400
    assert client.post("/api/uploads", headers=h, files=[("files", ("e.png", b"", "image/png"))]).status_code == 400
    from app.core.config import get_settings
    s = get_settings()
    s.max_upload_mb, old = 0, s.max_upload_mb
    try:
        big = client.post("/api/uploads", headers=h, files=[("files", ("p.png", png_bytes(), "image/png"))])
    finally:
        s.max_upload_mb = old
    assert big.status_code in (400, 413)
    many = client.post("/api/uploads", headers=h, files=[("files", (f"{i}.png", png_bytes(), "image/png")) for i in range(9)])
    assert many.status_code == 400
    assert client.post("/api/uploads", files=[("files", ("a.png", png_bytes(), "image/png"))]).status_code == 401
    assert client.get("/uploads/../../etc/passwd").status_code in (400, 404)


def test_exif_metadata_is_stripped(client, make_user):
    import io
    from PIL import Image
    img = Image.new("RGB", (50, 40), (10, 200, 10))
    exif = Image.Exif()
    exif[0x010F] = "SecretCameraMaker"
    buf = io.BytesIO()
    img.save(buf, "JPEG", exif=exif)
    h = make_user("Exif")["headers"]
    f = client.post("/api/uploads", headers=h, files=[("files", ("p.jpg", buf.getvalue(), "image/jpeg"))]).json()["files"][0]
    assert b"SecretCameraMaker" not in client.get(f["path"]).content


def test_cors_and_security_headers(client):
    r = client.options("/api/businesses", headers={"Origin": "http://localhost:8443", "Access-Control-Request-Method": "GET"})
    assert r.headers.get("access-control-allow-origin") == "http://localhost:8443"
    evil = client.options("/api/businesses", headers={"Origin": "http://evil.example", "Access-Control-Request-Method": "GET"})
    assert "access-control-allow-origin" not in evil.headers
    h = client.get("/api/health").headers
    assert h["x-content-type-options"] == "nosniff" and h["x-frame-options"] == "DENY"
