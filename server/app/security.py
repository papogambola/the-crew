"""Passwords and tokens. The two things in here that are worth getting right.

bcrypt for the password, because it is what Costora uses and because a slow hash is the only
thing standing between a stolen table and every account on it. A signed token for the session,
because the alternative is a session table read on every request for a game that will be making
a lot of requests."""
import hashlib
import secrets
from datetime import datetime, timedelta, timezone

import bcrypt
import jwt

from app.config import settings

ALGORITHM = "HS256"


def normalize_email(email: str) -> str:
    """One account per person, whatever their shift key was doing.

    Lower-cased and stripped, and that is all — no stripping of dots or plus-addressing, because
    paz+crew@gmail.com is a real address a real person may want to use and deciding otherwise on
    their behalf is how you lock somebody out of the thing they paid for."""
    return (email or "").strip().lower()


def hash_password(password: str) -> str:
    return bcrypt.hashpw(password.encode("utf-8"), bcrypt.gensalt()).decode("utf-8")


def check_password(password: str, hashed: str) -> bool:
    if not password or not hashed:
        return False
    try:
        return bcrypt.checkpw(password.encode("utf-8"), hashed.encode("utf-8"))
    except (ValueError, TypeError):
        # A malformed hash is a corrupt row, not a reason to 500 on somebody's sign-in.
        return False


def password_complaint(password: str) -> str | None:
    """What is wrong with it, in words, or None.

    Length and nothing else. Character-class rules produce Passw0rd! and a sticky note; length
    is the only requirement that reliably buys anything."""
    if not password or len(password) < 10:
        return "A password needs to be at least 10 characters. Length is what makes one hard to guess."
    if len(password) > 200:
        return "That password is longer than 200 characters, which is longer than bcrypt will read."
    return None


def new_reset_token() -> str:
    """The thing that goes in the email. 32 bytes of randomness, URL-safe.

    Long enough that guessing is not a strategy, and generated rather than derived so it says
    nothing about the account it belongs to — a reset link ends up in somebody's inbox, their
    browser history, and sometimes a screenshot in a support email."""
    return secrets.token_urlsafe(32)


def hash_reset_token(token: str) -> str:
    """What is stored. SHA-256, not bcrypt — see the model for why."""
    return hashlib.sha256((token or "").encode("utf-8")).hexdigest()


def mint_token(player_id: int) -> str:
    now = datetime.now(timezone.utc)
    payload = {
        "sub": str(player_id),
        "iat": int(now.timestamp()),
        "exp": int((now + timedelta(days=settings.token_days)).timestamp()),
        # A random id per token, so a single sign-in can be talked about in a log without the
        # log holding anything that opens the account.
        "jti": secrets.token_urlsafe(8),
    }
    return jwt.encode(payload, settings.jwt_secret, algorithm=ALGORITHM)


def read_token(token: str) -> dict | None:
    """What is inside a token — `{"id": int, "iat": int}` — or None for anything wrong with it:
    expired, forged, truncated, or signed with a secret that is not ours.

    `iat` comes back as well as the id because a password reset has to be able to end sessions
    that were minted before it, and there is no session row to delete. See deps.current_player."""
    if not token:
        return None
    try:
        data = jwt.decode(token, settings.jwt_secret, algorithms=[ALGORITHM])
        return {"id": int(data["sub"]), "iat": int(data.get("iat") or 0)}
    except Exception:
        return None
