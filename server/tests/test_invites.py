"""A WEEK, GIVEN AWAY, WITHOUT GIVING THE GAME AWAY.

A press pass is the one string in this product that opens a door without anybody paying, which
makes it the one place where getting it slightly wrong costs the price of the game every time. So
the weight here is not on the happy path — a code works, which is two lines — but on the four ways
it must refuse:

  INVENTED   somebody types a plausible-looking string. The signature has to be what answers, not
             a lookup, because there is no list to look it up in.
  ALTERED    somebody takes a real seven-day code and edits the days. The days are inside the
             signature, so they cannot.
  SPENT      one code, one account. Enforced by the unique index rather than a check, because a
             check loses to two requests at the same instant and an index does not.
  STALE      a code left unredeemed past its window is dead, so a batch handed out in September is
             not still opening doors next year.

And the fifth thing, which is not a refusal: the week is counted from REDEMPTION. Somebody who
opens the message three weeks later gets seven days, not none.
"""
import uuid
from datetime import datetime, timedelta, timezone

import pytest
from sqlalchemy import select

from app import invites
from app.config import settings
from app.database import SessionLocal
from app.models import Licence, Player

SECRET = "an-invite-secret-used-only-by-this-file"


@pytest.fixture
def invites_on(monkeypatch):
    monkeypatch.setattr(settings, "invite_secret", SECRET, raising=False)
    return SECRET


def _code(days=7, live_days=90):
    return invites.mint(SECRET, days=days, live_days=live_days)


def _player_id(email: str) -> int:
    with SessionLocal() as db:
        return db.scalar(select(Player).where(Player.email == email)).id


def _account(client):
    mail = "press-%s@example.com" % uuid.uuid4().hex[:10]
    r = client.post("/auth/signup", json={"email": mail, "password": "a long enough password"})
    return {"email": mail, "h": {"Authorization": "Bearer " + r.json()["token"]}}


# ------------------------------------------------------------- it works

def test_a_code_opens_the_door_for_a_week(client, signed_up, invites_on):
    assert client.get("/licence", headers=signed_up["h"]).json()["over"] is True
    r = client.post("/licence/redeem", headers=signed_up["h"], json={"code": _code()})
    assert r.status_code == 200, r.text
    assert r.json()["days"] == 7
    s = client.get("/licence", headers=signed_up["h"]).json()
    assert s["paid"] is True and s["over"] is False
    assert s["kind"] == "pass", "and the account knows what kind of open it is"
    assert s["pass_until"], "with a date on it, so a screen can say how long is left"


def test_the_week_runs_from_when_it_is_redeemed(client, signed_up, invites_on):
    """Not from when it was written. Somebody who opens the message three weeks later has not been
    given four days."""
    old = invites.mint(SECRET, days=7, live_days=90)
    client.post("/licence/redeem", headers=signed_up["h"], json={"code": old})
    until = datetime.fromisoformat(client.get("/licence", headers=signed_up["h"]).json()["pass_until"])
    assert until.tzinfo is not None, "and it says which clock it is on, or the game counts it wrong"
    left = until - datetime.now(timezone.utc)
    assert timedelta(days=6, hours=23) < left <= timedelta(days=7)


def test_it_is_typed_by_a_person_so_it_is_read_like_one(client, signed_up, invites_on):
    """Off a screen, into a box, by somebody who did not write it. Case, spacing and the dashes are
    theirs; the alphabet has no O, I, L or U in it at all, so anybody who typed one meant the digit
    or the digit-shaped letter beside it."""
    c = _code()
    typed = "  " + c.lower().replace("-", " ") + " "
    r = client.post("/licence/redeem", headers=signed_up["h"], json={"code": typed})
    assert r.status_code == 200, r.text


# ------------------------------------------------------------ it refuses

def test_an_invented_code_opens_nothing(client, signed_up, invites_on):
    for bad in ["CREW-AAAA-AAAA-AAAA-AAAA", "CREW-0000-0000-0000-0000", "hello", "", "CREW-"]:
        r = client.post("/licence/redeem", headers=signed_up["h"], json={"code": bad or "x"})
        assert r.status_code == 400, bad
    assert client.get("/licence", headers=signed_up["h"]).json()["over"] is True


def test_a_code_signed_with_another_secret_opens_nothing(client, signed_up, invites_on):
    """Which is what an invite secret is FOR. Without this the format is a public format and
    anybody who reads invites.py can mint themselves a lifetime."""
    r = client.post("/licence/redeem", headers=signed_up["h"],
                    json={"code": invites.mint("not-the-secret", days=7)})
    assert r.status_code == 400


def test_THE_DAYS_CANNOT_BE_EDITED(client, signed_up, invites_on):
    """The one that matters most. A seven-day code is a string, and the string is in the hands of
    somebody who would rather it said seven thousand. The days are inside the signature, so every
    single-character edit of a real code is refused — this walks the whole alphabet through the
    first data character and expects nothing to survive."""
    good = invites.normalise(_code())
    opened = []
    for ch in invites.ALPHABET:
        if ch == good[0]:
            continue
        forged = "CREW-" + ch + good[1:]
        if client.post("/licence/redeem", headers=signed_up["h"],
                       json={"code": forged}).status_code != 400:
            opened.append(forged)
    assert not opened, opened
    assert client.get("/licence", headers=signed_up["h"]).json()["over"] is True


