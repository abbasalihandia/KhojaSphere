from __future__ import annotations

from pathlib import Path

from app.core.config import get_settings
from tests.conftest import PW


def reg(client, **over):
    body = {"name": "Asha Test", "email": "asha@khojasphere.example", "password": PW, "city": "Mumbai", "accountType": "member"}
    body.update(over)
    return client.post("/api/auth/register", json=body)


def test_register_login_me_roundtrip(client):
    r = reg(client)
    assert r.status_code == 201
    data = r.json()
    assert data["user"]["email"] == "asha@khojasphere.example" and data["user"]["role"] == "user"
    assert "password" not in str(data).lower() or "passwordHash" not in data["user"]
    me = client.get("/api/auth/me", headers={"Authorization": f"Bearer {data['token']}"})
    assert me.status_code == 200 and me.json()["name"] == "Asha Test"
    login = client.post("/api/auth/login", json={"email": "ASHA@khojasphere.example", "password": PW})
    assert login.status_code == 200  # email is case-insensitive


def test_register_validation(client):
    assert reg(client, password="short1").status_code == 422
    assert reg(client, password="nodigitshere").status_code == 422
    assert reg(client, email="not-an-email").status_code == 422
    assert reg(client, accountType="admin").status_code == 422  # cannot self-register as admin
    assert reg(client, password="a1" * 40).status_code == 422  # > 72 bytes
    r = reg(client, name="A")
    assert r.status_code == 422 and r.json()["error"]["code"] == "validation_error"
    assert r.json()["error"]["details"][0]["field"] == "name"


def test_duplicate_email_conflict(client):
    assert reg(client).status_code == 201
    r = reg(client)
    assert r.status_code == 409 and r.json()["error"]["code"] == "email_taken"


def test_password_is_hashed_in_db(client):
    reg(client)
    from app.database.session import SessionLocal
    from app.models import User
    with SessionLocal() as db:
        u = db.query(User).one()
        assert u.password_hash != PW and u.password_hash.startswith("$2")


def test_invalid_login_is_generic(client):
    reg(client)
    wrong = client.post("/api/auth/login", json={"email": "asha@khojasphere.example", "password": "Wrong-pass1"})
    unknown = client.post("/api/auth/login", json={"email": "nobody@khojasphere.example", "password": PW})
    assert wrong.status_code == unknown.status_code == 401
    assert wrong.json()["error"]["message"] == unknown.json()["error"]["message"]


def test_protected_routes_need_token(client):
    for path in ("/api/auth/me", "/api/users/me", "/api/favorites", "/api/inquiries", "/api/dashboard/summary"):
        r = client.get(path)
        assert r.status_code == 401, path
        assert r.json()["error"]["code"] == "not_authenticated"
    bad = client.get("/api/auth/me", headers={"Authorization": "Bearer garbage"})
    assert bad.status_code == 401 and bad.json()["error"]["code"] == "invalid_token"
    # a present-but-invalid token is also rejected on optional-auth endpoints, so the client can re-authenticate
    assert client.get("/api/businesses", headers={"Authorization": "Bearer garbage"}).status_code == 401


def test_logout_revokes_token(client):
    h = {"Authorization": f"Bearer {reg(client).json()['token']}"}
    assert client.get("/api/auth/me", headers=h).status_code == 200
    assert client.post("/api/auth/logout", headers=h).status_code == 200
    r = client.get("/api/auth/me", headers=h)
    assert r.status_code == 401 and r.json()["error"]["code"] == "token_revoked"


def test_expired_token(client):
    import jwt
    from datetime import datetime, timedelta, timezone
    s = get_settings()
    uid = reg(client).json()["user"]["id"]
    tok = jwt.encode({"sub": str(uid), "jti": "x1", "exp": datetime.now(timezone.utc) - timedelta(seconds=5)}, s.jwt_secret, algorithm="HS256")
    r = client.get("/api/auth/me", headers={"Authorization": f"Bearer {tok}"})
    assert r.status_code == 401 and r.json()["error"]["code"] == "token_expired"


