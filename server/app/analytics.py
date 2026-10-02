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

from app.models import PlayEvent, PlayMilestone, PlaySession

# ============================ WHAT THE GAME DOES ============================
#
# Every name here is a thing The Crew already does, read out of play.html rather than chosen from
# a list of events a generic game might have. The Crew has no levels, no quests and no characters;
# it has a founding week, a roster of six thousand files, recruitment trips you travel to, postings
# on a board, and nights that end in one of five bands. So:
#
#   game_started      a new commander is made — confirm-create on the title screen
#   game_resumed      an existing campaign is loaded — Continue
#   candidate_viewed  a file opened on the roster
#   trip_started      a recruitment trip begins; in this game hiring is a journey, not a button
#   member_signed     they said yes — off a trip, a walk-in, or somebody asking to stay
#   member_refused    they said no
#   member_dropped    cut loose
#   crew_filled       every seat the name allows is taken, for the first time
#   job_viewed        a posting opened
#   job_cased         a week spent watching one
#   job_run           the crew is committed to the night
#   job_done          the verdict: 0 disaster, 1 botched, 2 messy, 3 success, 4 clean
#   job_expired       a posting that was looked at went off the board untaken
#   member_lost       dead, jailed, or walked
#   rival_ended       a rival chapter closed, by whichever of the five ways
#   week_turned       the week ticked over — how far in, independent of what was done
#   game_over         won the last stage, or ran out of crew and float
#   new_game          wiped and started again
#
# THE FUNNEL IS BUILT FROM THESE, not from a second set of "funnel events". A step that is a
# derived fact — "started a second posting" — is counted from job_run rather than reported
# separately, because two ways of saying the same thing is two things to keep in agreement.
NAMES = (
    "game_started", "game_resumed", "candidate_viewed", "trip_started", "member_signed",
    "member_refused", "member_dropped", "crew_filled", "job_viewed", "job_cased", "job_run",
    "job_done", "job_expired", "member_lost", "rival_ended", "week_turned", "game_over",
    "new_game",
)
NAME_SET = frozenset(NAMES)

# What a verdict band is called, in the game's own words (VERDICT_WORD in play.html).
VERDICTS = ("disaster", "botched", "messy", "success", "clean")

# The twelve kinds of posting, as CATS in play.html names them. Held here so the dashboard can
# show a category that nobody has attempted yet as a zero rather than as an absence.
CATS = ("interception", "recovery", "extraction", "escort", "surveillance", "infiltration",
        "cyber", "smuggling", "forgery", "negotiation", "sabotage", "vault")
CAT_LABEL = {"forgery": "Papers"}          # the one whose label is not its key, capitalised

# At most this many events in one batch, and this many per sitting in total. A sitting that
# generates more than a few hundred events is a loop rather than a player.
MAX_BATCH = 40
MAX_EVENTS_PER_SESSION = 600

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


def record_events(db: Session, s: PlaySession, items: list, now: datetime | None = None) -> int:
    """Write a batch of game events for a sitting. Returns how many were new.

    EVERY FIELD IS CHECKED AGAINST A FIXED LIST OR A RANGE before it reaches a column, because
    this is an unauthenticated endpoint and the body is whatever somebody felt like sending. An
    unknown event name is dropped rather than stored: a name column that accepts anything is a
    name column that will one day hold 10,000 distinct strings and no funnel.

    DUPLICATES ARE REFUSED BY THE DATABASE, not by a check here. A dropped connection means the
    browser retries a batch it does not know landed, and a page restored from the back/forward
    cache can replay its whole queue. (session, seq) is unique, so the second copy loses — and it
    loses even when two batches arrive at the same instant on two workers, which an `if` could not
    promise. Each row is flushed on its own so one duplicate does not take the batch with it."""
    now = now or datetime.now(timezone.utc)
    if not isinstance(items, list):
        return 0
    held = db.scalar(select(func.count(PlayEvent.id))
                     .where(PlayEvent.session_id == s.session_id)) or 0
    room = MAX_EVENTS_PER_SESSION - int(held)
    written = 0
    for raw in items[:MAX_BATCH]:
        if room <= 0:
            break
        if not isinstance(raw, dict):
            continue
        name = str(raw.get("n") or "")
        if name not in NAME_SET:
            continue
        seq = _int(raw.get("q"), 1, 1_000_000)
        if seq is None:
            continue
        # dur_ms is the browser's own stopwatch — how long a posting sat open before it was run.
        # Clamped to the sitting's own active time, so it cannot describe an afternoon that did
        # not happen, and so it stays consistent with the playtime on the same row.
        dur = _int(raw.get("d"), 0, int(s.active_ms) + SLACK_MS)
        ev = PlayEvent(
            anon_id=s.anon_id, session_id=s.session_id, seq=seq, name=name, at=now,
            week=_int(raw.get("w"), 0, 10_000),
            cat=_word(raw.get("c"), 24),
            tier=_int(raw.get("t"), 0, 9),
            verdict=_int(raw.get("v"), 0, 4),
            team=_int(raw.get("m"), 0, 12),
            dur_ms=dur,
            ok=None if raw.get("k") is None else bool(raw.get("k")),
            extra=_word(raw.get("x"), 120),
        )
        db.add(ev)
        try:
            db.flush()
            written += 1
            room -= 1
        except IntegrityError:
            # Already have this one. That is the constraint doing its job, and the commonest
            # reason for it is a retry that worked the first time.
            db.rollback()
    return written


