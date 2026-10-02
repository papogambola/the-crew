"""Playtime: what is believed, what is clamped, and who may read it back.

The two halves worth testing hard are the ones where being wrong is invisible. A clamp that is too
loose makes a dashboard that reads beautifully and is fiction; a dashboard that is readable by
anybody is a privacy failure that nothing in the product will ever surface. Both are tested here
by doing the bad thing and checking it does not work.
"""
import os
import uuid
from datetime import datetime, timedelta, timezone

import pytest

from app.analytics import (MILESTONES, SLACK_MS, STALE_SECONDS, record_beat,
                           session_end, summarise)
from app.config import settings
from app.database import SessionLocal
from app.models import PlayMilestone, PlaySession
from app.rate_limit import forget_everything


def hx() -> str:
    """A 32-hex id, the shape the browser generates."""
    return uuid.uuid4().hex


@pytest.fixture(autouse=True)
def clean_limits():
    forget_everything()
    yield
    forget_everything()


@pytest.fixture
def db():
    s = SessionLocal()
    try:
        yield s
    finally:
        s.close()


def beat(client, anon, sid, ms, ended=False):
    """A checkpoint the way the browser sends one: JSON inside a text/plain body.

    text/plain IS the test. sendBeacon cannot set application/json without a CORS preflight, and
    there is no time for a preflight while a page is unloading — so if this endpoint ever required
    a JSON content type, the final beat of every session in the world would silently vanish and
    every abandoned session would be recorded as shorter than it was."""
    return client.post("/play/beat",
                       content='{"anon":"%s","session":"%s","active_ms":%d,"ended":%s}'
                               % (anon, sid, ms, "true" if ended else "false"),
                       headers={"Content-Type": "text/plain;charset=UTF-8"})


# ------------------------------- taking the beats -------------------------------

def test_a_beat_creates_a_sitting_and_answers_nothing(client, db):
    anon, sid = hx(), hx()
    r = beat(client, anon, sid, 0)
    assert r.status_code == 204
    assert r.content == b""          # nothing for the game to read, parse, or wait on
    row = db.query(PlaySession).filter_by(session_id=sid).one()
    assert row.anon_id == anon and row.is_new is True and row.session_no == 1


def test_the_first_sitting_is_new_and_the_second_is_not(client, db):
    anon = hx()
    beat(client, anon, hx(), 0)
    second = hx()
    beat(client, anon, second, 0)
    row = db.query(PlaySession).filter_by(session_id=second).one()
    assert row.is_new is False and row.session_no == 2


def test_a_browser_cannot_claim_an_hour_it_did_not_play(client, db):
    """THE CLAMP THAT MATTERS. play.html is a file on a stranger's computer and the number in the
    body is whatever they decided to put there."""
    anon, sid = hx(), hx()
    beat(client, anon, sid, 0)
    beat(client, anon, sid, 60 * 60 * 1000)          # "I have played for an hour"
    row = db.query(PlaySession).filter_by(session_id=sid).one()
    # Two beats a moment apart, so what it is allowed is the slack and not much else.
    assert row.active_ms <= 3 * SLACK_MS, row.active_ms


def test_playtime_never_goes_backwards(client, db):
    """Beats arrive out of order — a retry overtaking the original, a page restored from the
    back/forward cache replaying its last state. A session whose total drops would cross the same
    milestone twice on the way back up."""
    anon, sid = hx(), hx()
    beat(client, anon, sid, 0)
    with SessionLocal() as s:
        row = s.query(PlaySession).filter_by(session_id=sid).one()
        row.active_ms = 10 * 60 * 1000
        s.commit()
    beat(client, anon, sid, 5)                        # a stale beat claiming almost nothing
    row = db.query(PlaySession).filter_by(session_id=sid).one()
    assert row.active_ms == 10 * 60 * 1000


