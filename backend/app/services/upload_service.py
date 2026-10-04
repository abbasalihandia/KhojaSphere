"""Safe image uploads: verify real image bytes (not the client's claimed type), cap size, strip metadata, resize."""
from __future__ import annotations

import io

from fastapi import UploadFile
from PIL import Image, ImageOps, UnidentifiedImageError

from app.core.config import get_settings
from app.core.errors import AppError, BadRequest
from app.storage import get_storage, public_url

ALLOWED = {"JPEG": "jpg", "PNG": "png", "WEBP": "webp"}
Image.MAX_IMAGE_PIXELS = 40_000_000  # decompression-bomb guard


def save_image(file: UploadFile, folder: str = "images") -> dict:
    s = get_settings()
    data = file.file.read(s.max_upload_bytes + 1)
    if not data:
        raise BadRequest("The uploaded file is empty.", code="empty_file")
    if len(data) > s.max_upload_bytes:
        raise AppError(f"Image is too large. Maximum size is {s.max_upload_mb} MB.", code="file_too_large", status_code=413)
    try:
        img = Image.open(io.BytesIO(data))
        fmt = (img.format or "").upper()
        img.load()
    except (UnidentifiedImageError, OSError, Image.DecompressionBombError):
        raise BadRequest("That file is not a valid image. Please upload a JPG, PNG or WebP.", code="invalid_image")
    if fmt not in ALLOWED:
        raise BadRequest("Unsupported image type. Please upload a JPG, PNG or WebP.", code="unsupported_image_type")
    img = ImageOps.exif_transpose(img)  # honour orientation, then re-encode below (drops EXIF/GPS metadata)
    img.thumbnail((s.max_image_dimension, s.max_image_dimension))
    out = io.BytesIO()
    if fmt == "JPEG":
        img.convert("RGB").save(out, "JPEG", quality=85, optimize=True)
    elif fmt == "PNG":
        img.save(out, "PNG", optimize=True)
    else:
        img.save(out, "WEBP", quality=85)
    ref = get_storage().save(out.getvalue(), ext=ALLOWED[fmt], folder=folder)
    return {"url": public_url(ref), "path": ref, "size": out.tell()}