def _int(v, lo: int, hi: int) -> int | None:
    """A whole number inside a range, or None. Anything else — a string, a float, a list, NaN —
    is None rather than an exception: this runs on a body a stranger wrote."""
    try:
        if v is None or isinstance(v, bool):
            return None
        n = int(v)
    except (TypeError, ValueError):
        return None
    return n if lo <= n <= hi else None


def _word(v, cap: int) -> str | None:
    """A short label of safe characters, or None. Letters, digits, dash, comma, space — enough for
    a category key or a comma-separated list of trades, and nothing that belongs in a query."""
    if v is None:
        return None
    s = str(v)[:cap].strip()
    if not s:
        return None
    return s if all(ch.isalnum() or ch in "-_, ." for ch in s) else None


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


# ====================== THE PLAYER JOURNEY, READ BACK ======================
#
# All of it over the events in one window, in Python, for the same reason summarise() is: a funnel
# is a sequence of set intersections and a median is three different expressions across SQLite and
# Postgres. One indie game's events fit in memory by a wide margin, and the day they do not is the
# day a rollup table is worth writing.

# THE FUNNEL, in the order the game actually goes. Each step is (key, label, what counts).
# "Reaching" is counted per PLAYER, not per session: somebody who opened the game on Monday and
# ran their first posting on Thursday got there, and a funnel that loses them because those were
# two sittings is a funnel measuring sittings.
#
# EVERY LINK HERE IS A THING THE GAME ACTUALLY REQUIRES, and that is the whole of why this list
# is short. Two attempts got it wrong first:
#
#   Filling the crew is not a gate. The Crew lets four people run a posting that wants four, so
#   more players had opened a posting than had ever filled a crew, and the drop-off between the
#   two came out at MINUS TWELVE PER CENT. A negative drop-off is not a finding; it is a funnel
#   reporting on steps that are not in sequence.
#
#   Nor is signing somebody, or reading a file on the roster. The board can be opened by a
#   commander with nobody on the books, so those two can invert the same way.
#
# What IS required: you cannot open a posting without a campaign; you cannot run one without
# opening it, and assessJob refuses a crew smaller than the posting asks for, which is never
# fewer than two — so running one requires having signed somebody even though opening one does
# not. You cannot finish a posting you did not run, and the game holds S.pendingJob until the
# report is closed, so you cannot run a second before the first has resolved.
#
# Recruitment is counted in the crew section instead, as what it is: behaviour, not a gate.
FUNNEL = (
    ("opened", "Opened the game", "any"),
    ("started", "Began a campaign", "game_started|game_resumed"),
    ("job1v", "Opened a posting", "job_viewed"),
    ("job1", "Ran their first", "job_run#1"),
    ("job1done", "Saw it through", "job_done#1"),
    ("job2", "Ran a second", "job_run#2"),
    ("job3", "Ran a third", "job_run#3"),
    ("job5", "Ran a fifth", "job_run#5"),
    ("job10", "Ran a tenth", "job_run#10"),
)


def _reached(by_player: dict, rule: str) -> set:
    """Who did this thing at all. `name#n` means the nth time; `a|b` means either."""
    if rule == "any":
        return set(by_player)
    spec, _, nth = rule.partition("#")
    want = int(nth) if nth else 1
    names = set(spec.split("|"))
    return {a for a, evs in by_player.items()
            if sum(1 for e in evs if e.name in names) >= want}


