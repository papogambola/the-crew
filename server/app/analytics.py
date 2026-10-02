"""What a sitting is worth, and what a month of them adds up to.

Two halves, and they are kept in one file because they have to agree. `record_beat` decides how
much of a checkpoint to believe; `summarise` decides what the dashboard says. If those two ever
disagree about when a session ended, the dashboard is wrong in a way nobody would notice.

THE ONE RULE EVERYTHING HERE FOLLOWS: the browser is the only thing that can measure attention,
and the browser is a file on a stranger's computer. So the client counts and the server clamps.
Nothing a client sends is stored as sent.
"""
from __future__ import annotations

import statistics
from datetime import datetime, timedelta, timezone

from sqlalchemy import func, select
from sqlalchemy.exc import IntegrityError
from sqlalchemy.orm import Session

from app.models import PlayMilestone, PlaySession

# The minutes worth marking. Chosen to answer "did they bounce, did they get it, did they stay",
# which is three questions, not six — but the middle ones are what show you WHERE they left.
MILESTONES = (1, 5, 15, 30, 60, 120)

# How often the browser is asked to check in. The server does not enforce this; it is here because
# every tolerance below is expressed in terms of it, and a number that is quietly assumed in four
# places is a number that goes wrong when somebody changes one of them.
BEAT_SECONDS = 30

# How long after its last checkpoint a session is still considered to be running. Three missed
# beats. Shorter and a slow phone on a train looks dead; longer and "players right now" counts
# people who shut the lid five minutes ago.
STALE_SECONDS = 120

# How much more active time a checkpoint may claim than the wall clock allows for. Not zero,
# because the client's clock and the server's are different clocks, the request took some
# milliseconds to arrive, and a beat delayed by a garbage collection would otherwise be shaved
# every single time — and those shavings only ever go one way, so a two-hour session would come
# out at an hour and fifty. Two seconds per beat is slack enough to be invisible and far too
# little to inflate anything.
SLACK_MS = 2000

# Ceiling on one sitting. Something has gone wrong — a machine that slept for a day and came back,
# a clock moved — rather than somebody who played for sixteen hours. Clamped rather than rejected,
# because a session that is too long is still a session that happened.
MAX_SESSION_MS = 16 * 60 * 60 * 1000


def _utc(dt: datetime | None) -> datetime | None:
    """SQLite hands back naive datetimes whatever the column says; Postgres hands back aware ones.

    Every comparison in this file is against `now`, which is aware, so a naive value would raise
    TypeError on SQLite and never on production — which is the worst way round for a bug to be
    arranged. conftest.py documents the same trap for the auth code."""
    if dt is None:
        return None
    return dt.replace(tzinfo=timezone.utc) if dt.tzinfo is None else dt


def session_end(s: PlaySession, now: datetime) -> datetime:
    """When this sitting ended, as far as anybody can honestly say.

    A clean goodbye if there was one. Otherwise its last checkpoint — because a browser that
    stopped checking in stopped at the last moment it was known to be there, and anything later
    is invention. A session still beating has not ended, so `now`."""
    if s.ended_at is not None:
        return _utc(s.ended_at)
    last = _utc(s.last_beat_at)
    return now if (now - last).total_seconds() <= STALE_SECONDS else last


def is_live(s: PlaySession, now: datetime) -> bool:
    """Somebody is at the keyboard right now, as nearly as a server can know."""
    if s.ended_at is not None:
        return False
    return (now - _utc(s.last_beat_at)).total_seconds() <= STALE_SECONDS