def test_token_signed_with_other_secret_rejected(client):
    import jwt
    from datetime import datetime, timedelta, timezone
    tok = jwt.encode({"sub": "1", "jti": "x2", "exp": datetime.now(timezone.utc) + timedelta(hours=1)}, "another-secret-another-secret-123456", algorithm="HS256")
    assert client.get("/api/auth/me", headers={"Authorization": f"Bearer {tok}"}).status_code == 401


def test_profile_update(client):
    h = {"Authorization": f"Bearer {reg(client).json()['token']}"}
    r = client.put("/api/users/me", headers=h, json={"name": "Asha Khan", "city": "Pune", "bio": "Hello", "phone": "+91 98765 43210"})
    assert r.status_code == 200 and r.json()["city"] == "Pune" and r.json()["bio"] == "Hello"
    assert client.put("/api/users/me", headers=h, json={"phone": "abc"}).status_code == 422
    assert client.put("/api/users/me", headers=h, json={"avatarUrl": "javascript:alert(1)"}).status_code == 422
    assert client.get("/api/users/me", headers=h).json()["name"] == "Asha Khan"


def test_change_password(client):
    h = {"Authorization": f"Bearer {reg(client).json()['token']}"}
    assert client.post("/api/auth/change-password", headers=h, json={"currentPassword": "bad", "newPassword": "NewPassw0rd"}).status_code == 400
    assert client.post("/api/auth/change-password", headers=h, json={"currentPassword": PW, "newPassword": "NewPassw0rd"}).status_code == 200
    assert client.post("/api/auth/login", json={"email": "asha@khojasphere.example", "password": PW}).status_code == 401
    assert client.post("/api/auth/login", json={"email": "asha@khojasphere.example", "password": "NewPassw0rd"}).status_code == 200


def test_forgot_and_reset_password_flow(client):
    reg(client)
    outbox = Path(get_settings().dev_outbox_dir)
    before = set(outbox.glob("*")) if outbox.exists() else set()
    # unknown email: same response, nothing is sent
    r1 = client.post("/api/auth/forgot-password", json={"email": "ghost@khojasphere.example"})
    r2 = client.post("/api/auth/forgot-password", json={"email": "asha@khojasphere.example"})
    assert r1.status_code == r2.status_code == 200 and r1.json() == r2.json()
    new = set(outbox.glob("*")) - before
    assert len(new) == 1
    body = new.pop().read_text()
    token = body.split("token=")[1].split()[0]
    assert client.post("/api/auth/reset-password", json={"token": "nope" * 5, "newPassword": "ResetPassw0rd"}).status_code == 400
    assert client.post("/api/auth/reset-password", json={"token": token, "newPassword": "weak"}).status_code == 422
    assert client.post("/api/auth/reset-password", json={"token": token, "newPassword": "ResetPassw0rd"}).status_code == 200
    # single use
    assert client.post("/api/auth/reset-password", json={"token": token, "newPassword": "Another1Pass"}).status_code == 400
    assert client.post("/api/auth/login", json={"email": "asha@khojasphere.example", "password": "ResetPassw0rd"}).status_code == 200


def test_rate_limit_on_login(client):
    s = get_settings()
    s.rate_limit_enabled = True
    try:
        codes = [client.post("/api/auth/login", json={"email": "x@khojasphere.example", "password": "whatever1"}).status_code for _ in range(12)]
    finally:
        s.rate_limit_enabled = False
    assert codes[:10] == [401] * 10 and codes[10] == 429
    r = client.post("/api/auth/login", json={"email": "x@khojasphere.example", "password": "whatever1"})
    assert "retry-after" in r.headers or r.status_code == 401


def test_suspended_user_cannot_use_token(client, admin, seeded):
    u = client.post("/api/auth/register", json={"name": "Bad Actor", "email": "bad@khojasphere.example", "password": PW, "city": "Pune"}).json()
    h = {"Authorization": f"Bearer {u['token']}"}
    assert client.patch(f"/api/admin/users/{u['user']['id']}", headers=admin, json={"isActive": False}).status_code == 200
    r = client.get("/api/auth/me", headers=h)
    assert r.status_code == 403 and r.json()["error"]["code"] == "account_disabled"
    assert client.post("/api/auth/login", json={"email": "bad@khojasphere.example", "password": PW}).status_code == 403
