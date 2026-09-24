"""The free run: twelve weeks on the game's calendar, counted where the player cannot reach them.

The endpoint takes a GAME and a WEEK, not an increment. The server keeps the highest week each
game reached and adds them up, which gives three properties worth having:

  - a new dossier is not a new run. Twelve weeks in one game plus three in the next is fifteen.
    Counting a single number per account and only moving it forward would have handed the free
    run back to anybody who started again, which is the exploit this exists to close.
  - it cannot be put back. Only a higher week for that game is written.
  - it is idempotent. The same week reported twice writes the same number twice, so a retry
    after a dropped connection costs nobody a week.

What it does NOT do is prove a week happened. The game still runs on the client, so somebody
determined can decline to report one. That closes at step 4 of the audit, when the server runs
the week itself. This is the honest half: the count cannot be reset and cannot be reversed."""
from datetime import datetime, timezone

from fastapi import APIRouter, Depends
from pydantic import BaseModel, Field
from sqlalchemy import select
from sqlalchemy.orm import Session

from app.database import get_db
from app.deps import current_player
from app.entitlement import state
from app.models import FreeRun, Player

router = APIRouter(prefix="/run", tags=["run"])


class WeekDone(BaseModel):
    # The dossier this week belongs to — the save's seed, stable for the life of a game and
    # different for every new one.
    game_id: str = Field(min_length=1, max_length=64)
    # Which week of that game just ended. A name for the week, not a number to add.
    game_week: int = Field(ge=1, le=100000)


class RunState(BaseModel):
    weeks_played: int
    free_weeks: int
    weeks_left: int | None
    paid: bool
    over: bool


@router.get("", response_model=RunState)
def read(p: Player = Depends(current_player), db: Session = Depends(get_db)):
    return RunState(**state(db, p.id))


@router.post("/week", response_model=RunState)
def week_done(body: WeekDone, p: Player = Depends(current_player), db: Session = Depends(get_db)):
    row = db.scalar(select(FreeRun).where(FreeRun.player_id == p.id, FreeRun.game_id == body.game_id))
    now = datetime.now(timezone.utc)
    if row is None:
        row = FreeRun(player_id=p.id, game_id=body.game_id, weeks=0, first_week_at=now)
        db.add(row)
    if body.game_week > row.weeks:
        row.weeks = body.game_week
        row.last_week_at = now
    db.commit()
    return RunState(**state(db, p.id))
