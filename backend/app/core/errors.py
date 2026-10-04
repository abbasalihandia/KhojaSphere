"""Consistent error type + handlers. Every error response has the shape:

    {"error": {"code": "...", "message": "...", "details": [...optional...]}}
"""
from __future__ import annotations

import logging
from typing import Any

from fastapi import FastAPI, Request
from fastapi.exceptions import RequestValidationError
from fastapi.responses import JSONResponse
from sqlalchemy.exc import IntegrityError, SQLAlchemyError
from starlette.exceptions import HTTPException as StarletteHTTPException

log = logging.getLogger("khojasphere.errors")


class AppError(Exception):
    status_code = 400
    code = "bad_request"

    def __init__(self, message: str = "", *, code: str | None = None, status_code: int | None = None,
                 details: Any = None, headers: dict[str, str] | None = None):
        super().__init__(message)
        self.message = message or self.__class__.__name__
        if code:
            self.code = code
        if status_code:
            self.status_code = status_code
        self.details = details
        self.headers = headers


class BadRequest(AppError):
    status_code, code = 400, "bad_request"


class Unauthorized(AppError):
    status_code, code = 401, "unauthorized"


class Forbidden(AppError):
    status_code, code = 403, "forbidden"


class NotFound(AppError):
    status_code, code = 404, "not_found"


class Conflict(AppError):
    status_code, code = 409, "conflict"


class TooManyRequests(AppError):
    status_code, code = 429, "rate_limited"


class ServiceUnavailable(AppError):
    status_code, code = 503, "service_unavailable"


def _body(code: str, message: str, details: Any = None) -> dict:
    err: dict[str, Any] = {"code": code, "message": message}
    if details is not None:
        err["details"] = details
    return {"error": err}


def register_exception_handlers(app: FastAPI) -> None:
    @app.exception_handler(AppError)
    async def _app_error(_: Request, exc: AppError):
        return JSONResponse(_body(exc.code, exc.message, exc.details), status_code=exc.status_code, headers=exc.headers)

    @app.exception_handler(RequestValidationError)
    async def _validation(_: Request, exc: RequestValidationError):
        details = []
        for e in exc.errors():
            loc = [str(p) for p in e.get("loc", []) if p not in ("body", "query", "path")]
            msg = str(e.get("msg", "Invalid value"))
            if msg.startswith("Value error, "):
                msg = msg[len("Value error, "):]
            details.append({"field": ".".join(loc) or "request", "message": msg})
        message = details[0]["message"] if len(details) == 1 else "Some fields are invalid"
        return JSONResponse(_body("validation_error", message, details), status_code=422)

    @app.exception_handler(StarletteHTTPException)
    async def _http(_: Request, exc: StarletteHTTPException):
        codes = {404: "not_found", 405: "method_not_allowed", 401: "unauthorized", 403: "forbidden"}
        return JSONResponse(_body(codes.get(exc.status_code, "http_error"), str(exc.detail)),
                            status_code=exc.status_code, headers=getattr(exc, "headers", None))

    @app.exception_handler(IntegrityError)
    async def _integrity(_: Request, exc: IntegrityError):
        log.warning("Integrity error: %s", exc.orig.__class__.__name__)
        return JSONResponse(_body("conflict", "That conflicts with existing data."), status_code=409)

    @app.exception_handler(SQLAlchemyError)
    async def _db(_: Request, exc: SQLAlchemyError):
        log.exception("Database error")
        return JSONResponse(_body("database_error", "A database error occurred. Please try again."), status_code=500)

    @app.exception_handler(Exception)
    async def _unhandled(_: Request, exc: Exception):
        log.exception("Unhandled error")
        return JSONResponse(_body("internal_error", "Something went wrong on our side."), status_code=500)