def test_a_code_nobody_redeemed_in_time_is_dead(client, signed_up, invites_on):
    """So a batch handed out for a launch is not still opening doors a year later.

    Built here rather than minted, because mint() will not write one that is already dead — which
    is right, and means the only way to have one is to be holding a code from a hundred days ago.
    This is that code: a real body, really signed, with a window that closed yesterday."""
    from datetime import date
    dead = (date.today() - invites.EPOCH).days - 1
    body = bytes([7]) + dead.to_bytes(2, "big") + b"\x01\x02"
    raw = body + invites._mac(SECRET, body)
    stale = invites.PREFIX + "-" + invites._b32(raw)
    assert invites._mac(SECRET, body) == raw[invites.BODY_BYTES:], "it is genuinely signed"
    r = client.post("/licence/redeem", headers=signed_up["h"], json={"code": stale})
    assert r.status_code == 400


def test_ONE_CODE_ONE_ACCOUNT(client, signed_up, invites_on):
    """Passed round a group chat, it opens the first account and no other. The unique index on
    `key` is what says so — not a check, which two requests at the same instant would walk past."""
    c = _code()
    assert client.post("/licence/redeem", headers=signed_up["h"], json={"code": c}).status_code == 200
    other = _account(client)
    r = client.post("/licence/redeem", headers=other["h"], json={"code": c})
    assert r.status_code == 400
    assert client.get("/licence", headers=other["h"]).json()["over"] is True


def test_the_same_person_typing_it_twice_is_not_told_off(client, signed_up, invites_on):
    """A double click is not an attack, and the second one must not write a fresh week over the
    first — nor a week over a licence that does not expire."""
    c = _code()
    client.post("/licence/redeem", headers=signed_up["h"], json={"code": c})
    first = client.get("/licence", headers=signed_up["h"]).json()["pass_until"]
    r = client.post("/licence/redeem", headers=signed_up["h"], json={"code": c})
    assert r.status_code == 200 and r.json()["already"] is True
    assert client.get("/licence", headers=signed_up["h"]).json()["pass_until"] == first


def test_nobody_signed_in_redeems_nothing(client, invites_on):
    assert client.post("/licence/redeem", json={"code": _code()}).status_code in (401, 403)


def test_with_no_invite_secret_no_code_works(client, signed_up, monkeypatch):
    """The right way for this to fail. An invite system that opens on a missing variable gives the
    game away; one that shuts costs a favour."""
    monkeypatch.setattr(settings, "invite_secret", "", raising=False)
    assert settings.invites_open is False
    assert client.post("/licence/redeem", headers=signed_up["h"],
                       json={"code": _code()}).status_code == 503


# --------------------------------------------------------- when it lapses

def test_when_the_week_is_up_the_door_is_shut_again(client, signed_up, invites_on):
    """And it shuts by itself, with nothing running. There is no sweep and no cron: the expiry is
    compared to the clock in the one place that answers whether an account is open."""
    client.post("/licence/redeem", headers=signed_up["h"], json={"code": _code()})
    assert client.get("/licence", headers=signed_up["h"]).json()["over"] is False
    pid = _player_id(signed_up["email"])
    with SessionLocal() as db:
        lic = db.scalar(select(Licence).where(Licence.player_id == pid))
        lic.expires_at = datetime.now(timezone.utc) - timedelta(minutes=1)
        db.commit()
    s = client.get("/licence", headers=signed_up["h"]).json()
    assert s["over"] is True and s["paid"] is False
    assert s["pass_until"] is None, "and there is no date left to print, because nothing is running"
    assert s["pass_ended"] is True, "and the wall can say the week is up rather than inventing a refund"


def test_somebody_who_never_had_a_pass_is_not_told_one_ended(client, signed_up, invites_on):
    assert client.get("/licence", headers=signed_up["h"]).json()["pass_ended"] is False


def test_buying_it_after_a_pass_makes_it_permanent(client, signed_up, invites_on):
    """The one this is all FOR. Somebody is given a week, likes it, and buys it — and what they
    bought must not run out on the day the favour would have. A purchase does not expire, so the
    row that decides has to be the one without a date, whichever was written first."""
    client.post("/licence/redeem", headers=signed_up["h"], json={"code": _code()})
    pid = _player_id(signed_up["email"])
    with SessionLocal() as db:
        db.add(Licence(player_id=pid, key="cs_bought_" + uuid.uuid4().hex, kind="purchase",
                       amount=1200, currency="USD", active=True))
        db.commit()
        lic = db.scalar(select(Licence).where(Licence.player_id == pid, Licence.kind == "pass"))
        lic.expires_at = datetime.now(timezone.utc) - timedelta(days=1)   # the week runs out
        db.commit()
    s = client.get("/licence", headers=signed_up["h"]).json()
    assert s["over"] is False and s["kind"] == "purchase"
    assert s["pass_until"] is None, "nothing is counting down any more"


def test_a_pass_does_not_stop_somebody_buying(client, signed_up, invites_on):
    """Buy is not refused to somebody on a week — which it would be if `already` were read off the
    pass. They are on a favour, not a purchase, and the whole point is that they can become one."""
    client.post("/licence/redeem", headers=signed_up["h"], json={"code": _code()})
    r = client.post("/licence/checkout", headers=signed_up["h"])
    # The shop is shut in tests, so 503 — what matters is that it is not the "you already have it"
    # answer, which is a 200 with already:true.
    assert r.status_code == 503, r.text