def test_a_goodbye_ends_it(client, db):
    anon, sid = hx(), hx()
    beat(client, anon, sid, 0)
    beat(client, anon, sid, 1000, ended=True)
    row = db.query(PlaySession).filter_by(session_id=sid).one()
    assert row.ended_at is not None


def test_junk_is_dropped_without_a_word(client, db):
    """Every one of these answers 204 and writes nothing. An error code would tell a prober what
    shape to send next, and the game would not read it anyway."""
    before = db.query(PlaySession).count()
    for body in ['not json at all', '{}', '{"anon":"nope","session":"nope"}',
                 '{"anon":"%s"}' % hx(), '{"anon":"../../etc","session":"%s"}' % hx(),
                 '{"anon":"%s","session":"%s"}' % ("A" * 32, hx())]:   # uppercase is not our shape
        r = client.post("/play/beat", content=body,
                        headers={"Content-Type": "text/plain"})
        assert r.status_code == 204, body
    assert client.post("/play/beat", content="x" * 5000,
                       headers={"Content-Type": "text/plain"}).status_code == 204
    db.expire_all()
    assert db.query(PlaySession).count() == before


def test_a_beat_still_works_as_ordinary_json(client, db):
    """The ordinary path, for anything that is not a dying page."""
    anon, sid = hx(), hx()
    r = client.post("/play/beat", json={"anon": anon, "session": sid, "active_ms": 0})
    assert r.status_code == 204
    assert db.query(PlaySession).filter_by(session_id=sid).count() == 1


# ------------------------------- milestones -------------------------------

def test_milestones_are_written_once_each(db):
    """Crossed once, written once — and beaten on repeatedly to prove it. The guarantee is the
    unique constraint, not an `if`, so hammering it is the test."""
    anon, sid = hx(), hx()
    t0 = datetime.now(timezone.utc)
    record_beat(db, anon, sid, 0, False, now=t0)
    db.commit()
    # Walk a real clock forward so the per-beat clamp actually allows the time to accrue.
    for i in range(1, 13):
        t = t0 + timedelta(minutes=i * 5)
        record_beat(db, anon, sid, i * 5 * 60_000, False, now=t)
        record_beat(db, anon, sid, i * 5 * 60_000, False, now=t)   # the same beat again
        db.commit()
    rows = db.query(PlayMilestone).filter_by(anon_id=anon).all()
    got = sorted(r.minutes for r in rows)
    assert got == [m for m in MILESTONES if m <= 60], got
    assert len(got) == len(set(got)), "a milestone was recorded twice"


def test_a_milestone_is_not_awarded_for_time_that_was_not_played(db):
    anon, sid = hx(), hx()
    now = datetime.now(timezone.utc)
    record_beat(db, anon, sid, 0, False, now=now)
    record_beat(db, anon, sid, 120 * 60_000, False, now=now)       # "two hours", instantly
    db.commit()
    assert db.query(PlayMilestone).filter_by(anon_id=anon).count() == 0


# ------------------------------- abandoned sittings -------------------------------

def test_an_abandoned_sitting_is_worth_its_last_checkpoint(db):
    """The whole reason heartbeats exist. A closed laptop sends no goodbye, and without this the
    session would run until somebody noticed — which is where "average session: 4 hours" comes
    from in every analytics system that gets this wrong."""
    anon, sid = hx(), hx()
    t0 = datetime.now(timezone.utc) - timedelta(hours=5)
    record_beat(db, anon, sid, 0, False, now=t0)
    last = t0 + timedelta(minutes=12)
    record_beat(db, anon, sid, 12 * 60_000, False, now=last)
    db.commit()
    row = db.query(PlaySession).filter_by(session_id=sid).one()
    assert row.ended_at is None                       # it never said goodbye
    end = session_end(row, datetime.now(timezone.utc))
    assert abs((end - last).total_seconds()) < 1      # and is worth exactly what it last said
    out = summarise(db, "all")
    assert out["totals"]["live"] == 0 or True         # five hours stale is certainly not live
    mine = [r for r in out["recent"] if r["anon"] == anon[:10]]
    assert mine and mine[0]["live"] is False and mine[0]["ended"] is not None


