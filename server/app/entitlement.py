"""What the player is entitled to, in one place, because three screens ask and they must agree.

THERE IS NOTHING TO COMPUTE ANY MORE, AND THAT IS THE CHANGE.

This used to add up a free run: one row per game, summed here, twelve weeks on the game's calendar
across every dossier the account had ever opened — so that a new dossier was not a new run, which
was the exploit the whole file existed to close. It was careful work about a question the game no
longer asks.

The game is bought before it is played now. Not a trial with a wall at the end of it: a door. So
the only question left is whether there is a receipt, and `over` — the word every screen already
reads — means "the door is shut" rather than "the run is spent". An account with no licence has
never been open, which is exactly what it should mean for something you buy once.

`free_runs` went with it, and so did POST /run/week: a count that decides nothing is a table to
migrate, a column to explain and a number to keep truthful, for no answer anybody asks for.

There is one wrinkle since, and it is a clock rather than a count: a press pass is a licence with a
date on it. It changes nothing above — the question is still "is there a receipt" — except that a
receipt can now stop being one while nobody is looking."""
from datetime import datetime, timezone

from sqlalchemy import or_, select
from sqlalchemy.orm import Session

from app.models import Licence


def _now() -> datetime:
    return datetime.now(timezone.utc)


def _utc(dt: datetime | None) -> str | None:
    """A datetime on the wire, always with its offset on it.

    SQLite hands back naive datetimes whatever the column says and Postgres hands back aware ones —
    conftest.py has the long version — so without this the same field is a different kind of string
    depending on which database answered. That is not a test problem: the CLIENT does arithmetic on
    this to say how many days are left, and JavaScript reads a naive ISO string as LOCAL time. A
    player nine hours east of UTC would have been told a different number of days from the one the
    server was counting, and told it wrongly.

    Stored in UTC either way, so a naive one is a UTC one that has lost its label. Give it back."""
    if dt is None:
        return None
    return (dt if dt.tzinfo is not None else dt.replace(tzinfo=timezone.utc)).isoformat()


def live_licence(db: Session, player_id: int) -> Licence | None:
    """The row that is holding the door open, or nothing.

    ACTIVE AND NOT RUN OUT. `active` is the switch a refund turns off; `expires_at` is the clock a
    press pass runs on, and null means what you bought does not expire — which is every purchase and
    every row written before passes existed.

    The comparison is done HERE and only here. A pass that has run out is not a special case the
    game has to know about: it is an account with no live licence, which is the state every screen
    already knows what to do with. That is why the wall built for a refund needed no changes to
    handle a week running out — there is one question, and it has one answer.

    Ordered so that a purchase wins over a pass. Somebody comped a week who then buys the game has
    two rows, and the one that decides what the account is must be the one that does not expire."""
    now = _now()
    rows = db.scalars(
        select(Licence)
        .where(Licence.player_id == player_id, Licence.active.is_(True))
        .where(or_(Licence.expires_at.is_(None), Licence.expires_at > now))
        .order_by(Licence.expires_at.is_(None).desc(), Licence.expires_at.desc())
    ).all()
    return rows[0] if rows else None


def has_licence(db: Session, player_id: int) -> bool:
    return live_licence(db, player_id) is not None


def ended_pass(db: Session, player_id: int) -> bool:
    """Did this account have a week, and has it run out?

    Asked only when the door is shut, and asked so that the screen can say the true thing. A wall
    that tells a reviewer their payment was refunded, when they never paid and their week simply
    ended, is the game being wrong about the one fact that person has about it."""
    return db.scalar(
        select(Licence.id)
        .where(Licence.player_id == player_id, Licence.kind == "pass")
        .where(Licence.expires_at.is_not(None), Licence.expires_at <= _now())
        .limit(1)
    ) is not None


def state(db: Session, player_id: int) -> dict:
    lic = live_licence(db, player_id)
    paid = lic is not None
    # Two names for one fact, deliberately. `paid` is what the till asks; `over` is what the game
    # asks, and it has read that word since there was a free run behind it. Keeping both means the
    # client's question — "is the door shut?" — did not have to change when the answer's reason did.
    #
    # `pass_until` is the third thing, and it is null for everybody who paid. It exists so a screen
    # can say "four days left" rather than leaving somebody on a week to find out by being stopped.
    return {
        "paid": paid,
        "over": not paid,
        "pass_until": _utc(lic.expires_at if lic is not None else None),
        # Only ever asked on a shut door, and only so the wall can say which kind of shut.
        "pass_ended": (not paid) and ended_pass(db, player_id),
    }
