"""THE DOOR: SHUT UNTIL IT IS PAID FOR.

This file replaces test_free_run.py, and the tests in it are the old ones with their answers
inverted, which is the clearest statement of what changed. It used to prove that a new account had
twelve weeks and that no amount of starting again got them back. It now proves there are none: the
game is bought before it is played.

Three things are worth a test rather than a comment.

The first is that the shut answer is the DEFAULT. A door that opens when something is missing — a
setting unread, a table dropped, a field renamed — is worse than no door, because it fails silently
and only in production. So: a brand-new account, nothing configured, is shut.

The second is that the answer is the SAME everywhere it is asked. Two endpoints report it (the game
asks /auth/me on the way up and /licence at the till) and a screen that disagrees with another one
about whether somebody has paid is the single worst bug this feature can have.

The third is that the free run is GONE rather than merely unused. POST /run/week must 404: a client
built before this change still calls it, and an endpoint that quietly accepted those calls would be
keeping a count that no longer means anything — and, worse, would read as though it still did.
"""
import uuid
from datetime import datetime, timezone

import pytest
from sqlalchemy import select

from app.database import SessionLocal
from app.models import Licence, Player

PASSWORD = "a long enough password"


def _open_account(client):
    mail = "door-%s@example.com" % uuid.uuid4().hex[:10]
    r = client.post("/auth/signup", json={"email": mail, "password": PASSWORD})
    assert r.status_code == 201, r.text
    return {"email": mail, "h": {"Authorization": "Bearer " + r.json()["token"]}}


def _player_id(email: str) -> int:
    with SessionLocal() as db:
        return db.scalar(select(Player).where(Player.email == email)).id


@pytest.fixture
def paid(signed_up):
    """A receipt against the account, written the way the webhook writes one.

    Directly rather than through /licence/stripe-hook on purpose: these tests are about what a
    licence MEANS, and going through the webhook would make every one of them also a test of
    signature checking, which test_licence.py already does thoroughly."""
    with SessionLocal() as db:
        db.add(Licence(player_id=_player_id(signed_up["email"]),
                       key="cs_test_" + uuid.uuid4().hex, amount=1200, currency="USD",
                       active=True, checked_at=datetime.now(timezone.utc)))
        db.commit()
    return True


# ------------------------------------------------------------------ shut

def test_a_new_account_is_shut(client, signed_up):
    """The inversion. This used to be `weeks_left == 12` and `over is False`."""
    s = client.get("/licence", headers=signed_up["h"]).json()
    assert s["paid"] is False
    assert s["over"] is True, "an account that has not bought the game has never been open"


def test_the_answer_carries_no_free_run_left_to_read(client, signed_up):
    """Not just zero — absent. A `weeks_left: 0` would be read by an old client as a spent run and
    by a new one as nothing at all, and the two disagree about what to show."""
    s = client.get("/licence", headers=signed_up["h"]).json()
    for gone in ("weeks_played", "free_weeks", "weeks_left"):
        assert gone not in s, gone + " is still being reported"


def test_every_screen_gets_the_same_answer(client, signed_up):
    me = client.get("/auth/me", headers=signed_up["h"]).json()
    till = client.get("/licence", headers=signed_up["h"]).json()
    assert me["paid"] == till["paid"] and me["over"] == till["over"]
    assert me["shop_open"] == till["shop_open"]


def test_the_free_run_endpoint_is_gone(client, signed_up):
    """An old build in somebody's cache still reports its weeks. It must find nothing there."""
    assert client.post("/run/week", headers=signed_up["h"],
                       json={"game_id": "seed-A", "game_week": 1}).status_code == 404
    assert client.get("/run", headers=signed_up["h"]).status_code == 404


def test_playing_a_lot_does_not_open_it(client, signed_up):
    """The old exploit ran the other way: play eleven weeks, start again, keep the twelfth. There is
    nothing to stop now, and nothing to accumulate — saving a game twenty times is not a purchase."""
    for w in range(1, 21):
        r = client.put("/saves", headers=signed_up["h"],
                       json={"game_id": "seed-A", "rev": w, "week": w,
                             "label": "A crew", "blob": "{}"})
        assert r.status_code == 200, r.text
    assert client.get("/licence", headers=signed_up["h"]).json()["over"] is True


def test_nobody_signed_in_is_told_nothing(client):
    assert client.get("/licence").status_code in (401, 403)


# ------------------------------------------------------------------ open

def test_a_licence_opens_it(client, signed_up, paid):
    s = client.get("/licence", headers=signed_up["h"]).json()
    assert s["paid"] is True and s["over"] is False


def test_it_stays_open_in_a_second_browser(client, signed_up, paid):
    """The whole reason the licence is a row against the account rather than a value in a browser.
    A fresh sign-in is a second machine as far as anything here can tell."""
    fresh = client.post("/auth/login", json={"email": signed_up["email"], "password": PASSWORD})
    h2 = {"Authorization": "Bearer " + fresh.json()["token"]}
    assert client.get("/licence", headers=h2).json()["over"] is False


def test_one_account_paying_does_not_open_another(client, signed_up, paid):
    other = _open_account(client)
    assert client.get("/licence", headers=signed_up["h"]).json()["over"] is False
    assert client.get("/licence", headers=other["h"]).json()["over"] is True


def test_a_revoked_licence_shuts_it_again(client, signed_up, paid):
    """`active` is what is read, not "has ever bought". A refund is a row turned off, and the door
    has to follow it — otherwise a chargeback costs the money and keeps the game open."""
    with SessionLocal() as db:
        pid = _player_id(signed_up["email"])
        lic = db.scalar(select(Licence).where(Licence.player_id == pid))
        lic.active = False
        db.commit()
    assert client.get("/licence", headers=signed_up["h"]).json()["over"] is True