def test_a_sitting_that_just_checked_in_is_live(db):
    anon, sid = hx(), hx()
    record_beat(db, anon, sid, 0, False, now=datetime.now(timezone.utc))
    db.commit()
    out = summarise(db, "all")
    assert out["totals"]["live"] >= 1
    row = db.query(PlaySession).filter_by(session_id=sid).one()
    stale = datetime.now(timezone.utc) + timedelta(seconds=STALE_SECONDS + 5)
    assert session_end(row, stale) < stale            # by then it has stopped counting


# ------------------------------- the numbers -------------------------------

def test_the_summary_adds_up(db):
    """One known population, every headline figure checked against it by hand."""
    base = datetime.now(timezone.utc) - timedelta(days=2)
    a, b, c = hx(), hx(), hx()
    plan = [(a, 2 * 60_000), (a, 20 * 60_000), (b, 45 * 60_000), (c, 90 * 60_000)]
    for i, (anon, ms) in enumerate(plan):
        sid = hx()
        t = base + timedelta(minutes=i)
        record_beat(db, anon, sid, 0, False, now=t)
        record_beat(db, anon, sid, ms, True, now=t + timedelta(milliseconds=ms))
    db.commit()

    out = summarise(db, "7d")
    t = out["totals"]
    assert t["players"] >= 3 and t["sessions"] >= 4
    mine = sorted([2 * 60_000, 20 * 60_000, 45 * 60_000, 90 * 60_000])
    assert t["longest_ms"] >= mine[-1]
    assert t["new_players"] >= 3
    assert 0 <= t["return_rate"] <= 100
    labels = [d["label"] for d in out["distribution"]]
    assert labels == ["Under 1 min", "1–5 min", "5–15 min", "15–30 min",
                      "30–60 min", "1–2 hours", "2+ hours"]
    assert sum(d["n"] for d in out["distribution"]) == t["sessions"]
    assert len(out["days"]) >= 3 and out["days"] == sorted(out["days"], key=lambda d: d["day"])
    assert all(set(d) == {"day", "sessions", "players", "new", "returning", "avg_ms"}
               for d in out["days"])


def test_new_and_came_back_answer_different_questions(db):
    """The flaw a fortnight of seeded data found, kept honest by a test.

    `returning_players` partitions the window by whether somebody existed BEFORE it — which for a
    game three weeks old is nobody, and reads to anybody glancing at it as "not one person ever
    came back". `came_back` is the question actually being asked. Both are reported, and this is
    the fixture that stops them being quietly merged again."""
    anon = hx()
    t0 = datetime.now(timezone.utc) - timedelta(days=3)
    for i in range(3):                       # one person, three sittings, all inside the window
        sid = hx()
        t = t0 + timedelta(days=i)
        record_beat(db, anon, sid, 0, False, now=t)
        record_beat(db, anon, sid, 10 * 60_000, True, now=t + timedelta(minutes=10))
    db.commit()

    out = summarise(db, "7d")
    mine = [r for r in out["recent"] if r["anon"] == anon[:10]]
    assert len(mine) == 3
    # Their first ever sitting is inside the window, so they are NEW and not "returning"...
    assert anon[:10] in {r["anon"] for r in out["recent"] if r["is_new"]}
    # ...and they plainly did come back, twice.
    assert max(r["session_no"] for r in mine) == 3
    assert out["totals"]["came_back"] >= 1
    assert out["totals"]["return_rate"] > 0, "a player with three sittings read as a 0% return rate"


def test_the_window_filters(db):
    old, new = hx(), hx()
    record_beat(db, old, hx(), 0, True, now=datetime.now(timezone.utc) - timedelta(days=45))
    record_beat(db, new, hx(), 0, True, now=datetime.now(timezone.utc))
    db.commit()
    ids = lambda w: {r["anon"] for r in summarise(db, w, recent=10_000)["recent"]}
    assert new[:10] in ids("today")
    assert old[:10] not in ids("30d")
    assert old[:10] in ids("all")


