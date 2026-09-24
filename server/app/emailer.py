"""Sending one email, and being honest about it when it does not go.

Lifted from Costora's `app/emailer.py`, deliberately: it is the same problem, it has already been
debugged against a real provider, and two services on one Railway account behaving differently
about mail is two sets of surprises.

Two ways out, tried in this order:

1. **Resend's HTTPS API**, when there is a key. Preferred because a lot of hosts — Railway among
   them — block or quietly drop outbound SMTP, and that shows up as a connection timing out
   rather than as an error anybody can read. Port 443 is never blocked.
2. **SMTP**, for anything else.

With neither configured, `send_email` writes the whole message to the log and returns False. That
is what makes the reset flow testable on a laptop with no mail account: the link is in the console
and it works. It also means a production deploy with no mail variables is a reset flow that fails
silently, which is why `/health` reports the transport — see `email_status`.

**`send_email` never raises.** Its caller is a public endpoint that answers identically whether or
not an account exists, so a delivery failure turning into a 500 would both break that promise and
leak which addresses are registered: unknown address → 200, real address + broken mail → 500. A
list of everybody with an account, obtainable one guess at a time.
"""
import base64
import logging
import os
import re
import smtplib
import ssl
from datetime import datetime, timezone
from email.message import EmailMessage

import httpx

logger = logging.getLogger(__name__)

RESEND_API_URL = "https://api.resend.com/emails"
RESEND_TIMEOUT = float(os.environ.get("RESEND_TIMEOUT", "15"))

SMTP_HOST = os.environ.get("SMTP_HOST")
SMTP_PORT = int(os.environ.get("SMTP_PORT", "587"))
SMTP_USERNAME = os.environ.get("SMTP_USERNAME")
SMTP_PASSWORD = os.environ.get("SMTP_PASSWORD")
SMTP_FROM_EMAIL = os.environ.get("SMTP_FROM_EMAIL", "no-reply@playthecrew.com")
# Without a timeout, a mail server that accepts the connection and then says nothing holds this
# request — and the worker serving it — open for as long as it likes.
SMTP_TIMEOUT = float(os.environ.get("SMTP_TIMEOUT", "15"))
# Providers offer STARTTLS on 587 or implicit TLS on 465, and calling starttls() on an
# implicit-TLS port fails. Defaulted from the port so the two common setups need no second
# variable, overridable for anything unusual.
SMTP_USE_SSL = os.environ.get("SMTP_USE_SSL", "1" if SMTP_PORT == 465 else "0") == "1"

RESEND_API_KEY = os.environ.get("RESEND_API_KEY")


def resend_api_key() -> str | None:
    """The key to post with, if there is one.

    Falls back to SMTP_PASSWORD when the host is Resend, because Resend's SMTP password *is* the
    API key (the username is the literal "resend"). So a service already set up for Resend over
    SMTP moves to the HTTPS path with no new variable — which matters, because the reason to want
    the HTTPS path is that SMTP is being blocked, and the person who has to set the variable is
    the one not receiving any email to tell them so.
    """
    if RESEND_API_KEY:
        return RESEND_API_KEY
    if SMTP_HOST and "resend.com" in SMTP_HOST and SMTP_PASSWORD:
        return SMTP_PASSWORD
    return None


# A rejected send is invisible from outside — /auth/forgot cannot report it without also
# reporting which addresses have accounts. So the last failure is remembered here and shown on
# /health, where it can be read without a Railway log tail. The usual answer is a provider
# refusing an unverified From domain.
_last_error: str | None = None
_last_error_at: str | None = None
_last_success_at: str | None = None


def _now() -> str:
    return datetime.now(timezone.utc).isoformat(timespec="seconds")


# Deliberately greedy. This is a scrubber, so over-matching is the safe direction to be wrong in.
_EMAIL_RE = re.compile(r"[^\s\"'<>,{}()\[\]]+@[^\s\"'<>,{}()\[\]]+")


