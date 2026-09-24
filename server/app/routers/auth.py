"""Sign up, sign in, and who am I."""
from datetime import datetime, timezone

from fastapi import APIRouter, Depends, HTTPException, status
from pydantic import BaseModel, EmailStr
from sqlalchemy import select
from sqlalchemy.orm import Session

from app.database import get_db
from app.deps import current_player
from app.entitlement import state
from app.models import FreeRun, Player
from app.config import settings
from app.security import (check_password, hash_password, mint_token,
                          normalize_email, password_complaint)

router = APIRouter(prefix="/auth", tags=["auth"])


class Credentials(BaseModel):
    email: EmailStr
    password: str


class Signed(BaseModel):
    token: str
    email: str


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