def _funnel(by_player: dict) -> list:
    """The funnel, made monotone BY WHAT THE GAME REQUIRES rather than by intersecting sets.

    The obvious construction — a player is at step k only if they also reached every step above —
    was tried and is wrong here in a way that matters: it makes one lost batch catastrophic. Miss
    the beat carrying a job_done and that player drops out of "saw it through" AND out of every
    step below it, so a flaky connection reads as a cliff in the middle of the funnel.

    This goes the other way. Every link in FUNNEL is something the game genuinely requires of the
    step below it, so reaching a later step is proof of the earlier ones: the sets are unioned
    upward from the bottom. That gives a funnel that is monotone by construction — no negative
    drop-offs, ever — and that repairs itself when an event goes missing, because the later events
    vouch for the earlier one.

    `any` is kept beside `n` so the repair is visible rather than silent: where they differ, the
    difference is players whose own event for that step never arrived and who were counted anyway
    on the strength of what they did next."""
    total = len(by_player)
    raw = [_reached(by_player, rule) for _, _, rule in FUNNEL]
    sets = list(raw)
    for i in range(len(sets) - 2, -1, -1):
        sets[i] = sets[i] | sets[i + 1]
    out, prev = [], None
    for (key, label, _), did, got in zip(FUNNEL, raw, sets):
        n = len(got)
        out.append({
            "key": key, "label": label, "n": n,
            "any": len(did),
            "inferred": max(0, n - len(did)),
            "pct": round(100 * n / total, 1) if total else 0.0,
            # Of the people still here at the step above, how many carried on. The first step has
            # nothing above it, so it is null rather than a flattering 0%.
            "kept": None if prev is None else (round(100 * n / prev, 1) if prev else 0.0),
            "lost": None if prev is None else (round(100 * (prev - n) / prev, 1) if prev else 0.0),
            "lost_n": None if prev is None else max(0, prev - n),
        })
        prev = n
    return out


def _since_window(window: str, now: datetime):
    return _since(window, now)