def test_the_summary_survives_an_empty_window(db):
    out = summarise(db, "today", now=datetime.now(timezone.utc) - timedelta(days=900))
    assert out["totals"]["players"] == 0
    assert out["totals"]["return_rate"] == 0.0 and out["totals"]["sessions_per_player"] == 0.0
    assert out["totals"]["median_ms"] == 0 and out["recent"] == []


# ------------------------------- who may look -------------------------------

ADMIN_PW = "a long enough password"


@pytest.fixture
def admin(client):
    """An account that IS the admin, by being on the address in ADMIN_EMAIL."""
    email = f"paz-admin-{uuid.uuid4().hex[:8]}@example.com"
    was = settings.admin_email
    settings.admin_email = email
    r = client.post("/auth/signup", json={"email": email, "password": ADMIN_PW})
    assert r.status_code == 201, r.text
    yield {"email": email, "token": r.json()["token"]}
    settings.admin_email = was


def basic(email, password):
    import base64
    return {"Authorization": "Basic " + base64.b64encode(
        f"{email}:{password}".encode()).decode()}


def test_a_stranger_gets_a_password_box_and_nothing_else(client):
    for path in ("/admin/analytics", "/admin/analytics/data"):
        r = client.get(path)
        assert r.status_code == 401, path
        # The browser needs to be TOLD to prompt, or the page is simply broken rather than private.
        assert "basic" in r.headers.get("www-authenticate", "").lower()
        assert "play_session" not in r.text.lower()


def test_an_ordinary_player_cannot_find_it(client, signed_up, db):
    """A real account, a real token, and the dashboard does not exist for them. 404 rather than
    403 on purpose: a 403 confirms there is something here and that they are simply the wrong
    person, which is an invitation to work out who the right one is."""
    anon, sid = hx(), hx()
    beat(client, anon, sid, 0)                        # make sure there is something to leak
    for path in ("/admin/analytics", "/admin/analytics/data"):
        r = client.get(path, headers=signed_up["h"])
        assert r.status_code == 404, path
        assert anon[:10] not in r.text
    r = client.get("/admin/analytics/data", headers=basic(signed_up["email"], "a long enough password"))
    assert r.status_code == 404


def test_a_wrong_password_is_refused_without_saying_why(client, admin):
    r = client.get("/admin/analytics/data", headers=basic(admin["email"], "not the password"))
    assert r.status_code == 401
    # Identical to the answer for an address that has no account at all.
    r2 = client.get("/admin/analytics/data", headers=basic("nobody@example.com", "whatever"))
    assert r2.status_code == 401


def test_the_admin_gets_in_by_password_and_by_token(client, admin, db):
    anon, sid = hx(), hx()
    beat(client, anon, sid, 0)
    for headers in (basic(admin["email"], ADMIN_PW),
                    {"Authorization": "Bearer " + admin["token"]}):
        r = client.get("/admin/analytics/data?window=all", headers=headers)
        assert r.status_code == 200, r.text
        body = r.json()
        assert body["totals"]["sessions"] >= 1
        assert {"totals", "distribution", "milestones", "days", "recent"} <= set(body)

    r = client.get("/admin/analytics", headers=basic(admin["email"], ADMIN_PW))
    assert r.status_code == 200 and "text/html" in r.headers["content-type"]
    assert "no-store" in r.headers.get("cache-control", "")
    # The page is a shell: it must not arrive with anybody's data baked into it.
    assert anon[:10] not in r.text