def record_beat(db: Session, anon_id: str, session_id: str, claimed_ms: int,
                ended: bool, now: datetime | None = None) -> PlaySession:
    """One checkpoint from one browser. Creates the sitting if this is the first word of it.

    ONE ENDPOINT RATHER THAN start/beat/end, because the first call is the one most likely to be
    lost: it happens while the page is still loading, on whatever connection the player has. If
    "start" were its own call and it failed, every later beat would be an orphan. Here the first
    beat that arrives creates the row, so a lost one costs thirty seconds of playtime and nothing
    else.

    WHAT IS CLAMPED, in order, and why each one is needed:

      against the last beat   a checkpoint may add at most the time that has actually passed since
                              the one before it. This is the clamp that matters: without it a
                              client can send 9e15 once and own the dashboard forever.
      never backwards         `max` with what is already stored. Beats can arrive out of order —
                              a retry overtaking the original, a page restored from the
                              back/forward cache replaying its last state — and a session whose
                              playtime goes down is a session that will cross a milestone twice.
      against the whole       a session can never hold more play than has passed since it began.
                              Belt and braces over the per-beat clamp, and the thing that catches
                              a client replaying one valid beat at speed.
      against MAX_SESSION_MS  a sitting is a sitting, not a fortnight.
    """
    now = now or datetime.now(timezone.utc)
    claimed = max(0, int(claimed_ms or 0))

    s = db.scalar(select(PlaySession).where(PlaySession.session_id == session_id))
    if s is None:
        # First word of this sitting. Whether it is a first sitting is decided now, once.
        prior = db.scalar(
            select(func.count(PlaySession.id)).where(PlaySession.anon_id == anon_id)) or 0
        s = PlaySession(
            anon_id=anon_id, session_id=session_id,
            started_at=now, last_beat_at=now, ended_at=now if ended else None,
            # A first beat has no previous beat to be measured against, so it is allowed only the
            # slack. A browser that opens and immediately claims an hour gets two seconds.
            active_ms=min(claimed, SLACK_MS),
            is_new=(prior == 0), session_no=prior + 1,
        )
        db.add(s)
        db.flush()
    else:
        since_last = (now - _utc(s.last_beat_at)).total_seconds() * 1000.0
        allowed = int(s.active_ms + max(0.0, since_last) + SLACK_MS)
        whole = int((now - _utc(s.started_at)).total_seconds() * 1000.0) + SLACK_MS
        s.active_ms = max(int(s.active_ms), min(claimed, allowed, whole, MAX_SESSION_MS))
        s.last_beat_at = now
        if ended and s.ended_at is None:
            s.ended_at = now

    _mark_milestones(db, s, now)
    return s


def _mark_milestones(db: Session, s: PlaySession, now: datetime) -> None:
    """Write a row for every minute-mark this sitting has now got past and had not before.

    The unique constraint on (session, minutes) is what guarantees no duplicates — this reads the
    existing rows first only to avoid generating integrity errors on every single beat, which
    would be correct and would also fill the log with noise. The try/except is the real guard: two
    beats racing both see "not yet crossed" and both insert, and the loser is dropped by the
    database rather than by a lock somebody remembered to take."""
    done = set(db.scalars(
        select(PlayMilestone.minutes).where(PlayMilestone.session_pk == s.id)).all())
    for m in MILESTONES:
        if s.active_ms >= m * 60_000 and m not in done:
            db.add(PlayMilestone(session_pk=s.id, anon_id=s.anon_id, minutes=m, reached_at=now))
            try:
                db.flush()
            except IntegrityError:
                # Somebody else's beat got there first. That is the constraint doing its job.
                db.rollback()
                return


# ----------------------------- READING IT BACK -----------------------------

RANGES = {"today": 1, "7d": 7, "30d": 30, "all": None}

# The buckets the dashboard shows, as (label, low_ms_inclusive, high_ms_exclusive).
BUCKETS = (
    ("Under 1 min", 0, 60_000),
    ("1–5 min", 60_000, 5 * 60_000),
    ("5–15 min", 5 * 60_000, 15 * 60_000),
    ("15–30 min", 15 * 60_000, 30 * 60_000),
    ("30–60 min", 30 * 60_000, 60 * 60_000),
    ("1–2 hours", 60 * 60_000, 120 * 60_000),
    ("2+ hours", 120 * 60_000, None),
)


def _since(window: str, now: datetime) -> datetime | None:
    """The start of the window. "today" is the last 24 hours rather than since midnight: a server
    in UTC and a player in Jerusalem disagree about when today started, and "the last day" is the
    same sentence in both."""
    days = RANGES.get(window, 7)
    return None if days is None else now - timedelta(days=days)


