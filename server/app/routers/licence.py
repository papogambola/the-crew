"""Paying, once, for good — and having it follow you.

The old shape: the player pasted a Lemon Squeezy key, the BROWSER validated it against Lemon
Squeezy's API and kept the answer in localStorage. Two things wrong with that. The answer lived
in one browser, so a person who paid on a laptop was unpaid on a desktop and had to find the
receipt again. And the answer was a value in localStorage, which is to say it was whatever the
player typed into the console.

Now the server does the asking and the answer is a row against the account. The key is activated
once, here, and from then on the game asks us, not Lemon Squeezy — so the shop being down does
not shut the door on somebody who has already paid."""
import json
import urllib.parse
import urllib.request
from datetime import datetime, timezone

from fastapi import APIRouter, Depends, HTTPException, status
from pydantic import BaseModel, Field
from sqlalchemy import select
from sqlalchemy.orm import Session

from app.config import settings
from app.database import get_db
from app.deps import current_player
from app.entitlement import state
from app.models import Licence, Player

router = APIRouter(prefix="/licence", tags=["licence"])


class KeyIn(BaseModel):
    key: str = Field(min_length=8, max_length=128)


def _ask_lemon(path: str, fields: dict) -> dict:
    """One call to Lemon Squeezy. Raises on anything that is not a clear answer.

    Kept to urllib rather than a client library: it is two calls in the whole service and a
    dependency that has to be kept up to date is a dependency that stops the app booting one
    morning for a reason nobody remembers."""
    body = urllib.parse.urlencode({k: v for k, v in fields.items() if v}).encode()
    req = urllib.request.Request(
        settings.ls_api + path, data=body,
        headers={"Accept": "application/json", "Content-Type": "application/x-www-form-urlencoded"},
    )
    with urllib.request.urlopen(req, timeout=12) as r:
        return json.loads(r.read().decode("utf-8"))


@router.get("")
def read(p: Player = Depends(current_player), db: Session = Depends(get_db)):
    lic = db.scalar(select(Licence).where(Licence.player_id == p.id, Licence.active.is_(True)))
    return {**state(db, p.id),
            "key_tail": ("…" + lic.key[-6:]) if lic else None,
            "name": lic.name if lic else None}


@router.post("/activate")
def activate(body: KeyIn, p: Player = Depends(current_player), db: Session = Depends(get_db)):
    key = body.key.strip()
    if not settings.ls_api:
        raise HTTPException(status.HTTP_503_SERVICE_UNAVAILABLE, "The shop is not open yet.")

    existing = db.scalar(select(Licence).where(Licence.key == key))
    if existing and existing.player_id != p.id:
        # One key, one account. Otherwise a single $12 key opens the game for a forum.
        raise HTTPException(status.HTTP_409_CONFLICT,
                            "That key is already on another account. If it should be on this one, write to us.")
    if existing:
        return {**state(db, p.id), "already": True}

    try:
        data = _ask_lemon("activate", {"license_key": key, "instance_name": f"player-{p.id}"})
    except Exception:
        # Their outage is not the player's fault and not a reason to tell them their key is bad.
        raise HTTPException(status.HTTP_503_SERVICE_UNAVAILABLE,
                            "The shop did not answer. Nothing is lost — try again in a minute.")

    if not data.get("activated"):
        raise HTTPException(status.HTTP_400_BAD_REQUEST,
                            (data.get("error") or "That key was not accepted."))

    meta = data.get("meta") or {}
    if settings.ls_store and str(meta.get("store_id", "")) != str(settings.ls_store):
        raise HTTPException(status.HTTP_400_BAD_REQUEST, "That key is for a different shop.")
    if settings.ls_product and str(meta.get("product_id", "")) != str(settings.ls_product):
        raise HTTPException(status.HTTP_400_BAD_REQUEST, "That key is for a different product.")

    inst = (data.get("instance") or {})
    db.add(Licence(
        player_id=p.id, key=key,
        instance_id=str(inst.get("id") or "") or None,
        name=(meta.get("customer_name") or None),
        store_id=str(meta.get("store_id") or "") or None,
        product_id=str(meta.get("product_id") or "") or None,
        active=True, checked_at=datetime.now(timezone.utc),
    ))
    db.commit()
    return {**state(db, p.id), "already": False}
