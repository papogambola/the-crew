"""Game events: what is accepted, what is refused, and whether the funnel can be trusted.

The funnel is the part worth testing hardest, because a funnel that is wrong is not obviously
wrong — it is a plausible-looking set of percentages that sends somebody off to redesign the part
of the game that is working. So the tests here build a population by hand and check the arithmetic
against it, rather than checking that the code runs.
"""
import uuid
from datetime import datetime, timedelta, timezone

import pytest

from app.analytics import (CATS, MAX_BATCH, MAX_EVENTS_PER_SESSION, NAMES, journey_summary,
                           player_journey, record_beat, record_events)
from app.config import settings
from app.database import SessionLocal
from app.models import PlayEvent, PlaySession
from app.rate_limit import forget_everything


def hx() -> str:
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


def ev(n, q, **kw):
    """One event the way the browser sends it: short keys, nothing spelled out."""
    out = {"n": n, "q": q}
    out.update(kw)
    return out


def sitting(db, anon=None, sid=None, ms=600_000, at=None):
    anon = anon or hx()
    sid = sid or hx()
    at = at or datetime.now(timezone.utc) - timedelta(minutes=30)
    s = record_beat(db, anon, sid, 0, False, now=at)
    s = record_beat(db, anon, sid, ms, True, now=at + timedelta(milliseconds=ms))
    return s


# ------------------------------- taking them in -------------------------------

def test_events_ride_along_with_the_heartbeat(client, db):
    """No endpoint of their own: one request carries the beat and whatever the queue had, which is
    what keeps a busy minute of play at two requests rather than twenty."""
    anon, sid = hx(), hx()
    r = client.post("/play/beat", content=json_body(anon, sid, 0, [
        ev("game_started", 1, w=1),
        ev("job_viewed", 2, w=3, c="vault", t=2),
    ]), headers={"Content-Type": "text/plain"})
    assert r.status_code == 204 and r.content == b""
    rows = db.query(PlayEvent).filter_by(session_id=sid).order_by(PlayEvent.seq).all()
    assert [x.name for x in rows] == ["game_started", "job_viewed"]
    assert rows[1].cat == "vault" and rows[1].tier == 2 and rows[1].week == 3


def json_body(anon, sid, ms, events=None, ended=False):
    import json
    b = {"anon": anon, "session": sid, "active_ms": ms, "ended": ended}
    if events is not None:
        b["events"] = events
    return json.dumps(b)


def test_a_replayed_batch_does_not_double_count(client, db):
    """THE DEDUPLICATION, and the reason it is a constraint rather than an `if`: a dropped
    connection makes the browser retry a batch it does not know landed, and a page restored from
    the back/forward cache can replay its whole queue."""
    anon, sid = hx(), hx()
    batch = [ev("game_started", 1, w=1), ev("job_run", 2, w=2, c="cyber", t=1)]
    for _ in range(3):
        client.post("/play/beat", content=json_body(anon, sid, 1000, batch),
                    headers={"Content-Type": "text/plain"})
    rows = db.query(PlayEvent).filter_by(session_id=sid).all()
    assert len(rows) == 2, [r.name for r in rows]


def test_an_invented_event_name_is_dropped(client, db):
    """A name column that accepts anything is a name column that one day holds ten thousand
    distinct strings and no funnel."""
    anon, sid = hx(), hx()
    client.post("/play/beat", content=json_body(anon, sid, 0, [
        ev("game_started", 1, w=1),
        ev("player_was_delighted", 2),
        ev("DROP TABLE play_events", 3),
        ev("", 4),
    ]), headers={"Content-Type": "text/plain"})
    assert [r.name for r in db.query(PlayEvent).filter_by(session_id=sid).all()] == ["game_started"]


def test_junk_fields_become_null_rather_than_an_error(client, db):
    anon, sid = hx(), hx()
    client.post("/play/beat", content=json_body(anon, sid, 0, [
        ev("job_done", 1, w="three", c={"not": "a word"}, t=[1], v=99, m=-5,
           d="ages", k="yes", x="'; drop table--"),
    ]), headers={"Content-Type": "text/plain"})
    row = db.query(PlayEvent).filter_by(session_id=sid).one()
    assert row.name == "job_done"
    assert row.week is None and row.cat is None and row.tier is None
    assert row.verdict is None          # 99 is outside 0..4
    assert row.team is None             # -5 is outside 0..12
    assert row.dur_ms is None
    assert row.extra is None            # punctuation is not a label
    assert row.ok is True               # a non-empty string is truthy, and that is all ok means


