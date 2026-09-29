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


def test_a_stranger_can_learn_that_codes_are_taken(client, invites_on, monkeypatch):
    """On /health, which needs no account — and that is the whole point of it being there.

    It was answered only on /auth/me and /licence, which is to say only to people who already had
    an account, and the one person who arrives holding a press pass is a reviewer who has never
    been here before. The line offering the code box is drawn from this, so without it the box
    could not be offered to the only audience it exists for."""
    assert client.get("/health").json()["invites"] is True
    monkeypatch.setattr(settings, "invite_secret", "", raising=False)
    assert client.get("/health").json()["invites"] is False


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


# ------------------------------------------------------ who may write them

@pytest.fixture
def admin(client, monkeypatch, invites_on):
    """An account on the address in ADMIN_EMAIL. Both halves: the address is in the environment and
    the token belongs to that account, which means somebody knew its password."""
    a = _account(client)
    monkeypatch.setattr(settings, "admin_email", a["email"], raising=False)
    return a


def test_the_admin_account_writes_passes_that_actually_open_doors(client, admin, signed_up):
    """The whole point, end to end, with the two halves in different hands. There is a tool for this
    (tools/invite.py) and it cannot be run on the machine the person handing out review copies is
    holding — no Python, no clone — so a way of doing it that needs neither is not a convenience."""
    r = client.post("/licence/invites", headers=admin["h"], json={"count": 3, "days": 14})
    assert r.status_code == 200, r.text
    codes = r.json()["codes"]
    assert len(codes) == 3 and len(set(codes)) == 3, "three of them, and three different ones"
    assert r.json()["days"] == 14
    assert r.json()["redeem_by"], "with a date to write beside them, because nothing else records one"
    got = client.post("/licence/redeem", headers=signed_up["h"], json={"code": codes[0]})
    assert got.status_code == 200, got.text
    assert got.json()["days"] == 14, "worth what was asked for, and the server is what says so"


def test_NOBODY_ELSE_CAN_WRITE_ONE(client, signed_up, admin):
    """The one that matters. An endpoint that mints free copies of the game, reachable by anybody
    with an account, is the game being free with extra steps.

    404 rather than 403: a 403 confirms the endpoint exists and that the caller is merely the wrong
    person, which is a thing to go and become."""
    r = client.post("/licence/invites", headers=signed_up["h"], json={"count": 1})
    assert r.status_code == 404, r.text
    assert "invite" not in r.text.lower() and "pass" not in r.text.lower(), \
        "and the refusal describes nothing — a stranger learns there is nothing here"


def test_nobody_signed_in_writes_nothing(client, admin):
    assert client.post("/licence/invites", json={"count": 1}).status_code in (401, 403)


def test_with_no_admin_address_nobody_is_admin(client, signed_up, invites_on, monkeypatch):
    """Which is the state every deploy starts in, and the state a leaked variable cannot create. An
    empty ADMIN_EMAIL must never match an empty anything."""
    monkeypatch.setattr(settings, "admin_email", "", raising=False)
    assert settings.is_admin("") is False and settings.is_admin(signed_up["email"]) is False
    assert client.post("/licence/invites", headers=signed_up["h"],
                       json={"count": 1}).status_code == 404


def test_the_address_is_read_the_way_somebody_would_type_it(monkeypatch):
    """Into a Railway variable box, by hand, possibly with a capital and a trailing space. Matched
    whole, though — a prefix of the address is a different address and must not be one."""
    monkeypatch.setattr(settings, "admin_email", "paz@example.com", raising=False)
    assert settings.is_admin("  PAZ@Example.com ") is True
    for other in ["paz@example.co", "paz@example.com.attacker.test", "az@example.com",
                  "paz@example.coma", "xpaz@example.com", "paz"]:
        assert settings.is_admin(other) is False, other


def test_how_many_and_how_long_are_both_bounded(client, admin):
    """Not because a thousand codes would break anything — they are arithmetic — but because a
    mistyped field should not be the way somebody hands out a thousand lifetimes. 90 days is the
    ceiling: past that it is not a press pass, it is the game."""
    for bad in [{"count": 0}, {"count": 101}, {"count": -1},
                {"days": 0}, {"days": 91}, {"days": -7}]:
        r = client.post("/licence/invites", headers=admin["h"], json=bad)
        assert r.status_code == 422, (bad, r.status_code)


def test_the_defaults_are_the_ordinary_ask(client, admin):
    """Ten of them, a week each, because that is the batch somebody actually wants and a form with
    nothing chosen should already be right."""
    r = client.post("/licence/invites", headers=admin["h"], json={})
    assert r.status_code == 200, r.text
    assert len(r.json()["codes"]) == 10 and r.json()["days"] == 7


def test_with_no_invite_secret_there_is_nothing_to_sign_with(client, admin, monkeypatch):
    monkeypatch.setattr(settings, "invite_secret", "", raising=False)
    r = client.post("/licence/invites", headers=admin["h"], json={"count": 1})
    assert r.status_code == 503
    assert "INVITE_SECRET" in r.text, "and it names the variable, because the reader can set it"


