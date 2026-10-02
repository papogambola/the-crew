"""A ceiling on the endpoints anybody can reach without proving anything.

Only one of them needs it today and it is the reason this file exists: **`/auth/forgot` sends an
email to an address the caller chose.** Unbounded, that is a machine for having playthecrew.com
deliver mail to people who never asked for it — and the endpoint answers identically whether or
not the address has an account, so it cannot limit itself by being useless.

Two windows, because they stop different things:

- **per caller** bounds one machine working down a list of addresses;
- **per address** bounds a bank of machines working on one address, which the per-caller window
  does not touch at all.

In process, so it resets on every deploy and is not shared between instances. That is a real
limit and an accepted one: it turns "free" into "slow", which is the whole goal, without adding
Redis to a service that otherwise needs one database and nothing else.
"""
import os
import time
from collections import defaultdict, deque

from fastapi import HTTPException, Request, status

# Enough that a person who tries, checks their spam folder, and tries again never sees it.
RESET_PER_CALLER = int(os.environ.get("RESET_RATE_LIMIT", "5"))
RESET_PER_EMAIL = int(os.environ.get("RESET_EMAIL_RATE_LIMIT", "3"))
RESET_WINDOW_SECONDS = float(os.environ.get("RESET_RATE_WINDOW", "3600"))

TOO_MANY = "Too many tries. Give it a few minutes."

_hits: dict[str, deque[float]] = defaultdict(deque)


def caller_key(request: Request | None) -> str:
    """Who is calling, as well as that can be known from behind a proxy.

    Railway terminates TLS in front of the app, so `request.client.host` is the proxy for every
    caller on earth and would put the whole internet in one bucket. The left-most X-Forwarded-For
    entry is the original client — caller-supplied, therefore forgeable, which caps what this can
    promise: it slows an attacker who cannot be bothered and does nothing to one who rotates the
    header. The per-address window is what covers that, and that one cannot be forged, because it
    is keyed on the address being attacked rather than on who is attacking it.
    """
    if request is None:
        return "unknown"
    fwd = request.headers.get("x-forwarded-for")
    if fwd:
        return fwd.split(",")[0].strip()[:64]
    return (request.client.host if request.client else "unknown")[:64]


def hit(bucket: str, limit: int, window: float) -> bool:
    """Record one attempt. True means it was over the line."""
    now = time.monotonic()
    seen = _hits[bucket]
    while seen and now - seen[0] > window:
        seen.popleft()
    if len(seen) >= limit:
        return True
    seen.append(now)
    return False


def guard_reset(request: Request | None, email: str) -> None:
    """Both windows for a forgot-password call. Raises 429 when either is full."""
    over = hit(f"reset:ip:{caller_key(request)}", RESET_PER_CALLER, RESET_WINDOW_SECONDS)
    # Evaluated second and not short-circuited: both buckets should count the attempt, or a
    # caller who trips the per-address limit gets a free pass on the per-caller one.
    over = hit(f"reset:to:{email}", RESET_PER_EMAIL, RESET_WINDOW_SECONDS) or over
    if over:
        raise HTTPException(status.HTTP_429_TOO_MANY_REQUESTS, TOO_MANY)


# A sitting checks in every thirty seconds, so twelve an hour is the honest rate. The ceiling is
# well clear of it: a page restored from the back/forward cache, a flaky connection retrying, and
# a player with the game open in two tabs all beat more often than the timer says, and none of
# them is abuse. What it stops is a loop.
BEAT_PER_ANON = int(os.environ.get("BEAT_RATE_LIMIT", "120"))
BEAT_WINDOW_SECONDS = float(os.environ.get("BEAT_RATE_WINDOW", "600"))


def guard_beat(anon_id: str) -> bool:
    """True when this anonymous id has checked in too often. Returns rather than raises.

    The caller answers 204 either way: a player whose beats are being dropped must not be able to
    tell, and more to the point must not get an error their game then has to decide what to do
    with. Keyed on the anonymous id rather than the caller's address, because a classroom or a
    household behind one address is several real players and throttling them together would make
    the numbers wrong in the one place they are supposed to be right."""
    return hit(f"beat:{anon_id}", BEAT_PER_ANON, BEAT_WINDOW_SECONDS)


# The dashboard takes a password over HTTP Basic, which makes it the one place in this server
# where a stranger can guess at one without going through /auth/login. Ten tries an hour per
# caller: enough that a mistyped password twice is never noticed, few enough that a dictionary is
# not a strategy. Per address only — there is one admin account, so a per-account window would be
# a window anybody could close on the one person who needs in.
ADMIN_PER_CALLER = int(os.environ.get("ADMIN_RATE_LIMIT", "10"))
# And a ceiling no forged header can step around. Generous next to one person signing in once or
# twice a day, and a hard stop on anybody grinding at it from a thousand addresses.
ADMIN_GLOBAL = int(os.environ.get("ADMIN_RATE_LIMIT_ALL", "60"))
ADMIN_WINDOW_SECONDS = float(os.environ.get("ADMIN_RATE_WINDOW", "3600"))


ENTRY = "Too many tries. Give it a few minutes, or sign in through the game instead."


def guard_admin(request: Request | None) -> None:
    """A ceiling on password attempts against the dashboard. Raises 429 when it is full.

    TWO BUCKETS, for the reason guard_reset has two: caller_key reads the left-most
    X-Forwarded-For entry, which the caller supplies and can therefore rotate. A per-caller window
    alone is a window somebody bypasses by changing a header, and behind it is bcrypt — slow, but
    five guesses a second a core is not a wall.

    So there is a second, GLOBAL ceiling on Basic attempts, which no header can get around. The
    reason that is safe here and would not be on /auth/login is that **it cannot lock the real
    admin out**: this guard runs only on the Basic path, and the Bearer path is untouched. Sign in
    to the game as normal and read the dashboard with that token, and a flood of guesses by a
    stranger is somebody else's problem rather than yours. The 429 says so."""
    over = hit(f"admin:ip:{caller_key(request)}", ADMIN_PER_CALLER, ADMIN_WINDOW_SECONDS)
    # Counted second and not short-circuited, so tripping one window is not a free pass on the
    # other — the same reasoning, and the same comment, as guard_reset.
    over = hit("admin:all", ADMIN_GLOBAL, ADMIN_WINDOW_SECONDS) or over
    if over:
        raise HTTPException(status.HTTP_429_TOO_MANY_REQUESTS, ENTRY)


def forget_everything() -> None:
    """Empty every bucket. For tests, which would otherwise poison each other."""
    _hits.clear()
