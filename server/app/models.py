"""The rows. Each one exists because something in the game had nowhere authoritative to live.

    Player         who they are. The thing a save can belong to and a licence can be bought by.
    PasswordReset  one way back in, good once — because otherwise forgetting is permanent.
    Save           the crew itself, so it stops living in one browser.
    Licence        what they paid for, attached to the person rather than to a browser.
    PlaySession    one sitting, and how much of it was play. Knows nobody's name.
    PlayMilestone  that a sitting got past a minute, five, fifteen, half an hour, an hour, two.

There was a FreeRun here — the twelve weeks, a row per game, summed — and the game is bought
before it is played now, so nothing asks how many weeks anybody has had. The table is dropped in
the migration that removed it rather than left to sit there answering a question nobody puts.

Kept apart rather than as columns on Player because they have different lifetimes: a player is
forever, a save is rewritten every week, and a licence is a receipt. Also because the day the
save moves here, Player is what it hangs off, and a wide Player row is the thing that gets in the
way."""
from datetime import datetime, timezone

from sqlalchemy import (BigInteger, Boolean, DateTime, ForeignKey, Index, Integer,
                        String, Text, UniqueConstraint)
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


# ======================= WHAT IS WATCHED, AND WHAT IS NOT =======================
#
# These two tables answer one question — how long is the game actually played for — and they are
# built so that they CANNOT answer any other. There is no email on them, no account id, no IP
# address, no user agent, no country, no screen size, no name of anything that happened in the
# game. A row says: an anonymous id nobody can turn back into a person, when a sitting began,
# when it was last heard from, and how many milliseconds of it were play.
#
# WHY NOT HANG IT OFF Player. The game is bought before it is played, so very nearly everybody
# measured here HAS an account and joining to it would have been one foreign key. That is exactly
# why it is not done: the moment the row knows which account it is, "how long do people play for"
# and "how long does THIS PERSON play for" are the same query, and the second one is a question
# about somebody who was never asked. A column is a promise about what can be asked later.
#
# WHAT IS THEREFORE IMPOSSIBLE, and is meant to be: no "which of my customers is drifting away",
# no mailing the people who played twice and stopped. If that is ever wanted it is a new decision
# with a new migration and, properly, a word to the people it is about — not a join somebody
# notices is available.


class PlaySession(Base):
    """One sitting at the game.

    NOT one visit to the page, and not the gap between opening a tab and closing it. A tab left
    open overnight on a title screen is the easiest number in the world to collect and it is a
    lie — the sort that makes "average session: 4 hours" and a developer who believes it. What is
    counted here is time the tab was visible AND somebody was touching it; see analytics.py for
    the arithmetic and play.html for the half of it that runs in the browser.

    THE CLIENT MEASURES IT AND THE SERVER DOES NOT BELIEVE IT. The browser is the only thing that
    knows whether the tab is visible or whether a key has been pressed, so it has to be the one
    counting. It is also a file on a stranger's computer that they can edit, so every beat is
    clamped against this row's own wall-clock on arrival: a session can never have accrued more
    active time than has passed since it started, and never less than it had a moment ago. The
    worst a tampered client can do is claim all of its real elapsed time as play.

    HOW AN ABANDONED ONE ENDS. `ended_at` is written when the browser says goodbye — and browsers
    very often do not: a closed laptop, a killed tab, a train going into a tunnel. So the honest
    end of a session is `ended_at or last_beat_at`, and a session with no goodbye is worth exactly
    as much as its last checkpoint rather than running until somebody notices. That is the whole
    reason heartbeats exist rather than a single call at each end.

    `is_new` and `session_no` are decided HERE, on the first beat, by asking whether this anonymous
    id has been seen before. Written down rather than worked out at read time because "was this
    their first sitting" is a fact about the moment it happened, and a query that recomputes it
    changes its mind every time the range filter moves."""
    __tablename__ = "play_sessions"
    __table_args__ = (
        UniqueConstraint("session_id", name="uq_play_sessions_session_id"),
        # The two shapes every dashboard query has: a window of time, and one player's history.
        Index("ix_play_sessions_started_at", "started_at"),
        Index("ix_play_sessions_anon_started", "anon_id", "started_at"),
    )

    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    # 32 hex characters the browser made up once and kept. Not derived from anything about the
    # person or the machine — a cleared cache is a new player here, and that is the right trade.
    anon_id: Mapped[str] = mapped_column(String(64), nullable=False, index=True)
    session_id: Mapped[str] = mapped_column(String(64), nullable=False)
    started_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=_now, nullable=False)
    # Every checkpoint moves this. It is what makes an abandoned session cheap to end correctly.
    last_beat_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=_now, nullable=False)
    # Only ever set by an explicit goodbye, or by the next sitting starting. Null is the ordinary
    # state of a session that is still running AND of one that was abandoned — telling those two
    # apart is what last_beat_at is for, and the dashboard does it with a clock rather than a cron.
    ended_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)
    # BigInteger because milliseconds: a 32-bit column runs out at 24 days, which is not a limit
    # anybody will reach and is also not a limit worth having a conversation about later.
    active_ms: Mapped[int] = mapped_column(BigInteger, default=0, nullable=False)
    is_new: Mapped[bool] = mapped_column(Boolean, default=True, nullable=False)
    # Which sitting this was for this anonymous id: 1 for a first, 2 for a second.
    session_no: Mapped[int] = mapped_column(Integer, default=1, nullable=False)

    milestones: Mapped[list["PlayMilestone"]] = relationship(
        back_populates="session", cascade="all, delete-orphan")


class PlayMilestone(Base):
    """That a sitting got past a minute, five, fifteen, thirty, sixty, a hundred and twenty.

    A row rather than six boolean columns on the session, because the interesting question is
    *when* each one was crossed and a column cannot hold that.

    THE UNIQUE CONSTRAINT IS THE WHOLE MECHANISM. "Should not generate duplicate events" is not
    something to remember to check for in the code that writes them — two beats arriving at once,
    a client retrying a checkpoint it is not sure landed, and a page restored from the back/forward
    cache all produce the same crossing twice. The pair (session, minutes) is unique in the
    database, so the second one is refused by Postgres rather than by an `if`."""
    __tablename__ = "play_milestones"
    __table_args__ = (UniqueConstraint("session_pk", "minutes", name="uq_play_milestones_session_minutes"),)

    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    session_pk: Mapped[int] = mapped_column(ForeignKey("play_sessions.id", ondelete="CASCADE"),
                                            nullable=False, index=True)
    # Carried alongside the foreign key so "how many PEOPLE ever played an hour" is one query on
    # this table rather than a join. It is the same anonymous id; it reveals nothing more.
    anon_id: Mapped[str] = mapped_column(String(64), nullable=False, index=True)
    minutes: Mapped[int] = mapped_column(Integer, nullable=False)
    reached_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=_now, nullable=False)

    session: Mapped[PlaySession] = relationship(back_populates="milestones")
