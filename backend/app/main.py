from __future__ import annotations

import logging
from contextlib import asynccontextmanager

from fastapi import APIRouter, FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from starlette.middleware.base import BaseHTTPMiddleware

from app.api.routes import admin, auth, discovery, listings, social
from app.core.config import get_settings
from app.core.errors import register_exception_handlers

logging.basicConfig(level=logging.INFO, format="%(asctime)s %(levelname)s %(name)s: %(message)s")
log = logging.getLogger("khojasphere")


class SecurityHeaders(BaseHTTPMiddleware):
    async def dispatch(self, request, call_next):
        resp = await call_next(request)
        resp.headers.setdefault("X-Content-Type-Options", "nosniff")
        resp.headers.setdefault("X-Frame-Options", "DENY")
        resp.headers.setdefault("Referrer-Policy", "strict-origin-when-cross-origin")
        if request.url.path.startswith("/api/"):
            resp.headers.setdefault("Cache-Control", "no-store")
        return resp


def create_app() -> FastAPI:
    s = get_settings()

    @asynccontextmanager
    async def lifespan(_: FastAPI):
        log.info("KhojaSphere API starting (env=%s, ai_enabled=%s)", s.app_env, s.ai_enabled)
        yield

    app = FastAPI(
        title="KhojaSphere API", version="1.0.0", lifespan=lifespan,
        description="Backend for the KhojaSphere community discovery platform. Authenticate via **POST /api/auth/login** "
                    "and click *Authorize* with the returned token. Errors always look like "
                    "`{\"error\": {\"code\", \"message\", \"details?\"}}`. JSON uses camelCase.",
    )
    app.add_middleware(SecurityHeaders)
    app.add_middleware(
        CORSMiddleware, allow_origins=s.cors_origins, allow_credentials=False,
        allow_methods=["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"], allow_headers=["Authorization", "Content-Type"],
        expose_headers=["Retry-After"], max_age=600,
    )
    register_exception_handlers(app)

    api = APIRouter(prefix="/api")
    for r in (auth.router, auth.users_router, listings.businesses, listings.properties, listings.marketplace, discovery.router,
              social.favorites, social.inquiries, social.reports, social.mentors, admin.router):
        api.include_router(r)
    app.include_router(api)

    if s.storage_backend == "local":
        from pathlib import Path
        Path(s.upload_dir).mkdir(parents=True, exist_ok=True)
        app.mount("/uploads", StaticFiles(directory=s.upload_dir), name="uploads")
    return app


app = create_app()
