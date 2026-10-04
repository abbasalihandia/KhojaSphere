from __future__ import annotations

import re
import unicodedata

_WS = re.compile(r"\s+")
_TOKEN = re.compile(r"[a-z0-9₹]+")


def clean(s: str | None) -> str:
    """Trim, drop control characters and collapse runs of whitespace (keeps newlines out)."""
    if not s:
        return ""
    s = "".join(ch for ch in s if ch in "\n\t" or unicodedata.category(ch)[0] != "C")
    return _WS.sub(" ", s).strip()


def clean_multiline(s: str | None) -> str:
    if not s:
        return ""
    s = "".join(ch for ch in s if ch in "\n\t" or unicodedata.category(ch)[0] != "C")
    s = re.sub(r"[ \t]+", " ", s)
    return re.sub(r"\n{3,}", "\n\n", s).strip()


def tokenize(s: str) -> list[str]:
    return _TOKEN.findall(s.lower())


def escape_like(s: str) -> str:
    return s.replace("\\", "\\\\").replace("%", "\\%").replace("_", "\\_")


def build_search_text(*parts) -> str:
    out: list[str] = []
    for p in parts:
        if p is None:
            continue
        if isinstance(p, (list, tuple, set)):
            out.extend(str(x) for x in p if x)
        else:
            out.append(str(p))
    return " ".join(out).lower()[:6000]