def summarise(db: Session, window: str = "7d", now: datetime | None = None,
              recent: int = 50) -> dict:
    """Every number on the dashboard, from one pass over the sessions in the window.

    IN PYTHON RATHER THAN IN SQL, deliberately. A median is three different expressions across
    SQLite and Postgres, the day-by-day grouping is another two, and the whole table is one row
    per sitting for one indie game — at a thousand players a day this is four hundred thousand
    rows a year, which a laptop sorts in a blink. The day this is slow is the day it is worth a
    rollup table, and that day will announce itself. Portability now is worth more, because it is
    what lets the test suite run the real arithmetic on SQLite rather than a mock of it."""
    now = now or datetime.now(timezone.utc)
    since = _since(window, now)

    # A WINDOW HAS TWO ENDS: bounded at `now` as well as at `since`. With the real clock nothing is in the future and the
    # upper bound never does anything — which is exactly why it was missing, and why it was worth
    # a test: the day-by-day series is built up to `now.date()` and the totals were not, so a row
    # dated ahead of the clock counted in "total sessions" and appeared on no day. A clock pushed
    # forward on one machine, or a window asked for as of a moment in the past, is enough.
    q = select(PlaySession).where(PlaySession.started_at <= now)
    if since is not None:
        q = q.where(PlaySession.started_at >= since)
    rows = list(db.scalars(q.order_by(PlaySession.started_at.desc())).all())

    lengths = [int(r.active_ms) for r in rows]
    players = {r.anon_id for r in rows}
    # "New" means this window contains the sitting that was that player's first ever — the flag
    # written when the row was made, not a recount. A player whose first sitting was in March is
    # a returning player in April, which is the only reading that does not change when the filter
    # moves.
    new_players = {r.anon_id for r in rows if r.is_new}
    returning = players - new_players
    # AND THE NUMBER THAT ACTUALLY ANSWERS "DO THEY COME BACK", which is not the same question and
    # was briefly the same field. new/returning above is a partition of the window: everybody seen
    # is one or the other, by whether their first ever sitting falls inside it. That is the
    # standard reading and for a fortnight-old game it says 0% returning — which is true, there
    # was no "before", and it is also the opposite of what a reader takes from it when the same
    # thirty-four people played a hundred sittings between them.
    # So this is counted separately and labelled for what it is: somebody who sat down a second
    # time. It deliberately OVERLAPS new — discovering the game and coming back the next evening
    # is both, and it is the best thing that can happen.
    came_back = {r.anon_id for r in rows if r.session_no > 1}
    live = [r for r in rows if is_live(r, now)]

    def bucket_of(ms: int) -> str:
        for label, lo, hi in BUCKETS:
            if ms >= lo and (hi is None or ms < hi):
                return label
        return BUCKETS[-1][0]

    dist = {label: 0 for label, _, _ in BUCKETS}
    for ms in lengths:
        dist[bucket_of(ms)] += 1

    # One entry per day in the window, zero-filled, oldest first — so a chart has no gaps and
    # does not silently draw Tuesday next to Friday.
    by_day: dict[str, dict] = {}
    for r in rows:
        key = _utc(r.started_at).date().isoformat()
        d = by_day.setdefault(key, {"day": key, "sessions": 0, "players": set(),
                                    "new": set(), "ms": 0})
        d["sessions"] += 1
        d["players"].add(r.anon_id)
        if r.is_new:
            d["new"].add(r.anon_id)
        d["ms"] += int(r.active_ms)
    span_start = (since or (_utc(rows[-1].started_at) if rows else now)).date()
    days = []
    cur = span_start
    today = now.date()
    while cur <= today:
        key = cur.isoformat()
        d = by_day.get(key)
        if d:
            days.append({"day": key, "sessions": d["sessions"], "players": len(d["players"]),
                         "new": len(d["new"]), "returning": len(d["players"] - d["new"]),
                         "avg_ms": round(d["ms"] / d["sessions"]) if d["sessions"] else 0})
        else:
            days.append({"day": key, "sessions": 0, "players": 0, "new": 0,
                         "returning": 0, "avg_ms": 0})
        cur += timedelta(days=1)
    # A year of empty days before the first session helps nobody read a chart.
    days = days[-370:]

    milestone_counts = {}
    mq = select(PlayMilestone.minutes, func.count(PlayMilestone.id))
    if since is not None:
        mq = mq.where(PlayMilestone.reached_at >= since)
    for minutes, n in db.execute(mq.group_by(PlayMilestone.minutes)).all():
        milestone_counts[int(minutes)] = int(n)

    return {
        "window": window,
        "generated_at": now.isoformat(),
        "totals": {
            "players": len(players),
            "sessions": len(rows),
            "live": len({r.anon_id for r in live}),
            "hours": round(sum(lengths) / 3_600_000, 2),
            "avg_ms": round(statistics.fmean(lengths)) if lengths else 0,
            "median_ms": round(statistics.median(lengths)) if lengths else 0,
            "longest_ms": max(lengths) if lengths else 0,
            "new_players": len(new_players),
            "returning_players": len(returning),
            "came_back": len(came_back),
            # Of the people seen in this window, how many sat down more than once. Zero players is
            # zero per cent rather than a division by zero.
            "return_rate": round(100 * len(came_back) / len(players), 1) if players else 0.0,
            "sessions_per_player": round(len(rows) / len(players), 2) if players else 0.0,
        },
        "distribution": [{"label": label, "n": dist[label]} for label, _, _ in BUCKETS],
        "milestones": [{"minutes": m, "sessions": milestone_counts.get(m, 0)} for m in MILESTONES],
        "days": days,
        "recent": [{
            "anon": r.anon_id[:10],          # enough to tell two rows apart, and nothing else
            "started": _utc(r.started_at).isoformat(),
            "ended": (_utc(r.ended_at).isoformat() if r.ended_at else
                      (None if is_live(r, now) else session_end(r, now).isoformat())),
            "live": is_live(r, now),
            "active_ms": int(r.active_ms),
            "is_new": bool(r.is_new),
            "session_no": int(r.session_no),
        } for r in rows[:recent]],
    }
