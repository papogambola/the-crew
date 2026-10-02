"""Where the browser checks in. One endpoint, no account, nothing to read back.

WHY THIS IS NOT BEHIND A TOKEN, which is the decision in this file worth arguing with. The game is
bought before it is played, so very nearly every browser calling this IS signed in and could send
its token. Three reasons it does not:

  it would make the row identifiable.  A token names an account. Once this handler can see which
      account a beat belongs to, the only thing stopping the row from carrying it is somebody's
      restraint, and restraint is not a privacy guarantee. The anonymous id is the whole design.
  it would break mid-sitting.  A token has sixty days on it and expires whenever it expires,
      including at nine in the evening in the middle of an hour of play. Analytics that stop when
      a session expires are analytics with a hole in exactly the longest sittings.
  it cannot refuse anybody anything.  There is nothing here to steal and nothing to read. The
      worst case is junk rows, which is what the clamping and the rate limit are for.

WHAT STOPS A STRANGER FILLING THE TABLE. A hard ceiling on the body size, a shape check on both
ids before anything touches the database, and a rate limit per anonymous id — one row per sitting,
and a sitting can only check in so often. Somebody determined can still write rows; they would be
writing rows about nobody, into a table with no join to anything, to make a number on a page only
one person looks at. That is the whole prize, and it is not worth hardening further at the cost of
the three things above.

THE ANSWER IS ALWAYS 204. Not the session, not a count, not an error anybody can learn from. The
game does not read it and must never wait on it."""
from __future__ import annotations

import json
import re

from fastapi import APIRouter, Depends, Request, Response, status
from sqlalchemy.orm import Session

from app.analytics import record_beat, record_events
from app.database import get_db
from app.rate_limit import guard_beat

router = APIRouter(prefix="/play", tags=["play"])

# 32 hex characters, which is what the browser generates. A shape check rather than a UUID parse
# because it is the cheapest possible way to throw away everything that is not our own client,
# before a stranger's string gets near a query or an index.
ID = re.compile(r"^[0-9a-f]{32}$")

# A bare beat is about 120 bytes; one carrying a full batch of forty events is about six
# kilobytes. Eight is room for that and refuses anything meant to be a problem — checked BEFORE
# parsing, because json.loads on an unbounded body is the whole attack.
MAX_BODY = 8192


@router.post("/beat", status_code=status.HTTP_204_NO_CONTENT)
async def beat(request: Request, db: Session = Depends(get_db)) -> Response:
    """A checkpoint: this sitting, this much play, still here (or not).

    THE BODY IS READ RAW RATHER THAN THROUGH A PYDANTIC MODEL, and that is not laziness. The last
    beat of a sitting is sent with `navigator.sendBeacon` while the page is being torn down, and a
    beacon can only use a content type that does not trigger a CORS preflight — there is no time
    for a preflight during unload, so one would simply never arrive. That means `text/plain`
    carrying JSON. A declared `application/json` body would reject exactly the beat that records
    how a session ended, which is the one this whole file exists to catch.

    It also means every ordinary beat avoids an OPTIONS round-trip, which is the difference
    between two requests every thirty seconds and one.

    NOTHING HERE RAISES. A malformed body, a stranger's probe, a half-written beacon: 204, and the
    row is not written. An error code would tell a prober what shape to send next, and the client
    would not read it anyway."""
    raw = await request.body()
    if len(raw) > MAX_BODY:
        return Response(status_code=status.HTTP_204_NO_CONTENT)
    try:
        body = json.loads(raw or b"{}")
        anon = str(body.get("anon") or "")
        sid = str(body.get("session") or "")
        active_ms = int(body.get("active_ms") or 0)
        ended = bool(body.get("ended"))
        # Game events ride along with the heartbeat rather than having an endpoint of their own.
        # The browser queues them and empties the queue on the next beat, so opening a posting
        # costs nothing at the moment it happens and a sitting makes two requests a minute
        # whatever the player is doing. One request also means one place to be refused, one body
        # size to bound, and one clock to stamp everything with.
        events = body.get("events")
    except (ValueError, TypeError, AttributeError):
        return Response(status_code=status.HTTP_204_NO_CONTENT)

    if not ID.match(anon) or not ID.match(sid):
        return Response(status_code=status.HTTP_204_NO_CONTENT)
    if guard_beat(anon):
        return Response(status_code=status.HTTP_204_NO_CONTENT)

    s = record_beat(db, anon_id=anon, session_id=sid, claimed_ms=active_ms, ended=ended)
    if events:
        record_events(db, s, events)
    db.commit()
    return Response(status_code=status.HTTP_204_NO_CONTENT)
