"""Paying once, and having it follow you.

The shop is not open — SHOP.checkout is empty in the game and LEMON_STORE is unset here — so
these test the parts that do not need Lemon Squeezy to answer: that a key is one account's, that
an unpaid account is unpaid, and that being paid takes the free run out of the way entirely."""
import uuid

from sqlalchemy import select

from app.database import SessionLocal
from app.models import Licence, Player


def _pay(email: str, key: str):
    """What a successful activation leaves behind, written directly — the call to Lemon Squeezy
    is theirs to answer and not something to reach across the internet for in a test."""
    with SessionLocal() as db:
        p = db.scalar(select(Player).where(Player.email == email))
        db.add(Licence(player_id=p.id, key=key, active=True))
        db.commit()


def test_an_account_starts_unpaid(client, signed_up):
    assert client.get("/licence", headers=signed_up["h"]).json()["paid"] is False


def test_paying_ends_the_free_run_whatever_the_count(client, signed_up):
    for w in range(1, 13):
        client.post("/run/week", headers=signed_up["h"], json={"game_id": "g", "game_week": w})
    assert client.get("/run", headers=signed_up["h"]).json()["over"] is True
    _pay(signed_up["email"], "KEY-" + uuid.uuid4().hex[:12])
    s = client.get("/run", headers=signed_up["h"]).json()
    assert s["paid"] is True
    assert s["over"] is False, "paid is paid — the twelve weeks stop mattering"
    assert s["weeks_left"] is None, "and there is no countdown to show somebody who has paid"


def test_the_licence_follows_the_account_not_the_browser(client, signed_up):
    _pay(signed_up["email"], "KEY-" + uuid.uuid4().hex[:12])
    fresh = client.post("/auth/login", json={"email": signed_up["email"],
                                             "password": "a long enough password"})
    h2 = {"Authorization": "Bearer " + fresh.json()["token"]}
    assert client.get("/licence", headers=h2).json()["paid"] is True


def test_one_key_does_not_open_two_accounts(client, signed_up):
    key = "KEY-" + uuid.uuid4().hex[:12]
    _pay(signed_up["email"], key)
    other = client.post("/auth/signup", json={"email": f"o-{uuid.uuid4().hex[:8]}@example.com",
                                              "password": "another long password"}).json()
    r = client.post("/licence/activate", headers={"Authorization": "Bearer " + other["token"]},
                    json={"key": key})
    assert r.status_code == 409, "otherwise one $12 key opens the game for a forum"


def test_the_key_is_not_handed_back_in_full(client, signed_up):
    key = "KEY-" + uuid.uuid4().hex[:12]
    _pay(signed_up["email"], key)
    body = client.get("/licence", headers=signed_up["h"]).json()
    assert body["key_tail"] and body["key_tail"].startswith("…")
    assert key not in str(body), "enough to recognise the receipt, not enough to be the receipt"


def test_the_shop_being_shut_is_said_plainly(client, signed_up, monkeypatch):
    from app.config import settings
    monkeypatch.setattr(type(settings), "ls_api", "", raising=False)
    r = client.post("/licence/activate", headers=signed_up["h"], json={"key": "ABCDEFGH"})
    assert r.status_code == 503


def test_nobody_signed_in_sees_no_licence(client):
    assert client.get("/licence").status_code in (401, 403)
