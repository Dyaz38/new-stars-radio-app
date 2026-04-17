"""
Send password reset emails via Resend API (preferred on Railway) or SMTP.
If neither is configured, logs the reset URL for operators (no email sent).
"""
from __future__ import annotations

import hashlib
import logging
import smtplib
from email.message import EmailMessage
from email.utils import formatdate, make_msgid

import httpx

from app.core.config import settings

logger = logging.getLogger(__name__)


def password_reset_delivery_mode() -> str:
    """
    How password-reset emails will be sent (for health checks / ops).
    Returns: 'resend' | 'smtp' | 'none'
    """
    if settings.RESEND_API_KEY:
        return "resend"
    if settings.SMTP_HOST and settings.SMTP_USER:
        return "smtp"
    return "none"


def hash_password_reset_token(raw_token: str) -> str:
    """Store only SHA-256 hex of the raw token in the database."""
    return hashlib.sha256(raw_token.encode("utf-8")).hexdigest()


def _mask_email_for_logs(email: str) -> str:
    """Avoid logging full addresses in routine info logs (privacy)."""
    if "@" not in email:
        return "***"
    local, _, domain = email.partition("@")
    if len(local) <= 1:
        return f"*@{domain}"
    return f"{local[0]}***@{domain}"


def _send_via_resend(to_email: str, subject: str, text_body: str, html_body: str) -> None:
    """Transactional email via Resend HTTPS API (simple on Railway — one API key)."""
    from_addr = settings.RESEND_FROM
    response = httpx.post(
        "https://api.resend.com/emails",
        headers={
            "Authorization": f"Bearer {settings.RESEND_API_KEY}",
            "Content-Type": "application/json",
        },
        json={
            "from": from_addr,
            "to": [to_email],
            "subject": subject,
            "html": html_body,
            "text": text_body,
        },
        timeout=30.0,
    )
    try:
        response.raise_for_status()
    except httpx.HTTPStatusError as e:
        body = (e.response.text or "")[:2000]
        logger.error(
            "Resend HTTP %s for %s: %s",
            e.response.status_code,
            _mask_email_for_logs(to_email),
            body,
        )
        raise
    logger.info("Password reset email sent via Resend to %s", _mask_email_for_logs(to_email))


def _send_via_smtp(to_email: str, subject: str, text_body: str, html_body: str) -> None:
    from_addr = settings.SMTP_FROM or settings.SMTP_USER
    msg = EmailMessage()
    msg["Subject"] = subject
    msg["From"] = from_addr
    msg["To"] = to_email
    msg["Date"] = formatdate(localtime=True)
    msg["Message-ID"] = make_msgid(domain="newstarsradio.com")
    msg["MIME-Version"] = "1.0"
    msg["Content-Language"] = "en"
    msg.set_content(text_body, charset="utf-8")
    msg.add_alternative(html_body, subtype="html")

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
    logger.info("Password reset email sent via SMTP to %s", _mask_email_for_logs(to_email))


def send_password_reset_email(to_email: str, reset_url: str) -> None:
    """
    Priority: Resend API → SMTP → log only (no inbox delivery).
    """
    subject = "Reset your Ad Manager password"
    text_body = (
        "We received a request to reset the password for your Ad Manager account.\n\n"
        f"Open this link to choose a new password (valid for 1 hour):\n{reset_url}\n\n"
        "If you didn't request this, you can ignore this email.\n\n"
        "— New Stars Radio"
    )
    html_body = f"""<!DOCTYPE html>
<html lang="en"><head><meta charset="utf-8"/></head>
<body style="font-family: system-ui, -apple-system, Segoe UI, Roboto, sans-serif; line-height: 1.5; color: #1f2937;">
  <p>We received a request to reset the password for your <strong>Ad Manager</strong> account.</p>
  <p><a href="{reset_url}" rel="noopener noreferrer" style="display:inline-block; padding: 12px 24px; background: #4f46e5; color: #fff; text-decoration: none; border-radius: 8px; font-weight: 600;">Reset password</a></p>
  <p style="font-size: 14px; color: #6b7280;">Or copy this link into your browser:<br/><span style="word-break: break-all;">{reset_url}</span></p>
  <p style="font-size: 14px; color: #6b7280;">This link expires in <strong>1 hour</strong>. If you didn't request a reset, you can ignore this email.</p>
  <p style="font-size: 12px; color: #9ca3af;">— New Stars Radio</p>
</body></html>"""

    # 1) Resend (recommended for Railway — add RESEND_API_KEY in dashboard)
    if settings.RESEND_API_KEY:
        try:
            _send_via_resend(to_email, subject, text_body, html_body)
            return
        except Exception:
            logger.exception("Resend failed for %s; trying SMTP if configured", _mask_email_for_logs(to_email))

    # 2) SMTP (Gmail, etc.)
    if settings.SMTP_HOST and settings.SMTP_USER:
        try:
            _send_via_smtp(to_email, subject, text_body, html_body)
            return
        except Exception:
            logger.exception("SMTP failed for %s", _mask_email_for_logs(to_email))
            raise

    # 3) No delivery — ops must read logs or configure Resend/SMTP
    logger.error(
        "PASSWORD RESET: no email delivery configured. Set RESEND_API_KEY or SMTP_* on the server. "
        "Reset URL for %s: %s",
        _mask_email_for_logs(to_email),
        reset_url,
    )
