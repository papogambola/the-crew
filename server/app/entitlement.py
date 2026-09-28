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
migrate, a column to explain and a number to keep truthful, for no answer anybody asks for."""
from sqlalchemy import select
from sqlalchemy.orm import Session

from app.models import Licence


def has_licence(db: Session, player_id: int) -> bool:
    return db.scalar(
        select(Licence.id).where(Licence.player_id == player_id, Licence.active.is_(True))
    ) is not None


def state(db: Session, player_id: int) -> dict:
    paid = has_licence(db, player_id)
    # Two names for one fact, deliberately. `paid` is what the till asks; `over` is what the game
    # asks, and it has read that word since there was a free run behind it. Keeping both means the
    # client's question — "is the door shut?" — did not have to change when the answer's reason did.
    return {"paid": paid, "over": not paid}