def journey_summary(db: Session, window: str = "7d", now: datetime | None = None,
                    cohort: str = "all", cat: str = "", outcome: str = "all") -> dict:
    """The Game Events half of the dashboard: funnel, postings, exits, and new against returning.

    FILTERS. `cohort` is new|returning|all and is decided by the SESSION a player's events belong
    to — see PlaySession.is_new, which is written once when the sitting starts and never recomputed.
    `cat` narrows the posting tables to one of the twelve kinds. `outcome` is won|lost|all and
    applies only to the posting tables, because "the funnel, for players whose jobs failed" is a
    sentence that sounds meaningful and is not: it would silently drop everybody who never ran one,
    which is the population the funnel exists to count."""
    now = now or datetime.now(timezone.utc)
    since = _since_window(window, now)

    sq = select(PlaySession).where(PlaySession.started_at <= now)
    if since is not None:
        sq = sq.where(PlaySession.started_at >= since)
    sessions = list(db.scalars(sq).all())
    if cohort == "new":
        sessions = [s for s in sessions if s.is_new]
    elif cohort == "returning":
        sessions = [s for s in sessions if not s.is_new]
    sids = {s.session_id for s in sessions}
    by_sid = {s.session_id: s for s in sessions}

    eq = select(PlayEvent).where(PlayEvent.at <= now)
    if since is not None:
        eq = eq.where(PlayEvent.at >= since)
    events = [e for e in db.scalars(eq.order_by(PlayEvent.at, PlayEvent.seq)).all()
              if e.session_id in sids]

    by_player: dict = {}
    for e in events:
        by_player.setdefault(e.anon_id, []).append(e)
    # Everybody who had a sitting counts as having opened the game, whether or not their browser
    # ever got an event out. Otherwise step one is "players whose first batch landed".
    for s in sessions:
        by_player.setdefault(s.anon_id, [])

    total = len(by_player)
    steps = _funnel(by_player)

    # ---- how a crew gets built ----
    # Filling it is an achievement rather than a gate (see FUNNEL), so it is counted here with the
    # rest of what a player does while putting a crew together.
    looked_before, trades, dropped, fill_ms = [], {}, 0, []
    for evs in by_player.values():
        seen = 0
        for e in evs:
            if e.name == "candidate_viewed":
                seen += 1
            elif e.name == "member_signed":
                looked_before.append(seen)       # files read before THIS signing
                seen = 0
                if e.cat:
                    trades[e.cat] = trades.get(e.cat, 0) + 1
            elif e.name == "member_dropped":
                dropped += 1
            elif e.name == "crew_filled" and e.dur_ms:
                fill_ms.append(int(e.dur_ms))
    def share(rule):
        n = len(_reached(by_player, rule))
        return {"n": n, "pct": round(100 * n / total, 1) if total else 0.0}

    crew = {
        # The recruitment steps, reported as behaviour rather than as funnel links — none of them
        # is required to open the board, so putting them in a drop-off chain was what produced a
        # negative percentage. See FUNNEL.
        "steps": [
            {"label": "Opened a file on the roster", **share("candidate_viewed")},
            {"label": "Travelled to recruit", **share("trip_started")},
            {"label": "Signed somebody", **share("member_signed")},
            {"label": "Was turned down", **share("member_refused")},
            {"label": "Filled every seat", **share("crew_filled")},
            {"label": "Cut somebody loose", **share("member_dropped")},
            {"label": "Lost somebody", **share("member_lost")},
        ],
        "signings": sum(trades.values()),
        "dropped": dropped,
        "median_viewed_before_signing": round(statistics.median(looked_before)) if looked_before else 0,
        "median_fill_ms": round(statistics.median(fill_ms)) if fill_ms else 0,
        "trades": sorted(({"k": k, "n": v} for k, v in trades.items()),
                         key=lambda r: -r["n"])[:16],
    }

    # ---- postings, by the only unit that means the same thing to two players ----
    runs = [e for e in events if e.name == "job_run"]
    dones = [e for e in events if e.name == "job_done"]
    views = [e for e in events if e.name == "job_viewed"]
    gone = [e for e in events if e.name == "job_expired"]
    if cat:
        runs = [e for e in runs if e.cat == cat]
        dones = [e for e in dones if e.cat == cat]
        views = [e for e in views if e.cat == cat]
        gone = [e for e in gone if e.cat == cat]
    if outcome == "won":
        dones = [e for e in dones if e.ok]
    elif outcome == "lost":
        dones = [e for e in dones if e.ok is False]

    jobs = {}
    def slot(c, t):
        k = (c or "?", int(t or 0))
        return jobs.setdefault(k, {"cat": k[0], "label": CAT_LABEL.get(k[0], (k[0] or "?").title()),
                                   "tier": k[1], "viewed": 0, "run": 0, "done": 0, "won": 0,
                                   "lost": 0, "abandoned": 0, "players": set(), "ms": []})
    for e in views:
        d = slot(e.cat, e.tier); d["viewed"] += 1; d["players"].add(e.anon_id)
    for e in runs:
        d = slot(e.cat, e.tier); d["run"] += 1; d["players"].add(e.anon_id)
    for e in dones:
        d = slot(e.cat, e.tier); d["done"] += 1; d["players"].add(e.anon_id)
        if e.ok:
            d["won"] += 1
        else:
            d["lost"] += 1
        if e.dur_ms:
            d["ms"].append(int(e.dur_ms))
    for e in gone:
        # Only a posting the player had actually opened is recorded as expired — see play.html.
        # A board refreshing past somebody who never looked is not an abandonment.
        d = slot(e.cat, e.tier); d["abandoned"] += 1
    rows = []
    for d in jobs.values():
        seen = d["viewed"] or d["run"]
        rows.append({
            "cat": d["cat"], "label": d["label"], "tier": d["tier"],
            "viewed": d["viewed"], "run": d["run"], "done": d["done"],
            "players": len(d["players"]),
            "take_rate": round(100 * d["run"] / seen, 1) if seen else 0.0,
            "win_rate": round(100 * d["won"] / d["done"], 1) if d["done"] else 0.0,
            "loss_rate": round(100 * d["lost"] / d["done"], 1) if d["done"] else 0.0,
            # Of the postings this player opened, how many went off the board untaken.
            "abandon_rate": round(100 * d["abandoned"] / seen, 1) if seen else 0.0,
            "avg_ms": round(statistics.fmean(d["ms"])) if d["ms"] else 0,
        })
    rows.sort(key=lambda r: (-r["run"], -r["viewed"], r["cat"]))

    # ---- verdict spread, which is the same data read the other way ----
    spread = [{"verdict": i, "label": VERDICTS[i].title(),
               "n": sum(1 for e in dones if e.verdict == i)} for i in range(5)]

    # ---- where sittings end ----
    # The LAST event of each finished sitting. Not proof anybody disliked anything — a browser
    # closes for a hundred reasons — just the last place the game was known to be.
    exits = {}
    last_by_sid = {}
    for e in events:
        last_by_sid[e.session_id] = e            # events are already in order
    for sid, e in last_by_sid.items():
        s = by_sid.get(sid)
        if s is None or is_live(s, now):
            continue                             # still playing: not an exit yet
        key = _exit_label(e)
        d = exits.setdefault(key, {"where": key, "n": 0, "players": set()})
        d["n"] += 1
        d["players"].add(e.anon_id)
    exit_rows = sorted(({"where": d["where"], "n": d["n"], "players": len(d["players"])}
                        for d in exits.values()), key=lambda r: -r["n"])
    exit_total = sum(r["n"] for r in exit_rows) or 1
    for r in exit_rows:
        r["pct"] = round(100 * r["n"] / exit_total, 1)

    # ---- first-timers against people who came back ----
    cohorts = []
    for label, pick in (("First sitting", lambda s: s.is_new),
                        ("Returning", lambda s: not s.is_new)):
        ss = [s for s in sessions if pick(s)]
        sset = {s.session_id for s in ss}
        evs = [e for e in events if e.session_id in sset]
        players = {s.anon_id for s in ss}
        lens = [int(s.active_ms) for s in ss]
        weeks = [e.week for e in evs if e.week]
        cohorts.append({
            "label": label,
            "players": len(players),
            "sessions": len(ss),
            "median_ms": round(statistics.median(lens)) if lens else 0,
            "jobs_run": sum(1 for e in evs if e.name == "job_run"),
            "jobs_per_player": round(sum(1 for e in evs if e.name == "job_run") / len(players), 2)
                               if players else 0.0,
            "furthest_week": max(weeks) if weeks else 0,
            "median_week": round(statistics.median(weeks)) if weeks else 0,
            "sessions_per_player": round(len(ss) / len(players), 2) if players else 0.0,
        })

    return {
        "window": window, "cohort": cohort, "cat": cat, "outcome": outcome,
        "generated_at": now.isoformat(),
        "players": total,
        "events": len(events),
        "funnel": steps,
        "crew": crew,
        "jobs": rows[:60],
        "spread": spread,
        "exits": exit_rows[:14],
        "cohorts": cohorts,
        "cats": [{"k": c, "l": CAT_LABEL.get(c, c.title())} for c in CATS],
    }


