"""The rows. Each one exists because something in the game had nowhere authoritative to live.

    Player         who they are. The thing a save can belong to and a licence can be bought by.
    PasswordReset  one way back in, good once — because otherwise forgetting is permanent.
    Save           the crew itself, so it stops living in one browser.
    Licence        what they paid for, attached to the person rather than to a browser.

There was a FreeRun here — the twelve weeks, a row per game, summed — and the game is bought
before it is played now, so nothing asks how many weeks anybody has had. The table is dropped in
the migration that removed it rather than left to sit there answering a question nobody puts.

Kept apart rather than as columns on Player because they have different lifetimes: a player is
forever, a save is rewritten every week, and a licence is a receipt. Also because the day the
save moves here, Player is what it hangs off, and a wide Player row is the thing that gets in the
way."""
from datetime import datetime, timezone

from sqlalchemy import (Boolean, DateTime, ForeignKey, Integer, String, Text,
                        UniqueConstraint)
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.database import Base


def _now() -> datetime:
    return datetime.now(timezone.utc)


class Player(Base):
    __tablename__ = "players"

    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    # Stored lower-cased and stripped; see security.normalize_email. Unique, so "Paz@x.com" and
    # "paz@x.com" cannot become two accounts, one of them paid and the other locked out.
    email: Mapped[str] = mapped_column(String(320), unique=True, nullable=False, index=True)
    password_hash: Mapped[str] = mapped_column(String(255), nullable=False)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=_now, nullable=False)
    last_seen_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)
    # Not a role system. One flag, for the one person who needs to look at a number.
    is_admin: Mapped[bool] = mapped_column(Boolean, default=False, nullable=False)
    # When the password last changed, and therefore the moment before which no session is any
    # good any more. A sign-in token here is a signed JWT with a 60-day life and no row behind
    # it, so there is nothing to delete to end a session — without this column, resetting a
    # password would leave whoever prompted the reset signed in for two months. deps.py compares
    # a token's `iat` against it. Null on every account that has never reset, which lets every
    # token predating this column carry on working.
    pw_changed_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)

    licences: Mapped[list["Licence"]] = relationship(back_populates="player")
    saves: Mapped[list["Save"]] = relationship(back_populates="player")
    resets: Mapped[list["PasswordReset"]] = relationship(back_populates="player")


class PasswordReset(Base):
    """One way back in, good once, good for an hour.

    **Only the hash is stored**, for the same reason the password is: the row is what a leaked
    database hands over, and a table of live reset tokens is a table of accounts anybody can walk
    into. SHA-256 rather than bcrypt because the token is 32 random bytes from `secrets` — there
    is no dictionary to slow an attacker down against, so the work factor would buy nothing and
    cost a fifth of a second on every attempt.

    Used and expired rows are kept rather than deleted. They are small, and "that link was
    already used" is a different sentence from "no such link" when somebody writes in."""
    __tablename__ = "password_resets"

    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    player_id: Mapped[int] = mapped_column(ForeignKey("players.id", ondelete="CASCADE"),
                                           nullable=False, index=True)
    token_hash: Mapped[str] = mapped_column(String(64), nullable=False, unique=True, index=True)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=_now, nullable=False)
    expires_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), nullable=False)
    used_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)

    player: Mapped[Player] = relationship(back_populates="resets")


class Licence(Base):
    """A receipt: one order, against one account, for good.

    A row rather than a column because a player may buy again — a gift, a second order, a
    replacement after a refund — and the history of what was bought is worth more than the
    latest value of a field. `active` is what the game asks about.

    `key` is Stripe's checkout session id (cs_...) — or, for a press pass, the invite code itself,
    normalised — and it is unique for the reason it always was: one order opens one account, and
    one code does too. That the database enforces it rather than a check somebody remembers to
    write is the whole point of putting the code in this column. It held a Lemon Squeezy licence key before, which the
    player had to copy out of an email and paste into the game. Nobody pastes anything now — the
    webhook writes this row — so the column keeps its name and its job and loses its typing.

    The rest is what a support question actually needs answered. `payment_intent` is what Stripe
    wants quoted for a refund; `email` is who paid, kept separately from the account's own address
    because the two differ more often than anybody expects — a partner's card, a work address on
    the receipt — and a mismatch is not a fraud signal, it is the normal case for a gift."""
    __tablename__ = "licences"
    __table_args__ = (UniqueConstraint("key", name="uq_licences_key"),)

    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    player_id: Mapped[int] = mapped_column(ForeignKey("players.id", ondelete="CASCADE"),
                                           nullable=False, index=True)
    key: Mapped[str] = mapped_column(String(128), nullable=False)
    payment_intent: Mapped[str | None] = mapped_column(String(128), nullable=True)
    name: Mapped[str | None] = mapped_column(String(200), nullable=True)
    email: Mapped[str | None] = mapped_column(String(320), nullable=True)
    price_id: Mapped[str | None] = mapped_column(String(64), nullable=True)
    # What they actually paid, in the smallest unit, and in what. Stored rather than assumed:
    # the price can change, and a receipt that says "$12" because $12 is what the code charges
    # today is not a receipt.
    amount: Mapped[int | None] = mapped_column(Integer, nullable=True)
    currency: Mapped[str | None] = mapped_column(String(8), nullable=True)
    active: Mapped[bool] = mapped_column(Boolean, default=True, nullable=False)
    # WHAT THIS ROW IS. "purchase" is somebody who paid and keeps it; "pass" is a code handed to a
    # reviewer. Written down rather than worked out from whether `amount` is null, because a
    # heuristic is a thing that is right until the day somebody is comped a refund.
    kind: Mapped[str] = mapped_column(String(16), default="purchase", nullable=False)
    # WHEN IT RUNS OUT, and null is the ordinary case: what you buy does not expire. A pass carries
    # a date, counted in real days from the moment the code was redeemed — see invites.expiry. The
    # game asks entitlement.has_licence, which is the one place that compares this to the clock.
    expires_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)
    activated_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=_now, nullable=False)
    checked_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)

    player: Mapped[Player] = relationship(back_populates="licences")


class Save(Base):
    """A dossier, kept where a cleared cache cannot reach it.

    One row per game, keyed by the save's own seed, because a player may have several going and
    losing the one they were not looking at is still losing it.

    `rev` is what makes two machines safe. The client counts its own saves and sends the number;
    the server takes a save only if its rev is HIGHER than the one it holds, and otherwise hands
    back what it has. Last-write-wins would be simpler and would quietly eat the evening somebody
    played on the laptop while the desktop still had the tab open.

    The blob is the same packed state the browser has always written to localStorage, as text. It
    is not read here, and deliberately not: the day the game becomes rows is step 4 of the audit,
    and until then the server's job is to hold this safely, not to understand it."""
    __tablename__ = "saves"
    __table_args__ = (UniqueConstraint("player_id", "game_id", name="uq_saves_player_game"),)

    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    player_id: Mapped[int] = mapped_column(ForeignKey("players.id", ondelete="CASCADE"),
                                           nullable=False, index=True)
    game_id: Mapped[str] = mapped_column(String(64), nullable=False)
    rev: Mapped[int] = mapped_column(Integer, default=0, nullable=False)
    blob: Mapped[str] = mapped_column(Text, nullable=False)
    # Enough to tell one dossier from another on a list without unpacking any of them.
    label: Mapped[str | None] = mapped_column(String(120), nullable=True)
    week: Mapped[int] = mapped_column(Integer, default=1, nullable=False)
    updated_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=_now,
                                                 onupdate=_now, nullable=False)

    player: Mapped[Player] = relationship(back_populates="saves")
