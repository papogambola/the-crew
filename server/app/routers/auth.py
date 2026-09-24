"""Sign up, sign in, who am I — and the way back in for somebody who has forgotten."""
from datetime import datetime, timedelta, timezone

from fastapi import APIRouter, Depends, HTTPException, Request, status
from pydantic import BaseModel, EmailStr
from sqlalchemy import select
from sqlalchemy.orm import Session

from app import rate_limit
from app.database import get_db
from app.deps import current_player
from app.emailer import send_email
from app.entitlement import state
from app.models import FreeRun, PasswordReset, Player
from app.config import settings
from app.security import (check_password, hash_password, hash_reset_token,
                          mint_token, new_reset_token, normalize_email,
                          password_complaint)

router = APIRouter(prefix="/auth", tags=["auth"])


class Credentials(BaseModel):
    email: EmailStr
    password: str


class Signed(BaseModel):
    token: str
    email: str


class Forgotten(BaseModel):
    email: EmailStr


class NewPassword(BaseModel):
    token: str
    password: str


class Said(BaseModel):
    message: str


def _me(db: Session, p: Player) -> dict:
    return {"email": p.email, **state(db, p.id)}


@router.post("/signup", response_model=Signed, status_code=status.HTTP_201_CREATED)
def signup(body: Credentials, db: Session = Depends(get_db)):
    email = normalize_email(body.email)
    complaint = password_complaint(body.password)
    if complaint:
        raise HTTPException(status.HTTP_400_BAD_REQUEST, complaint)
    if db.scalar(select(Player).where(Player.email == email)):
        # Said plainly. Hiding it behind "check your email" protects an address list that a
        # sign-in form leaks anyway, at the cost of a real person not understanding why they
        # cannot get in.
        raise HTTPException(status.HTTP_409_CONFLICT, "There is already an account on that address. Sign in instead.")
    p = Player(email=email, password_hash=hash_password(body.password))
    db.add(p)
    db.flush()
    # No free-run row is created here. There is one per GAME now, written the first time a week
    # of that game is reported — an account with no games has played no weeks, and the sum of an
    # empty set is nought without anybody having to store it.
    db.commit()
    return Signed(token=mint_token(p.id), email=p.email)


@router.post("/login", response_model=Signed)
def login(body: Credentials, db: Session = Depends(get_db)):
    email = normalize_email(body.email)
    p = db.scalar(select(Player).where(Player.email == email))
    # The same answer whether the address is unknown or the password is wrong, and the hash is
    # checked either way so the two do not take measurably different amounts of time.
    ok = check_password(body.password, p.password_hash if p else "$2b$12$" + "x" * 53)
    if not p or not ok:
        raise HTTPException(status.HTTP_401_UNAUTHORIZED, "That address and password do not go together.")
    p.last_seen_at = datetime.now(timezone.utc)
    db.commit()
    return Signed(token=mint_token(p.id), email=p.email)


@router.get("/me")
def me(p: Player = Depends(current_player), db: Session = Depends(get_db)):
    return _me(db, p)


def _window() -> str:
    """How long a link lasts, in words. Built from the setting rather than typed.

    It is said on two screens and in the email, and the game has no way of knowing it — so if it
    were typed it would be typed three times and RESET_TTL_MINUTES would quietly stop being true
    in all three."""
    m = settings.reset_minutes
    if m == 60:
        return "an hour"
    if m % 60 == 0:
        return f"{m // 60} hours"
    return f"{m} minutes"


# The same sentence whichever way it goes. Written once so the two exits cannot drift apart —
# two spellings of "the same answer" is how an endpoint accidentally starts telling people which
# addresses have accounts.
SENT = ("If there is an account on that address, a link to set a new password is on its way. "
        f"It works once, and it stops working in {_window()}.")