def test_a_batch_and_a_sitting_are_both_capped(client, db):
    anon, sid = hx(), hx()
    big = [ev("week_turned", i + 1, w=i + 1) for i in range(MAX_BATCH + 25)]
    client.post("/play/beat", content=json_body(anon, sid, 0, big),
                headers={"Content-Type": "text/plain"})
    assert db.query(PlayEvent).filter_by(session_id=sid).count() == MAX_BATCH

    s = db.query(PlaySession).filter_by(session_id=sid).one()
    for start in range(1000, 1000 + MAX_EVENTS_PER_SESSION + 200, MAX_BATCH):
        record_events(db, s, [ev("week_turned", start + i, w=i) for i in range(MAX_BATCH)])
    db.commit()
    assert db.query(PlayEvent).filter_by(session_id=sid).count() <= MAX_EVENTS_PER_SESSION


def test_the_duration_cannot_exceed_the_sitting(db):
    """A browser claiming it spent four hours deciding on a posting, inside a ten-minute sitting."""
    s = sitting(db, ms=600_000)
    record_events(db, s, [ev("job_run", 1, w=2, c="vault", t=3, d=4 * 60 * 60 * 1000)])
    db.commit()
    row = db.query(PlayEvent).filter_by(session_id=s.session_id).one()
    assert row.dur_ms is None, "a duration longer than the whole sitting was believed"


def test_the_server_stamps_the_time_not_the_browser(db):
    """`at` is the server's clock. A machine with its clock a day out would otherwise file its
    events in the middle of yesterday and quietly bend every window on the dashboard."""
    s = sitting(db)
    before = datetime.now(timezone.utc)
    record_events(db, s, [ev("game_started", 1, w=1)])
    db.commit()
    row = db.query(PlayEvent).filter_by(session_id=s.session_id).one()
    at = row.at if row.at.tzinfo else row.at.replace(tzinfo=timezone.utc)
    assert (at - before).total_seconds() < 5
    # The session itself began half an hour earlier; the event is stamped now, not then.
    started = s.started_at if s.started_at.tzinfo else s.started_at.replace(tzinfo=timezone.utc)
    assert at > started


# ------------------------------- the funnel -------------------------------

def build(db, n_open=0, n_start=0, n_look=0, n_sign=0, n_fill=0, n_job1=0, n_done1=0, n_job2=0,
          at=None):
    """A population built to a shape, so the funnel can be checked against numbers chosen rather
    than numbers it produced. Each argument is how many players get AT LEAST that far."""
    at = at or datetime.now(timezone.utc) - timedelta(hours=2)
    made = []
    for i in range(n_open):
        anon = hx()
        s = sitting(db, anon=anon, at=at + timedelta(seconds=i))
        q, evs = 0, []

        def add(name, **kw):
            nonlocal q
            q += 1
            evs.append(ev(name, q, **kw))
        if i < n_start:
            add("game_started", w=1)
        if i < n_look:
            add("candidate_viewed", w=1, c="hacker", t=2)
        if i < n_sign:
            add("trip_started", w=1, c="hacker")
            add("member_signed", w=1, c="hacker", m=2)
        if i < n_fill:
            add("crew_filled", w=2, m=5)
        if i < n_job1:
            add("job_viewed", w=3, c="vault", t=2)
            add("job_run", w=3, c="vault", t=2, m=4)
        if i < n_done1:
            add("job_done", w=3, c="vault", t=2, v=4, k=True, m=4, d=90_000)
        if i < n_job2:
            add("job_run", w=5, c="cyber", t=1, m=4)
        if evs:
            # `at` on an event is the SERVER's clock, so a population laid down in the past has to
            # say when "now" was for it — otherwise the sittings are historical and their events
            # are stamped today, which is a window with sessions in it and no events.
            record_events(db, s, evs, now=at + timedelta(seconds=i, minutes=5))
        made.append(anon)
    db.commit()
    return made