def test_minting_writes_nothing_down(client, admin):
    """A code is a signature, so writing one is arithmetic — there is no row, no list, and nothing
    to leak. It also means there is no way to un-write one, which is why the days are inside the
    signature and the window is short."""
    with SessionLocal() as db:
        before = len(db.scalars(select(Licence)).all())
    client.post("/licence/invites", headers=admin["h"], json={"count": 25})
    with SessionLocal() as db:
        assert len(db.scalars(select(Licence)).all()) == before


def test_a_batch_has_no_two_the_same(client, admin):
    """Fifty at once, all different, or two reviewers are sent the same string and the second one is
    told it is spent — by the unique index doing exactly what it is there for."""
    codes = client.post("/licence/invites", headers=admin["h"], json={"count": 50}).json()["codes"]
    assert len(set(codes)) == 50


def test_the_game_is_told_who_is_admin(client, admin, signed_up):
    """So the office can draw the panel for one account and not for the others. A panel that appears
    and then refuses is worse than one that never appeared — and this is the server deciding, with
    the game being told, which is the rule everywhere else on this account."""
    me = client.get("/auth/me", headers=admin["h"]).json()
    assert me["admin"] is True and me["invites_open"] is True
    assert client.get("/auth/me", headers=signed_up["h"]).json()["admin"] is False


def test_a_client_that_says_it_is_admin_is_not(client, signed_up, admin):
    """There is no field on the request that says who is asking. The address comes off the token,
    the token is signed, and a body claiming otherwise is read for `count` and `days` and nothing
    else."""
    r = client.post("/licence/invites", headers=signed_up["h"],
                    json={"count": 1, "admin": True, "email": admin["email"]})
    assert r.status_code == 404


# --------------------------------------------- and whether anybody used one

def test_a_spent_pass_can_be_found_again(client, admin, signed_up):
    """The question that had no answer: how do you know if somebody used their code?

    Nothing records what was MINTED — that is the design and it does not change. But a spend writes
    a licence row, and the row carries the code itself, so the batch note kept by whoever handed
    them out can be matched against what came back."""
    code = client.post("/licence/invites", headers=admin["h"],
                       json={"count": 1, "days": 14}).json()["codes"][0]
    seen = lambda: [x for x in client.get("/licence/invites", headers=admin["h"]).json()["passes"]
                    if invites.normalise(x["code"]) == invites.normalise(code)]
    assert seen() == [], \
        "nothing shows until somebody spends one — a code nobody typed leaves no trace at all"

    client.post("/licence/redeem", headers=signed_up["h"], json={"code": code})
    rows = seen()
    assert len(rows) == 1
    r = rows[0]
    assert invites.normalise(r["code"]) == invites.normalise(code), "which code it was"
    assert r["email"] == signed_up["email"], "and who is holding it"
    assert r["days"] == 14, "worked back out of the dates rather than stored twice"
    assert r["running"] is True and r["bought"] is False
    assert r["redeemed_at"] and r["expires_at"]


def test_the_list_says_when_one_ran_out(client, admin, signed_up):
    code = client.post("/licence/invites", headers=admin["h"], json={"count": 1}).json()["codes"][0]
    client.post("/licence/redeem", headers=signed_up["h"], json={"code": code})
    pid = _player_id(signed_up["email"])
    with SessionLocal() as db:
        lic = db.scalar(select(Licence).where(Licence.player_id == pid, Licence.kind == "pass"))
        lic.expires_at = datetime.now(timezone.utc) - timedelta(days=1)
        db.commit()
    r = [x for x in client.get("/licence/invites", headers=admin["h"]).json()["passes"]
         if x["email"] == signed_up["email"]][0]
    assert r["running"] is False and r["bought"] is False


def test_the_list_says_WHO_WENT_ON_TO_BUY(client, admin, signed_up):
    """Which is the only outcome that says the whole thing worked. A pass exists to become a
    purchase; a list that cannot tell a reviewer who paid from one who drifted off measures
    nothing worth measuring."""
    code = client.post("/licence/invites", headers=admin["h"], json={"count": 1}).json()["codes"][0]
    client.post("/licence/redeem", headers=signed_up["h"], json={"code": code})
    pid = _player_id(signed_up["email"])
    with SessionLocal() as db:
        db.add(Licence(player_id=pid, key="cs_after_the_week_" + uuid.uuid4().hex,
                       kind="purchase", amount=1200, currency="USD", active=True))
        db.commit()
    r = [x for x in client.get("/licence/invites", headers=admin["h"]).json()["passes"]
         if x["email"] == signed_up["email"]][0]
    assert r["bought"] is True


def test_nobody_else_sees_the_list(client, signed_up, admin):
    """It carries other people's addresses, so it is behind the same 404 as writing them."""
    assert client.get("/licence/invites", headers=signed_up["h"]).status_code == 404
    assert client.get("/licence/invites").status_code in (401, 403)


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
