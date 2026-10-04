"""Outgoing email. SMTP when configured; otherwise a dev outbox (files) outside production. Never logs bodies/links."""
from __future__ import annotations

import logging
import smtplib
import time
from email.message import EmailMessage
from pathlib import Path

from app.core.config import get_settings

log = logging.getLogger("khojasphere.email")


def send_email(to: str, subject: str, body: str) -> bool:
    s = get_settings()
    if s.smtp_host:
        msg = EmailMessage()
        msg["From"], msg["To"], msg["Subject"] = s.smtp_from, to, subject
        msg.set_content(body)
        try:
            with smtplib.SMTP(s.smtp_host, s.smtp_port, timeout=10) as smtp:
                smtp.starttls()
                if s.smtp_user:
                    smtp.login(s.smtp_user, s.smtp_password)
                smtp.send_message(msg)
            return True
        except (smtplib.SMTPException, OSError) as exc:
            log.error("SMTP delivery failed: %s", exc.__class__.__name__)
            return False
    if s.is_production:
        log.error("Email not sent: SMTP is not configured (set SMTP_HOST).")
        return False
    outbox = Path(s.dev_outbox_dir)
    outbox.mkdir(parents=True, exist_ok=True)
    safe = "".join(c if c.isalnum() else "_" for c in to)[:40]
    (outbox / f"{int(time.time() * 1000)}_{safe}.txt").write_text(f"To: {to}\nSubject: {subject}\n\n{body}\n", encoding="utf-8")
    log.info("Email written to the dev outbox (SMTP not configured).")
    return True
