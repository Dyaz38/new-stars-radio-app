"""
Send password reset emails via SMTP (optional). If SMTP is not configured, logs the link.
"""
from __future__ import annotations

import hashlib
import logging
import smtplib
from email.message import EmailMessage

from app.core.config import settings

logger = logging.getLogger(__name__)


def hash_password_reset_token(raw_token: str) -> str:
    """Store only SHA-256 hex of the raw token in the database."""
    return hashlib.sha256(raw_token.encode("utf-8")).hexdigest()


def send_password_reset_email(to_email: str, reset_url: str) -> None:
    """
    Send HTML + plain text email. If SMTP is not configured, logs the URL (ops must deliver manually).
    """
    subject = "Reset your Ad Manager password"
    text_body = (
        "We received a request to reset the password for your Ad Manager account.\n\n"
        f"Open this link to choose a new password (valid for 1 hour):\n{reset_url}\n\n"
        "If you didn't request this, you can ignore this email.\n\n"
        "— New Stars Radio"
    )
    html_body = f"""<!DOCTYPE html>
<html><body style="font-family: system-ui, -apple-system, Segoe UI, Roboto, sans-serif; line-height: 1.5; color: #1f2937;">
  <p>We received a request to reset the password for your <strong>Ad Manager</strong> account.</p>
  <p><a href="{reset_url}" style="display:inline-block; padding: 12px 24px; background: #4f46e5; color: #fff; text-decoration: none; border-radius: 8px; font-weight: 600;">Reset password</a></p>
  <p style="font-size: 14px; color: #6b7280;">Or copy this link into your browser:<br/><span style="word-break: break-all;">{reset_url}</span></p>
  <p style="font-size: 14px; color: #6b7280;">This link expires in <strong>1 hour</strong>. If you didn't request a reset, you can ignore this email.</p>
  <p style="font-size: 12px; color: #9ca3af;">— New Stars Radio</p>
</body></html>"""

    if not settings.SMTP_HOST or not settings.SMTP_USER:
        logger.warning(
            "SMTP not configured — password reset for %s. Reset URL (deliver manually or set SMTP_* env): %s",
            to_email,
            reset_url,
        )
        return

    from_addr = settings.SMTP_FROM or settings.SMTP_USER
    msg = EmailMessage()
    msg["Subject"] = subject
    msg["From"] = from_addr
    msg["To"] = to_email
    msg.set_content(text_body)
    msg.add_alternative(html_body, subtype="html")

    try:
        if settings.SMTP_USE_SSL:
            with smtplib.SMTP_SSL(settings.SMTP_HOST, settings.SMTP_PORT, timeout=30) as smtp:
                smtp.login(settings.SMTP_USER, settings.SMTP_PASSWORD or "")
                smtp.send_message(msg)
        else:
            with smtplib.SMTP(settings.SMTP_HOST, settings.SMTP_PORT, timeout=30) as smtp:
                if settings.SMTP_USE_TLS:
                    smtp.starttls()
                smtp.login(settings.SMTP_USER, settings.SMTP_PASSWORD or "")
                smtp.send_message(msg)
        logger.info("Password reset email sent to %s", to_email)
    except Exception as e:
        logger.exception("Failed to send password reset email to %s: %s", to_email, e)
        raise
