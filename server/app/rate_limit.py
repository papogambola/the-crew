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


def forget_everything() -> None:
    """Empty every bucket. For tests, which would otherwise poison each other."""
    _hits.clear()
