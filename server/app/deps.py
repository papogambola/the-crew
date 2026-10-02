"""Who is asking. One dependency, used by everything that is not sign-up, sign-in or a reset."""
import base64
import binascii
from datetime import timezone

from fastapi import Depends, HTTPException, Request, status
from sqlalchemy import select
from sqlalchemy.orm import Session

from app.config import settings
from app.database import get_db
from app.models import Player
from app.rate_limit import admin_failed, guard_admin
from app.security import check_password, normalize_email, read_token


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


def current_admin(p: Player = Depends(current_player)) -> Player:
    """The one account that may write press passes.

    Signed in AND on the address in ADMIN_EMAIL — the token alone is not enough, and the address
    alone is not either, because getting a token means knowing that account's password.

    404, not 403. A 403 tells somebody who found the endpoint that it exists and that they are
    simply not the right person, which is an invitation to work out who is; a 404 says there is
    nothing here. It is the same reasoning as the sign-in screen refusing to say which half of a
    wrong pair was wrong."""
    if not settings.is_admin(p.email):
        raise HTTPException(status.HTTP_404_NOT_FOUND, "Not found.")
    return p


def admin_page(request: Request, db: Session = Depends(get_db)) -> Player:
    """The same admin rule as `current_admin`, for something a BROWSER ADDRESS BAR has to reach.

    `current_admin` wants `Authorization: Bearer <jwt>`, and there is no way to type a URL into a
    browser and have it send one. The analytics dashboard is a page somebody opens; a page that
    can only be fetched by a script is not a page. The alternatives were worse:

      a secret path            — "merely hidden", which is the thing to avoid. A URL ends up in a
                                 history, a bookmark sync, a screenshot. It is a password that
                                 cannot be changed and is sent to every proxy in the way.
      a public shell that      — the data stays safe, but anybody who finds the path gets a login
      signs in with the token    box, and "there is an admin panel here" is itself worth not
                                 saying. It also means a second sign-in flow to maintain.
      a cookie                 — the whole server is deliberately cookie-free (CORS is set up with
                                 allow_credentials=False) and adding one for a single page means
                                 adding CSRF thinking to a server that currently needs none.

    So: HTTP Basic, which browsers have prompted for since 1996, over TLS that Railway terminates
    anyway. The credentials are the admin's ordinary email and password — no second secret to
    store, rotate or leak. Bearer still works, because that is what the tests and any future
    script will use.

    THE THREE ANSWERS, and they are different on purpose:

      no credentials      401 with WWW-Authenticate, so the browser puts up its own prompt.
      wrong credentials   401 again. A stranger learns nothing about whether the address exists.
      a real player who   404. Identical to the answer for a path that was never built — see
      is not the admin    current_admin for why that is worth more than an honest 403.
    """
    header = request.headers.get("authorization", "")
    scheme, _, rest = header.partition(" ")
    scheme = scheme.lower()
    p: Player | None = None

    if scheme == "bearer":
        claims = read_token(rest.strip())
        if claims is not None:
            p = db.get(Player, claims["id"])
            if p is not None and _minted_before_the_password_changed(claims, p):
                p = None
    elif scheme == "basic":
        # Checked before bcrypt runs, not after: the hash is slow by design, which makes an
        # unmetered Basic endpoint a way to spend the server's CPU as well as to guess a password.
        guard_admin(request)
        try:
            email, _, password = base64.b64decode(rest.strip(), validate=True).decode("utf-8").partition(":")
        except (binascii.Error, UnicodeDecodeError, ValueError):
            email, password = "", ""
        if email and password:
            candidate = db.scalar(
                select(Player).where(Player.email == normalize_email(email)))
            if candidate is not None and check_password(password, candidate.password_hash):
                p = candidate
        # ONLY A WRONG PASSWORD COSTS ANYTHING. The dashboard fetches four endpoints per page load
        # and the browser repeats the credentials on every one of them, so charging for success
        # meant the owner locking themselves out of their own analytics by opening the page twice.
        if p is None:
            admin_failed(request)

    if p is None:
        raise HTTPException(
            status.HTTP_401_UNAUTHORIZED, "Sign in.",
            headers={"WWW-Authenticate": 'Basic realm="The Crew", charset="UTF-8"'})
    if not settings.is_admin(p.email):
        raise HTTPException(status.HTTP_404_NOT_FOUND, "Not found.")
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
