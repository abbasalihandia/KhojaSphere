"""Presentation helpers: Indian number grouping, price labels, relative time."""
from __future__ import annotations

from datetime import datetime, timezone


def indian_group(n: int) -> str:
    s = str(abs(int(n)))
    if len(s) > 3:
        head, tail = s[:-3], s[-3:]
        parts = []
        while len(head) > 2:
            parts.insert(0, head[-2:])
            head = head[:-2]
        if head:
            parts.insert(0, head)
        s = ",".join(parts + [tail])
    return ("-" if n < 0 else "") + s


def format_price(amount: int | None, period: str | None = None) -> str:
    """'₹45,000/month' for rent, '₹1.85 Cr' / '₹85 L' for sale, '₹3,500' for plain prices."""
    if amount is None:
        return ""
    a = int(amount)
    if period == "total":
        if a >= 10_000_000:
            return f"₹{(a / 10_000_000):.2f}".rstrip("0").rstrip(".") + " Cr"
        if a >= 100_000:
            return f"₹{(a / 100_000):.2f}".rstrip("0").rstrip(".") + " L"
    label = f"₹{indian_group(a)}"
    return f"{label}/month" if period == "month" else label


def format_range(lo: int | None, hi: int | None) -> str:
    if lo is None and hi is None:
        return ""
    if lo is not None and hi is not None and lo != hi:
        return f"₹{indian_group(lo)} – ₹{indian_group(hi)}"
    return f"₹{indian_group(lo if lo is not None else hi)}"


def format_area(sqft: int | None) -> str:
    return f"{indian_group(sqft)} sqft" if sqft else ""


def time_ago(dt: datetime | None, now: datetime | None = None) -> str:
    if dt is None:
        return ""
    now = now or datetime.now(timezone.utc)
    if dt.tzinfo is None:
        dt = dt.replace(tzinfo=timezone.utc)
    secs = max(0, int((now - dt).total_seconds()))
    if secs < 60:
        return "just now"
    mins = secs // 60
    if mins < 60:
        return f"{mins} minute{'s' if mins != 1 else ''} ago"
    hrs = mins // 60
    if hrs < 24:
        return f"{hrs} hour{'s' if hrs != 1 else ''} ago"
    days = hrs // 24
    if days < 7:
        return f"{days} day{'s' if days != 1 else ''} ago"
    if days < 30:
        w = days // 7
        return f"{w} week{'s' if w != 1 else ''} ago"
    return dt.strftime("%d %b %Y")