def _exit_label(e: PlayEvent) -> str:
    """Where a sitting stopped, in words somebody can act on.

    A verdict is split out from the rest because "left straight after a disaster" and "left after
    clean work" are the two most interesting exits in the game and merging them into "after a
    posting" throws away the whole signal."""
    n = e.name
    if n == "job_done":
        if e.verdict is None:
            return "After a posting"
        return "After " + ("clean work" if e.verdict == 4 else
                           "a success" if e.verdict == 3 else
                           "a messy night" if e.verdict == 2 else
                           "a botched job" if e.verdict == 1 else "a disaster")
    return {
        "game_started": "Just after starting",
        "game_resumed": "Just after loading a save",
        "candidate_viewed": "Reading the roster",
        "trip_started": "During a recruitment trip",
        "member_signed": "After signing somebody",
        "member_refused": "After being turned down",
        "member_dropped": "After cutting somebody loose",
        "crew_filled": "With the crew just filled",
        "job_viewed": "Choosing a posting",
        "job_cased": "While casing a posting",
        "job_run": "During a posting",
        "job_expired": "After a posting went off the board",
        "member_lost": "After losing somebody",
        "rival_ended": "After finishing a rival",
        "week_turned": "Between weeks",
        "game_over": "At the end of the game",
        "new_game": "Just after starting again",
    }.get(n, n)


def player_journey(db: Session, anon: str, limit_sessions: int = 12) -> dict:
    """One anonymous player's sittings, in order, with what happened in each.

    For reading a drop-off that a percentage cannot explain. It is the anonymous id and nothing
    else — there is no name, address or account to show, because none was ever stored."""
    sessions = list(db.scalars(
        select(PlaySession).where(PlaySession.anon_id == anon)
        .order_by(PlaySession.started_at.desc()).limit(limit_sessions)).all())
    if not sessions:
        return {"anon": anon[:10], "found": False, "sessions": []}
    now = datetime.now(timezone.utc)
    sids = [s.session_id for s in sessions]
    events = list(db.scalars(
        select(PlayEvent).where(PlayEvent.session_id.in_(sids))
        .order_by(PlayEvent.at, PlayEvent.seq)).all())
    per: dict = {}
    for e in events:
        per.setdefault(e.session_id, []).append(e)
    out = []
    for s in sorted(sessions, key=lambda x: x.started_at):
        out.append({
            "session_no": int(s.session_no),
            "is_new": bool(s.is_new),
            "started": _utc(s.started_at).isoformat(),
            "ended": None if is_live(s, now) else session_end(s, now).isoformat(),
            "live": is_live(s, now),
            "active_ms": int(s.active_ms),
            "events": [{
                "at": _utc(e.at).isoformat(),
                "name": e.name,
                "line": _journey_line(e),
            } for e in per.get(s.session_id, [])],
        })
    return {"anon": anon[:10], "found": True, "sessions": out,
            "totals": {"sessions": len(sessions),
                       "active_ms": sum(int(s.active_ms) for s in sessions),
                       "events": len(events)}}