@router.post("/forgot", response_model=Said)
def forgot(body: Forgotten, request: Request = None, db: Session = Depends(get_db)):
    """Send the way back in — or don't, and say the same thing either way.

    The reply does not depend on whether the address exists. /auth/signup does say plainly when an
    address is taken, so this is not a secret being kept perfectly; the difference is that sign-up
    tells somebody who is trying to use the address, one at a time, whereas an answer that varies
    here is a machine-readable list of every customer, fetched at whatever rate the network
    allows. Hence also the rate limit, which is the more important half: each call sends mail to
    an address the caller chose, so an unbounded one is a way to have this domain deliver post on
    a stranger's behalf, until the domain's reputation is gone.
    """
    email = normalize_email(body.email)
    rate_limit.guard_reset(request, email)

    p = db.scalar(select(Player).where(Player.email == email))
    if p is None:
        return Said(message=SENT)

    raw = new_reset_token()
    db.add(PasswordReset(
        player_id=p.id,
        token_hash=hash_reset_token(raw),
        expires_at=datetime.now(timezone.utc) + timedelta(minutes=settings.reset_minutes),
    ))
    db.commit()

    # Older links are deliberately left alive. Somebody who presses the button twice because the
    # first email was slow should not find that the first link they open is the dead one.
    link = f"{settings.site_url}/reset.html?t={raw}"
    send_email(
        p.email,
        "Set a new password for The Crew",
        "Somebody asked to set a new password on this account.\n\n"
        f"{link}\n\n"
        f"The link works once and stops working in {_window()}.\n\n"
        "If that was not you, nothing has happened yet and you can ignore this. Your password "
        "has not changed and nobody has been let in.\n",
    )
    # Whether the mail actually went is deliberately not in the reply: see emailer.py. /health
    # says whether mail is working at all.
    return Said(message=SENT)


@router.post("/reset", response_model=Signed)
def reset(body: NewPassword, db: Session = Depends(get_db)):
    """Spend the link, set the password, and hand back a signed-in session.

    Signed in rather than "now go and log in", because the person doing this has just proved they
    hold the address and has this minute chosen the password — a sign-in form immediately
    afterwards tests nothing and is one more chance to mistype.
    """
    complaint = password_complaint(body.password)
    if complaint:
        # Checked before the token is spent. Refusing a too-short password AND burning the only
        # link in the same breath is how one typo turns into a second email.
        raise HTTPException(status.HTTP_400_BAD_REQUEST, complaint)

    row = db.scalar(select(PasswordReset)
                    .where(PasswordReset.token_hash == hash_reset_token(body.token)))
    now = datetime.now(timezone.utc)
    # SQLite hands back naive datetimes whatever the column says; Postgres does not. Comparing a
    # naive one to an aware one raises TypeError, which would be a 500 on a perfectly ordinary
    # expired link. The tests run on SQLite so that this sort of thing is found here.
    expires = row.expires_at if row else None
    if expires is not None and expires.tzinfo is None:
        expires = expires.replace(tzinfo=timezone.utc)
    if row is None or row.used_at is not None or expires < now:
        # One sentence for all three — unknown, spent, stale. They need the same thing done about
        # them, and naming which it was tells anybody holding a guessed token whether they guessed.
        raise HTTPException(status.HTTP_400_BAD_REQUEST,
                            "That link is no good any more. Ask for another one.")

    p = db.get(Player, row.player_id)
    if p is None:
        raise HTTPException(status.HTTP_400_BAD_REQUEST,
                            "That link is no good any more. Ask for another one.")

    p.password_hash = hash_password(body.password)
    # What ends every session minted before this moment — including whoever's presence prompted
    # the reset. See deps._minted_before_the_password_changed.
    p.pw_changed_at = now
    row.used_at = now
    # Every other outstanding link for this account dies too. Otherwise a stranger who asked for
    # a reset an hour ago still has a live one, and the person putting the account back in order
    # has not actually put it back in order.
    for other in db.scalars(select(PasswordReset).where(
            PasswordReset.player_id == p.id, PasswordReset.used_at.is_(None))):
        other.used_at = now
    p.last_seen_at = now
    db.commit()
    return Signed(token=mint_token(p.id), email=p.email)
