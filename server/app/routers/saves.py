"""The crew, kept somewhere a cleared cache cannot reach.

The rule that matters is in the PUT: a save is taken only if its revision is HIGHER than the one
already held. Anything else and the server hands back what it has and says no. That is what makes
two machines safe — last-write-wins would quietly eat the evening somebody played on the laptop
while the desktop still had the tab open, and losing a crew is the one thing this game must never
do to anybody."""
from fastapi import APIRouter, Depends, HTTPException, status
from pydantic import BaseModel, Field
from sqlalchemy import select
from sqlalchemy.orm import Session

from app.database import get_db
from app.deps import current_player
from app.models import Player, Save

router = APIRouter(prefix="/saves", tags=["saves"])

# A packed game is about 30KB. A megabyte is room for it to grow by thirty times before anybody
# has to think about this again, and small enough that a bad client cannot fill the disk.
MAX_BLOB = 1_000_000


class SaveIn(BaseModel):
    game_id: str = Field(min_length=1, max_length=64)
    rev: int = Field(ge=1)
    blob: str = Field(min_length=2, max_length=MAX_BLOB)
    label: str | None = Field(default=None, max_length=120)
    week: int = Field(default=1, ge=1, le=100000)


class SaveRow(BaseModel):
    game_id: str
    rev: int
    label: str | None
    week: int
    updated_at: str


def _row(s: Save) -> SaveRow:
    return SaveRow(game_id=s.game_id, rev=s.rev, label=s.label, week=s.week,
                   updated_at=s.updated_at.isoformat())


@router.get("", response_model=list[SaveRow])
def list_saves(p: Player = Depends(current_player), db: Session = Depends(get_db)):
    """Every dossier on the account, newest first. No blobs — this is the list you pick from."""
    rows = db.scalars(select(Save).where(Save.player_id == p.id)
                      .order_by(Save.updated_at.desc())).all()
    return [_row(s) for s in rows]


@router.get("/{game_id}")
def read(game_id: str, p: Player = Depends(current_player), db: Session = Depends(get_db)):
    s = db.scalar(select(Save).where(Save.player_id == p.id, Save.game_id == game_id))
    if s is None:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "No such game on this account.")
    return {"game_id": s.game_id, "rev": s.rev, "label": s.label, "week": s.week,
            "updated_at": s.updated_at.isoformat(), "blob": s.blob}


@router.put("", status_code=status.HTTP_200_OK)
def write(body: SaveIn, p: Player = Depends(current_player), db: Session = Depends(get_db)):
    s = db.scalar(select(Save).where(Save.player_id == p.id, Save.game_id == body.game_id))
    if s is None:
        s = Save(player_id=p.id, game_id=body.game_id, rev=body.rev, blob=body.blob,
                 label=body.label, week=body.week)
        db.add(s)
        db.commit()
        return {"stored": True, "rev": s.rev}

    if body.rev <= s.rev:
        # Not an error the player did anything about, so it comes back with the truth attached
        # rather than as a bare refusal: the client can then say which is newer and let them pick.
        raise HTTPException(status.HTTP_409_CONFLICT, {
            "message": "There is a newer copy of this game on the account.",
            "server_rev": s.rev, "your_rev": body.rev,
            "server_week": s.week, "server_updated_at": s.updated_at.isoformat(),
        })

    s.rev, s.blob, s.label, s.week = body.rev, body.blob, body.label, body.week
    db.commit()
    return {"stored": True, "rev": s.rev}
