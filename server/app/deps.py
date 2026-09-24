"""Who is asking. One dependency, used by everything that is not sign-up, sign-in or a reset."""
from datetime import timezone

from fastapi import Depends, HTTPException, Request, status
from sqlalchemy.orm import Session

from app.database import get_db
from app.models import Player
from app.security import read_token


def current_player(request: Request, db: Session = Depends(get_db)) -> Player:
    auth = request.headers.get("authorization", "")
    token = auth[7:].strip() if auth[:7].lower() == "bearer " else ""
    claims = read_token(token)
    if claims is None:
        # 401 and nothing else. Not "no such account", not "expired" — a sign-in screen that
        # distinguishes between those is a sign-in screen that answers questions for somebody
        # working through a list of addresses.
        raise HTTPException(status.HTTP_401_UNAUTHORIZED, "Sign in again.")
    p = db.get(Player, claims["id"])
    if p is None:
        raise HTTPException(status.HTTP_401_UNAUTHORIZED, "Sign in again.")
    if _minted_before_the_password_changed(claims, p):
        raise HTTPException(status.HTTP_401_UNAUTHORIZED, "Sign in again.")
    return p


def _minted_before_the_password_changed(claims: dict, p: Player) -> bool:
    """Whether this token belongs to a life of the account that has ended.

    A token here is a signed JWT with a 60-day life and no row behind it, so there is nothing to
    delete when somebody resets their password — and the person most likely to be resetting it is
    the one who thinks a stranger got in. Without this, the reset would change the lock and leave
    the stranger's key working until November.

    No slack, and none needed. `pw_changed_at` carries microseconds and `iat` is whole seconds,
    so the comparison is against the floor of the change — and the token /auth/reset hands back
    is minted *after* the column is written, so its own second is never less than that floor.
    Strictly-less-than is what keeps that token alive: an equal second is the session that was
    just granted, and signing somebody out of it would read as the reset having failed.
    """
    changed = p.pw_changed_at
    if changed is None:
        return False
    if changed.tzinfo is None:
        # SQLite hands back naive datetimes whatever the column says. Postgres does not, but the
        # tests run on SQLite precisely so that this sort of difference is found here.
        changed = changed.replace(tzinfo=timezone.utc)
    return claims["iat"] < int(changed.timestamp())