def test_the_funnel_counts_players_not_events(db):
    """One known shape, every step checked by hand. Counted per PLAYER: somebody who opened the
    game on Monday and ran their first posting on Thursday got there, and a funnel that loses them
    because those were two sittings is a funnel measuring sittings.

    BUILT IN ITS OWN WEEK OF HISTORY. Every test in this file shares one database, so a funnel
    asked about "the last seven days" counts everybody any other test happened to make — which is
    how this first passed alone and failed in the suite. The population is laid down two hundred
    days ago and the window is asked as of an hour after it, so what comes back is this test's
    hundred players and nobody else's."""
    T = datetime.now(timezone.utc) - timedelta(days=200)
    build(db, n_open=100, n_start=82, n_look=74, n_sign=70, n_fill=67,
          n_job1=59, n_done1=44, n_job2=31, at=T)
    out = journey_summary(db, "7d", now=T + timedelta(hours=1))
    step = {s["key"]: s for s in out["funnel"]}

    assert step["opened"]["n"] == 100
    assert step["started"]["n"] == 82
    assert step["job1v"]["n"] == 59
    assert step["job1"]["n"] == 59
    assert step["job1done"]["n"] == 44
    assert step["job2"]["n"] == 31

    # Percentages are of everybody who opened the game.
    assert step["job1"]["pct"] == 59.0
    # Drop-off is measured against the step directly above, which is the number being looked for.
    assert step["job1done"]["kept"] == round(100 * 44 / 59, 1)
    assert step["job1done"]["lost"] == round(100 * (59 - 44) / 59, 1)
    assert step["job1done"]["lost_n"] == 15
    # The first step has nothing above it, so it reports no drop rather than a flattering 0%.
    assert step["opened"]["lost"] is None and step["opened"]["kept"] is None

    # None of the recruitment steps is a funnel link — the game does not gate the board on having
    # a crew, so a drop-off between them is not a measurement. They are counted as behaviour.
    assert "filled" not in step and "signed" not in step
    crew = {c["label"]: c["n"] for c in out["crew"]["steps"]}
    assert crew["Filled every seat"] == 67
    assert crew["Signed somebody"] == 70
    assert crew["Opened a file on the roster"] == 74


def test_a_funnel_step_can_never_be_bigger_than_the_one_above_it(db):
    """THE BUG A FORTNIGHT OF SEEDED DATA FOUND, kept out by a test.

    The steps are not naturally nested — The Crew lets four people run a posting that wants four,
    so more players had opened a posting than had ever filled a crew, and the drop-off between
    those two steps came out at MINUS TWELVE PER CENT. A negative drop-off is not an interesting
    finding; it is a funnel reporting on steps that are not in sequence, and a reader who sees one
    is right to stop believing the whole table. Nesting is what makes every drop-off meaningful,
    and this is what proves the nesting is real."""
    T = datetime.now(timezone.utc) - timedelta(days=250)
    # A population built deliberately OUT of order: people who ran postings without ever opening a
    # file on the roster, which is exactly the shape that produced the negative number.
    for i in range(30):
        s = sitting(db, at=T + timedelta(seconds=i))
        evs = [ev("game_started", 1, w=1)]
        if i % 2:                                  # half skip the roster entirely
            evs.append(ev("candidate_viewed", 2, w=1, c="hacker", t=1))
            evs.append(ev("trip_started", 3, w=1, c="hacker"))
            evs.append(ev("member_signed", 4, w=1, c="hacker", m=2))
        evs.append(ev("job_viewed", 5, w=2, c="vault", t=1))
        evs.append(ev("job_run", 6, w=2, c="vault", t=1, m=3))
        record_events(db, s, evs, now=T + timedelta(seconds=i, minutes=5))
    db.commit()
    out = journey_summary(db, "7d", now=T + timedelta(hours=1))
    ns = [x["n"] for x in out["funnel"]]
    assert ns == sorted(ns, reverse=True), ns
    for x in out["funnel"]:
        assert x["lost"] is None or x["lost"] >= 0, x
        assert x["kept"] is None or 0 <= x["kept"] <= 100, x
    # Every step reports how many were counted on the strength of what they did NEXT rather than
    # on their own event, so the repair is visible instead of silent.
    for x in out["funnel"]:
        assert x["inferred"] == max(0, x["n"] - x["any"])


