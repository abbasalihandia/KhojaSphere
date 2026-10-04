from __future__ import annotations

import io
import json
import os
import tempfile
import threading
from http.server import BaseHTTPRequestHandler, ThreadingHTTPServer
from pathlib import Path

_TMP = Path(tempfile.mkdtemp(prefix="khoja-tests-"))
os.environ.update({
    "APP_ENV": "test", "DATABASE_URL": os.environ.get("KHOJA_TEST_DATABASE_URL") or f"sqlite:///{_TMP / 'test.db'}", "JWT_SECRET": "test-secret-test-secret-test-secret-1234",
    "UPLOAD_DIR": str(_TMP / "uploads"), "DEV_OUTBOX_DIR": str(_TMP / "outbox"), "BCRYPT_ROUNDS": "4",
    "OLLAMA_BASE_URL": "http://127.0.0.1:9", "RATE_LIMIT_ENABLED": "false", "FRONTEND_URL": "http://localhost:8443",
    "BACKEND_URL": "http://testserver",
})

import pytest  # noqa: E402
from alembic import command  # noqa: E402
from alembic.config import Config  # noqa: E402
from fastapi.testclient import TestClient  # noqa: E402
from PIL import Image  # noqa: E402

import app.ai.service as ai_service  # noqa: E402
from app.core import rate_limit  # noqa: E402
from app.core.config import get_settings  # noqa: E402
from app.database.session import Base, SessionLocal, engine  # noqa: E402
from app.main import app  # noqa: E402
from app.services import taxonomy  # noqa: E402
from seed import seed as seed_mod  # noqa: E402

ROOT = Path(__file__).resolve().parents[1]
PW = "Passw0rd-test"
ADMIN_PW = "AdminPass-1"


@pytest.fixture(scope="session", autouse=True)
def _schema():
    """Create the schema through the real Alembic migration (so a broken migration fails the whole suite)."""
    cfg = Config(str(ROOT / "alembic.ini"))
    cfg.set_main_option("script_location", str(ROOT / "migrations"))
    command.upgrade(cfg, "head")
    yield


@pytest.fixture(autouse=True)
def _clean_db():
    with engine.begin() as conn:
        for t in reversed(Base.metadata.sorted_tables):
            conn.execute(t.delete())
    taxonomy.invalidate()
    ai_service.reset_ai_service()
    rate_limit.reset_rate_limits()
    get_settings().rate_limit_enabled = False
    yield


@pytest.fixture
def seeded():
    with SessionLocal() as db:
        seed_mod.run(db, admin_email="admin@khojasphere.example", admin_password=ADMIN_PW, demo_password=PW)
    taxonomy.invalidate()


@pytest.fixture
def client():
    with TestClient(app) as c:
        yield c


def _login(client, email, password):
    r = client.post("/api/auth/login", json={"email": email, "password": password})
    assert r.status_code == 200, r.text
    return {"Authorization": f"Bearer {r.json()['token']}"}


@pytest.fixture
def make_user(client):
    def _make(name="Test User", email=None, city="Mumbai", account_type="member"):
        email = email or f"user{len(name)}{os.urandom(3).hex()}@khojasphere.example"
        r = client.post("/api/auth/register", json={"name": name, "email": email, "password": PW, "city": city,
                                                     "accountType": account_type})
        assert r.status_code == 201, r.text
        body = r.json()
        return {"id": body["user"]["id"], "email": email, "headers": {"Authorization": f"Bearer {body['token']}"}}
    return _make


@pytest.fixture
def admin(client, seeded):
    return _login(client, "admin@khojasphere.example", ADMIN_PW)


@pytest.fixture
def owner(client, seeded):
    return _login(client, "demo.owner@khojasphere.example", PW)


@pytest.fixture
def member(client, seeded):
    return _login(client, "demo.member@khojasphere.example", PW)


