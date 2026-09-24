"""Who is asking. One dependency, used by everything that is not sign-up or sign-in."""
from fastapi import Depends, HTTPException, Request, status
from sqlalchemy.orm import Session

from app.database import get_db
from app.models import Player
from app.security import read_token


def current_player(request: Request, db: Session = Depends(get_db)) -> Player:
    auth = request.headers.get("authorization", "")
    token = auth[7:].strip() if auth[:7].lower() == "bearer " else ""
    pid = read_token(token)
    if pid is None:
        # 401 and nothing else. Not "no such account", not "expired" — a sign-in screen that
        # distinguishes between those is a sign-in screen that answers questions for somebody
        # working through a list of addresses.
        raise HTTPException(status.HTTP_401_UNAUTHORIZED, "Sign in again.")
    p = db.get(Player, pid)
    if p is None:
        raise HTTPException(status.HTTP_401_UNAUTHORIZED, "Sign in again.")
    return p