def _an(word: str) -> str:
    """"an Infiltration", not "a Infiltration". Five letters' worth of rule, and the alternative is
    a journey nobody reads twice because the second line of it is written badly."""
    return ("an " if word[:1].lower() in "aeiou" else "a ") + word


def _journey_line(e: PlayEvent) -> str:
    """One event as a sentence, in the game's vocabulary."""
    cat = CAT_LABEL.get(e.cat or "", (e.cat or "").title())
    tier = f" · tier {e.tier}" if e.tier else ""
    wk = f" (week {e.week})" if e.week else ""
    crew = f", crew of {e.team}" if e.team else ""
    if e.name == "job_done":
        v = VERDICTS[e.verdict] if e.verdict is not None and 0 <= e.verdict < 5 else "?"
        return f"{cat}{tier} — {v}{crew}{wk}"
    if e.name == "job_expired":
        # Not "Let go off the board a Vault". The object comes first or the sentence falls over.
        how = " after casing it" if e.ok else ""
        line = f"{_an(cat) if cat else 'a posting'}{tier} went off the board untaken{how}{wk}"
        return line[0].upper() + line[1:]            # the object leads, so it starts the sentence
    if e.name in ("job_run", "job_viewed", "job_cased"):
        verb = {"job_run": "Ran", "job_viewed": "Opened", "job_cased": "Cased"}[e.name]
        return f"{verb} {_an(cat) if cat else 'a posting'}{tier}{crew}{wk}"
    if e.name in ("candidate_viewed", "trip_started", "member_signed", "member_refused",
                  "member_dropped", "member_lost"):
        verb = {"candidate_viewed": "Read a file on", "trip_started": "Travelled to recruit",
                "member_signed": "Signed", "member_refused": "Turned down by",
                "member_dropped": "Cut loose", "member_lost": "Lost"}[e.name]
        # member_lost carries the reason in cat and the trade in extra; everything else the reverse.
        if e.name == "member_lost":
            who = _an(CAT_LABEL.get(e.extra or "", (e.extra or "").title())) if e.extra else "somebody"
            return f"Lost {who}" + (f" — {e.cat}" if e.cat else "") + wk
        return verb + (f" {_an(cat)}" if e.cat else "") + wk
    return {
        "game_started": "Started a campaign",
        "game_resumed": "Loaded a save",
        "crew_filled": "Filled the crew" + (f" ({e.team} places)" if e.team else ""),
        "rival_ended": "Finished a rival" + (f" — {e.cat}" if e.cat else ""),
        "week_turned": f"Week {e.week}" if e.week else "A week turned",
        "game_over": "Game over" + (f" — {e.cat}" if e.cat else ""),
        "new_game": "Started again",
    }.get(e.name, e.name) + (wk if e.name not in ("week_turned", "game_over") else "")


def busiest_players(db: Session, window: str = "7d", now: datetime | None = None,
                    limit: int = 20) -> list:
    """Anonymous ids worth opening a journey for: the ones with the most to look at."""
    now = now or datetime.now(timezone.utc)
    since = _since_window(window, now)
    q = select(PlaySession.anon_id,
               func.count(PlaySession.id),
               func.sum(PlaySession.active_ms)).where(PlaySession.started_at <= now)
    if since is not None:
        q = q.where(PlaySession.started_at >= since)
    rows = db.execute(q.group_by(PlaySession.anon_id)).all()
    out = [{"anon": a, "short": a[:10], "sessions": int(n), "active_ms": int(ms or 0)}
           for a, n, ms in rows]
    out.sort(key=lambda r: (-r["active_ms"], -r["sessions"]))
    return out[:limit]