def _redact(exc: Exception) -> str:
    """A description of a failure with nobody's address in it.

    Several SMTPException subclasses carry the recipient in their payload — SMTPRecipientsRefused
    reprs its whole {address: (code, reason)} dict — and email_status() is served by /health,
    which anybody can read. Left in, they would turn it into a list of who has an account.
    """
    return _EMAIL_RE.sub("<address>", repr(exc))


def email_configured() -> bool:
    return bool(SMTP_HOST or resend_api_key())


def email_transport() -> str:
    """Which way send_email will go: "resend_api", "smtp", or "none"."""
    if resend_api_key():
        return "resend_api"
    return "smtp" if SMTP_HOST else "none"


def email_status() -> dict:
    """What /health says about mail. No password, no username, no key.

    The From address *is* included, because it is the usual thing that is wrong: providers reject
    mail from a domain you have not verified with them, and the default here is a domain whose
    DNS may well not be set up for it yet.
    """
    return {
        "configured": email_configured(),
        "transport": email_transport(),
        "from_email": SMTP_FROM_EMAIL,
        "last_success_at": _last_success_at,
        "last_error": _last_error,
        "last_error_at": _last_error_at,
    }


def _send_via_resend_api(api_key: str, to_email: str, subject: str, body: str) -> None:
    """Post it. Raises on anything short of success."""
    r = httpx.post(
        RESEND_API_URL,
        headers={"Authorization": f"Bearer {api_key}", "Content-Type": "application/json"},
        json={"from": SMTP_FROM_EMAIL, "to": [to_email], "subject": subject, "text": body},
        timeout=RESEND_TIMEOUT,
    )
    # raise_for_status() would give no reason, and the reason is the whole point: an unverified
    # From domain comes back as a 403 whose body says so in a sentence.
    if r.status_code >= 400:
        raise RuntimeError(f"Resend API returned {r.status_code}: {r.text[:300]}")


def _send_via_smtp(to_email: str, subject: str, body: str) -> None:
    m = EmailMessage()
    m["From"] = SMTP_FROM_EMAIL
    m["To"] = to_email
    m["Subject"] = subject
    m.set_content(body)
    ctx = ssl.create_default_context()
    if SMTP_USE_SSL:
        with smtplib.SMTP_SSL(SMTP_HOST, SMTP_PORT, timeout=SMTP_TIMEOUT, context=ctx) as s:
            if SMTP_USERNAME and SMTP_PASSWORD:
                s.login(SMTP_USERNAME, SMTP_PASSWORD)
            s.send_message(m)
    else:
        with smtplib.SMTP(SMTP_HOST, SMTP_PORT, timeout=SMTP_TIMEOUT) as s:
            s.starttls(context=ctx)
            if SMTP_USERNAME and SMTP_PASSWORD:
                s.login(SMTP_USERNAME, SMTP_PASSWORD)
            s.send_message(m)


def send_email(to_email: str, subject: str, body: str) -> bool:
    """Send it. Returns whether it actually left the building. Never raises."""
    global _last_error, _last_error_at, _last_success_at
    transport = email_transport()
    if transport == "none":
        logger.warning(
            "Mail is not configured (no SMTP_HOST, no RESEND_API_KEY), so NOTHING was sent to "
            "%s. The message is below so local development can still follow the link.\n"
            "Subject: %s\n%s",
            to_email, subject, body,
        )
        return False
    try:
        if transport == "resend_api":
            _send_via_resend_api(resend_api_key(), to_email, subject, body)
        else:
            _send_via_smtp(to_email, subject, body)
    except (OSError, smtplib.SMTPException, httpx.HTTPError, RuntimeError) as exc:
        # OSError is DNS, refused connections and timeouts; SMTPException is auth and refused
        # recipients; HTTPError and RuntimeError are the HTTPS path above.
        logger.error("Failed to send %r via %s (from %s): %r",
                     subject, transport, SMTP_FROM_EMAIL, exc)
        # repr rather than str, because several SMTPException subclasses stringify to nothing.
        _last_error = _redact(exc)
        _last_error_at = _now()
        return False
    logger.info("Sent %r", subject)
    _last_success_at = _now()
    _last_error = None
    _last_error_at = None
    return True