def png_bytes(size=(40, 30), color=(200, 30, 30), fmt="PNG"):
    buf = io.BytesIO()
    Image.new("RGB", size, color).save(buf, fmt)
    return buf.getvalue()


# ---------------------------------------------------------------------------- fake Ollama
class FakeOllama:
    """Scriptable stand-in for the Ollama HTTP API (/api/tags, /api/chat, /api/embed)."""

    def __init__(self):
        self.mode = "ok"  # ok | bad_json | http_error
        self.models = ["llama3.2:3b", "nomic-embed-text:latest"]
        self.calls: list[str] = []
        outer = self

        class H(BaseHTTPRequestHandler):
            def log_message(self, *a):
                pass

            def _send(self, code, obj):
                data = json.dumps(obj).encode()
                self.send_response(code)
                self.send_header("Content-Type", "application/json")
                self.send_header("Content-Length", str(len(data)))
                self.end_headers()
                self.wfile.write(data)

            def do_GET(self):
                outer.calls.append("tags")
                self._send(200, {"models": [{"name": m} for m in outer.models]})

            def do_POST(self):
                body = json.loads(self.rfile.read(int(self.headers["Content-Length"])) or b"{}")
                if self.path == "/api/embed":
                    outer.calls.append("embed")
                    if outer.mode == "http_error":
                        return self._send(500, {"error": "boom"})
                    return self._send(200, {"embeddings": [outer.embed(t) for t in body["input"]]})
                outer.calls.append("chat")
                if outer.mode == "http_error":
                    return self._send(500, {"error": "boom"})
                system, user = body["messages"][0]["content"], body["messages"][-1]["content"]
                if outer.mode == "bad_json" and body.get("format") == "json":
                    return self._send(200, {"message": {"content": "this is not json"}})
                if "convert a search request" in system:
                    low = user.lower()
                    out = {"keywords": ["photographer"] if "photo" in low else [], "category": "Photography & Videography" if "photo" in low else None,
                           "marketplace_category": None, "city": "Mumbai" if "mumbai" in low else None, "locality": None,
                           "types": ["business"] if "photo" in low else [], "listing_type": None, "bedrooms": None,
                           "price_min": None, "price_max": None, "intent": "search"}
                    return self._send(200, {"message": {"content": json.dumps(out)}})
                if "write marketplace listings" in system:
                    out = {"title": "AI Title For Listing", "short_description": "Short AI blurb.",
                           "description": "AI written description.", "category": "Photography & Videography",
                           "tags": ["Wedding", "Cinematic"]}
                    return self._send(200, {"message": {"content": json.dumps(out)}})
                self._send(200, {"message": {"content": "FAKE-OLLAMA: I found some options for you."}})

        self.server = ThreadingHTTPServer(("127.0.0.1", 0), H)
        self.url = f"http://127.0.0.1:{self.server.server_address[1]}"
        threading.Thread(target=self.server.serve_forever, daemon=True).start()

    GROUPS = [["photo", "wedding", "marriage", "camera", "videograph"], ["tax", "gst", "accountant", "audit", "ca"],
              ["chair", "furniture", "sofa", "desk", "shelf"], ["rent", "apartment", "bhk", "flat"], ["legal", "contract", "law"]]

    def embed(self, text):
        low = text.lower()
        v = [float(sum(low.count(w) for w in g)) for g in self.GROUPS]
        return v if any(v) else [0.01] * len(self.GROUPS)

    def stop(self):
        self.server.shutdown()
        self.server.server_close()  # really refuse connections afterwards


@pytest.fixture
def fake_ollama():
    fo = FakeOllama()
    s = get_settings()
    old = (s.ollama_base_url, s.ai_enabled)
    s.ollama_base_url, s.ai_enabled = fo.url, True
    ai_service.reset_ai_service()
    yield fo
    s.ollama_base_url, s.ai_enabled = old
    ai_service.reset_ai_service()
    fo.stop()
