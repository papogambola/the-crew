"""What the player is entitled to, in one place, because three screens ask and they must agree.

Sum, not max. The free run is the total across every game this account has played — one row per
game, summed here — so a new dossier is not a new run. That was the whole complaint."""
from sqlalchemy import func, select
from sqlalchemy.orm import Session

from app.config import settings
from app.models import FreeRun, Licence


def weeks_total(db: Session, player_id: int) -> int:
    return int(db.scalar(
        select(func.coalesce(func.sum(FreeRun.weeks), 0)).where(FreeRun.player_id == player_id)
    ) or 0)


def has_licence(db: Session, player_id: int) -> bool:
    return db.scalar(
        select(Licence.id).where(Licence.player_id == player_id, Licence.active.is_(True))
    ) is not None


def state(db: Session, player_id: int) -> dict:
    weeks = weeks_total(db, player_id)
    paid = has_licence(db, player_id)
    return {
        "weeks_played": weeks,
        "free_weeks": settings.free_weeks,
        "weeks_left": None if paid else max(0, settings.free_weeks - weeks),
        "paid": paid,
        # The one the game actually asks: is the door shut?
        "over": (not paid) and weeks >= settings.free_weeks,
    }