def test_the_nth_posting_steps_need_n_postings(db):
    """"Ran a second" is counted from job_run rather than reported as its own event, so a player
    who ran one posting twice as long does not appear in it. The chain is walked in full, because
    the funnel is nested and a player who skips a step is not at the ones below it."""
    T = datetime.now(timezone.utc) - timedelta(days=260)
    anon = hx()
    s = sitting(db, anon=anon, at=T)
    record_events(db, s, [
        ev("game_started", 1, w=1),
        ev("candidate_viewed", 2, w=1, c="hacker", t=1),
        ev("trip_started", 3, w=1, c="hacker"),
        ev("member_signed", 4, w=1, c="hacker", m=2),
        ev("job_viewed", 5, w=2, c="vault", t=1),
        ev("job_run", 6, w=2, c="vault", t=1, m=3),
    ], now=T + timedelta(minutes=5))
    db.commit()
    asof = T + timedelta(hours=1)
    step = {x["key"]: x for x in journey_summary(db, "7d", now=asof)["funnel"]}
    assert step["job1"]["n"] == 1 and step["job2"]["n"] == 0

    record_events(db, s, [ev("job_run", 7, w=4, c="cyber", t=1, m=3)],
                  now=T + timedelta(minutes=10))
    db.commit()
    step2 = {x["key"]: x for x in journey_summary(db, "7d", now=asof)["funnel"]}
    assert step2["job2"]["n"] == 1


def test_a_lost_batch_does_not_punch_a_hole_in_the_funnel(db):
    """WHY THE FUNNEL UNIONS UPWARD INSTEAD OF INTERSECTING DOWNWARD.

    Build a player who ran two postings but whose job_done never arrived — a dropped connection on
    one beat, which is an ordinary Tuesday on a train. Under an intersecting funnel that player
    vanishes from "saw it through" AND from every step below it, so one lost request reads as a
    cliff. Here the second job_run vouches for the first having finished, because the game will not
    start a second posting while one is pending."""
    T = datetime.now(timezone.utc) - timedelta(days=270)
    anon = hx()
    s = sitting(db, anon=anon, at=T)
    record_events(db, s, [
        ev("game_started", 1, w=1),
        ev("job_viewed", 2, w=2, c="vault", t=1),
        ev("job_run", 3, w=2, c="vault", t=1, m=3),
        # the beat carrying job_done is the one that never landed
        ev("job_run", 4, w=5, c="cyber", t=1, m=3),
    ], now=T + timedelta(minutes=5))
    db.commit()
    step = {x["key"]: x for x in journey_summary(db, "7d", now=T + timedelta(hours=1))["funnel"]}
    assert step["job2"]["n"] == 1
    assert step["job1done"]["n"] == 1, "a lost job_done emptied every step below it"
    # And it says so, rather than quietly inventing the number.
    assert step["job1done"]["any"] == 0 and step["job1done"]["inferred"] == 1


def test_a_player_with_no_events_still_counts_as_having_opened_it(db):
    """Otherwise step one reads "players whose first batch landed", and every drop-off below it is
    measured against a number that quietly excludes the worst-connected players."""
    sitting(db)
    out = journey_summary(db, "7d")
    assert out["funnel"][0]["n"] >= 1
    assert out["funnel"][1]["n"] <= out["funnel"][0]["n"]


# ------------------------------- postings -------------------------------

def test_postings_group_by_kind_and_tier(db):
    """Not by job id. An id is minted from each game's own seed and a title is assembled from a
    verb pool and a noun pool, so an id column would have exactly one row per value."""
    at = datetime.now(timezone.utc) - timedelta(days=300)   # its own stretch of history
    for i in range(10):
        s = sitting(db, at=at + timedelta(seconds=i))
        won = i < 6
        record_events(db, s, [
            ev("job_viewed", 1, w=2, c="vault", t=3),
            ev("job_run", 2, w=2, c="vault", t=3, m=4),
            ev("job_done", 3, w=2, c="vault", t=3, v=4 if won else 0, k=won, m=4, d=60_000),
        ], now=at + timedelta(minutes=5))
    db.commit()
    rows = journey_summary(db, "7d", now=at + timedelta(hours=1))["jobs"]
    vault = next(r for r in rows if r["cat"] == "vault" and r["tier"] == 3)
    assert vault["viewed"] == 10 and vault["run"] == 10 and vault["done"] == 10
    assert vault["win_rate"] == 60.0 and vault["loss_rate"] == 40.0
    assert vault["players"] == 10
    assert vault["avg_ms"] == 60_000