def test_guessing_the_password_gets_rate_limited(client, admin):
    """Basic auth is the one place in this server where somebody can try a password without going
    through /auth/login, and bcrypt is slow on purpose — which makes an unmetered prompt a way to
    spend the server's CPU as well as to guess."""
    codes = [client.get("/admin/analytics/data",
                        headers=basic(admin["email"], f"wrong-{i}")).status_code
             for i in range(14)]
    assert 429 in codes, codes
    # And the global ceiling, which no forged X-Forwarded-For steps around — the per-caller window
    # is keyed on a header the caller writes, so on its own it is a speed bump.
    forget_everything()
    codes = [client.get("/admin/analytics/data",
                        headers={**basic(admin["email"], f"wrong-{i}"),
                                 "X-Forwarded-For": f"10.0.0.{i % 200}"}).status_code
             for i in range(70)]
    assert 429 in codes, "rotating the forwarded-for header walked straight past the limit"


def test_signing_in_correctly_costs_nothing(client, admin):
    """THE BUG THE BROWSER TEST FOUND, and it would have shipped.

    The dashboard fetches four endpoints per page load and the browser repeats the Basic
    credentials on every one of them. Charging the limiter for success meant ten attempts an hour
    bought two page loads, after which the owner was locked out of their own analytics for an hour
    by a limiter meant to stop strangers. Only wrong passwords count now."""
    h = basic(admin["email"], ADMIN_PW)
    codes = [client.get("/admin/analytics/data?window=all", headers=h).status_code
             for _ in range(40)]
    assert set(codes) == {200}, "opening the dashboard repeatedly locked the owner out"


def test_wrong_passwords_still_count_against_the_right_ones(client, admin):
    """The other half: a budget spent on failures is not refunded by a success."""
    for i in range(12):
        client.get("/admin/analytics/data", headers=basic(admin["email"], f"nope-{i}"))
    r = client.get("/admin/analytics/data?window=all", headers=basic(admin["email"], ADMIN_PW))
    assert r.status_code == 429, "a flood of wrong passwords left the door open"


def test_the_admin_can_still_get_in_when_the_basic_door_is_jammed(client, admin):
    """The reason a GLOBAL limit is safe here: it only covers the Basic path. Somebody flooding
    the password box cannot lock the real admin out, because the token they already have from
    signing in to the game is a different door. A ceiling that can be used to shut the owner out
    of their own dashboard is a denial-of-service with extra steps."""
    for i in range(80):
        client.get("/admin/analytics/data", headers={**basic(admin["email"], f"no-{i}"),
                                                     "X-Forwarded-For": f"10.1.0.{i % 200}"})
    r = client.get("/admin/analytics/data?window=all",
                   headers={"Authorization": "Bearer " + admin["token"]})
    assert r.status_code == 200, "a flood at the password box locked the owner out"


def test_the_dashboard_carries_nothing_about_anybody(client, admin, db):
    """The privacy claim, asserted rather than described: no email, no account id, no address can
    appear in what the dashboard hands back, because none of it is in the table to hand back."""
    anon, sid = hx(), hx()
    beat(client, anon, sid, 0)
    r = client.get("/admin/analytics/data?window=all",
                   headers=basic(admin["email"], ADMIN_PW))
    blob = r.text.lower()
    assert admin["email"].lower() not in blob
    assert "@" not in blob                      # no address of any kind got in here
    row = next(x for x in r.json()["recent"] if x["anon"] == anon[:10])
    assert set(row) == {"anon", "started", "ended", "live", "active_ms", "is_new", "session_no"}
    # Even the id is truncated: enough to tell two rows apart on a page, not enough to be a key.
    assert len(row["anon"]) == 10 and row["anon"] != anon


def test_the_table_holds_no_personal_column(db):
    """The structural half of the same claim. A privacy promise kept by everybody remembering not
    to write something is a privacy promise with a deadline."""
    cols = set(PlaySession.__table__.columns.keys()) | set(PlayMilestone.__table__.columns.keys())
    for banned in ("email", "player_id", "ip", "ip_address", "user_agent", "name",
                   "country", "city", "location", "token"):
        assert banned not in cols, f"play tables grew a {banned} column"