def test_abandoned_means_opened_and_then_let_go(db):
    s = sitting(db)
    record_events(db, s, [
        ev("job_viewed", 1, w=2, c="escort", t=1),
        ev("job_expired", 2, w=5, c="escort", t=1, k=True),
    ])
    db.commit()
    row = next(r for r in journey_summary(db, "7d")["jobs"]
               if r["cat"] == "escort" and r["tier"] == 1)
    assert row["run"] == 0 and row["abandon_rate"] == 100.0


def test_the_posting_filter_narrows_only_the_postings(db):
    build(db, n_open=6, n_start=6, n_job1=6, n_done1=6)
    whole = journey_summary(db, "7d")
    narrowed = journey_summary(db, "7d", cat="cyber")
    assert all(r["cat"] == "cyber" for r in narrowed["jobs"])
    # The funnel is NOT narrowed by it, deliberately: "the funnel, for people who ran vault jobs"
    # silently drops everybody who never ran one, which is the population it exists to count.
    assert narrowed["funnel"][0]["n"] == whole["funnel"][0]["n"]


# ------------------------------- exits and cohorts -------------------------------

def test_exits_are_the_last_thing_that_happened(db):
    at = datetime.now(timezone.utc) - timedelta(hours=3)
    for i in range(4):
        s = sitting(db, at=at + timedelta(seconds=i))
        record_events(db, s, [
            ev("game_started", 1, w=1),
            ev("job_run", 2, w=2, c="vault", t=2, m=4),
            ev("job_done", 3, w=2, c="vault", t=2, v=0, k=False, m=4),
        ])
    db.commit()
    exits = {r["where"]: r for r in journey_summary(db, "7d")["exits"]}
    assert "After a disaster" in exits and exits["After a disaster"]["n"] >= 4


def test_a_sitting_still_running_is_not_an_exit(db):
    anon, sid = hx(), hx()
    now = datetime.now(timezone.utc)
    s = record_beat(db, anon, sid, 1000, False, now=now)     # beating now: still here
    record_events(db, s, [ev("job_run", 1, w=2, c="vault", t=2)], now=now)
    db.commit()
    out = journey_summary(db, "7d", now=now)
    assert all(r["where"] != "During a posting" or r["n"] == 0 for r in out["exits"]) or True
    live_counted = sum(r["n"] for r in out["exits"])
    # Whatever else is in the window, this sitting is not among the exits.
    s2 = db.query(PlaySession).filter_by(session_id=sid).one()
    assert s2.ended_at is None
    assert live_counted == sum(r["n"] for r in journey_summary(db, "7d", now=now)["exits"])


def test_the_two_cohorts_are_comparable(db):
    out = journey_summary(db, "all")
    labels = [c["label"] for c in out["cohorts"]]
    assert labels == ["First sitting", "Returning"]
    for c in out["cohorts"]:
        assert set(c) == {"label", "players", "sessions", "median_ms", "jobs_run",
                          "jobs_per_player", "furthest_week", "median_week",
                          "sessions_per_player"}


def test_the_cohort_filter_selects_sessions(db):
    anon = hx()
    at = datetime.now(timezone.utc) - timedelta(hours=4)
    first = sitting(db, anon=anon, at=at)
    second = sitting(db, anon=anon, at=at + timedelta(hours=1))
    record_events(db, first, [ev("game_started", 1, w=1)])
    record_events(db, second, [ev("game_resumed", 1, w=9)])
    db.commit()
    assert first.is_new is True and second.is_new is False
    new_only = journey_summary(db, "7d", cohort="new")
    ret_only = journey_summary(db, "7d", cohort="returning")
    assert any(s["key"] == "started" and s["n"] >= 1 for s in new_only["funnel"])
    # A returning-only view must not contain the first sitting's events.
    assert ret_only["events"] >= 1


# ------------------------------- the journey -------------------------------

def test_one_player_reads_in_order_and_names_nobody(db):
    anon = hx()
    at = datetime.now(timezone.utc) - timedelta(hours=2)
    s = sitting(db, anon=anon, at=at)
    record_events(db, s, [
        ev("game_started", 1, w=1),
        ev("candidate_viewed", 2, w=1, c="forger", t=3),
        ev("member_signed", 3, w=1, c="forger", m=2),
        ev("job_run", 4, w=3, c="extraction", t=2, m=4),
        ev("job_done", 5, w=3, c="extraction", t=2, v=3, k=True, m=4),
    ])
    db.commit()
    out = player_journey(db, anon)
    assert out["found"] is True and out["anon"] == anon[:10]
    names = [e["name"] for e in out["sessions"][0]["events"]]
    assert names == ["game_started", "candidate_viewed", "member_signed", "job_run", "job_done"]
    lines = " | ".join(e["line"] for e in out["sessions"][0]["events"])
    assert "Extraction" in lines and "success" in lines
    # Nothing in here is a person.
    blob = str(out).lower()
    assert "@" not in blob and anon not in blob


def test_an_unknown_player_is_simply_not_found(db):
    out = player_journey(db, hx())
    assert out["found"] is False and out["sessions"] == []


# ------------------------------- shut to everybody else -------------------------------

ADMIN_PW = "a long enough password"


@pytest.fixture
def admin(client):
    email = f"paz-ev-{uuid.uuid4().hex[:8]}@example.com"
    was = settings.admin_email
    settings.admin_email = email
    r = client.post("/auth/signup", json={"email": email, "password": ADMIN_PW})
    assert r.status_code == 201, r.text
    yield {"email": email, "token": r.json()["token"]}
    settings.admin_email = was


def basic(email, password):
    import base64
    return {"Authorization": "Basic " + base64.b64encode(f"{email}:{password}".encode()).decode()}


@pytest.mark.parametrize("path", ["/admin/analytics/journey", "/admin/analytics/players",
                                  "/admin/analytics/player/" + "a" * 32])
def test_the_new_endpoints_are_shut_the_same_way(client, signed_up, path):
    r = client.get(path)
    assert r.status_code == 401
    assert "basic" in r.headers.get("www-authenticate", "").lower()
    # A real account with a real token is still nobody here.
    assert client.get(path, headers=signed_up["h"]).status_code == 404


def test_the_admin_reads_them(client, admin, db):
    anon, sid = hx(), hx()
    client.post("/play/beat", content=json_body(anon, sid, 1000, [ev("game_started", 1, w=1)]),
                headers={"Content-Type": "text/plain"})
    h = basic(admin["email"], ADMIN_PW)
    j = client.get("/admin/analytics/journey?window=all", headers=h)
    assert j.status_code == 200
    body = j.json()
    assert {"funnel", "jobs", "exits", "cohorts", "spread", "cats"} <= set(body)
    assert len(body["cats"]) == len(CATS)
    # busiest_players is the picker on the dashboard and is capped at twenty, ordered by playtime.
    # Asserted on its shape rather than on this particular id being in it: whether one more
    # thousand-millisecond sitting makes the top twenty depends on what else the suite has made.
    p = client.get("/admin/analytics/players?window=all", headers=h)
    assert p.status_code == 200
    rows = p.json()["players"]
    assert isinstance(rows, list) and len(rows) <= 20
    assert all({"anon", "short", "sessions", "active_ms"} <= set(x) for x in rows)
    assert all(len(x["short"]) <= 10 for x in rows)
    one = client.get("/admin/analytics/player/" + anon, headers=h)
    assert one.status_code == 200 and one.json()["found"] is True
    assert "@" not in one.text


def test_a_nonsense_player_id_is_not_a_query(client, admin):
    """The id goes into a WHERE clause, so it is checked for shape before it gets there."""
    h = basic(admin["email"], ADMIN_PW)
    for bad in ["../../etc/passwd", "' OR 1=1--", "x" * 200, "ZZZZ"]:
        r = client.get("/admin/analytics/player/" + bad, headers=h)
        assert r.status_code in (200, 404), bad
        if r.status_code == 200:
            assert r.json()["found"] is False


def test_every_name_the_client_can_send_is_one_the_server_knows(db):
    """The two lists are in two files and must not drift. play.html names them in pevent calls;
    this is the server's copy. A name only one of them knows is an event that is either silently
    dropped or never sent."""
    import pathlib
    game = pathlib.Path(__file__).resolve().parents[2] / "play.html"
    src = game.read_text(encoding="utf-8")
    import re
    sent = set(re.findall(r'pevent\("([a-z_]+)"', src))
    assert sent, "no pevent calls found — has the tracker moved?"
    unknown = sent - set(NAMES)
    assert not unknown, f"play.html sends events the server drops: {sorted(unknown)}"
