"""A code you can hand to somebody, and what it is worth when they type it in.

THERE IS NO KEY — except this one, and the exception is worth stating carefully, because build 135
took a key out of this game on purpose and nothing here is a way back to it.

A LICENCE KEY is what somebody who has paid has to find in an email, retype without a typo, and
write in about when it does not work. That is gone and is not coming back: paying opens the account
you paid from, and nothing is emailed but the receipt.

AN INVITE CODE is the opposite problem. It goes to somebody who has NOT paid and never will — a
reviewer, somebody with an audience — and it has to travel the only way that reaches them: in a
message, out of band, before they have an account or any reason to make one. There is nothing for
the server to attach it to until they turn up. So it is a string, and the string is the whole of it.

WHAT MAKES IT SAFE IS THAT IT CARRIES NOTHING AND PROVES ONE THING.

  - It is SIGNED. The bytes say how many days it is worth and after when it stops being
    redeemable, and a truncated HMAC over them says the server wrote it. The client cannot mint
    one, cannot lengthen one, and cannot turn a seven-day code into a seven-year one, because the
    days are inside the signature.
  - It is SPENT ONCE. Not by anything in here: redemption writes an ordinary licence row with the
    code as its `key`, and `key` is unique. The same backstop that stops a Stripe session opening
    two accounts stops a code doing it, and it is the database that enforces it rather than a check
    somebody can forget to write.
  - It EXPIRES TWICE. Once as a code — a code not redeemed within its window is dead, so a batch
    handed out in September is not still live next year — and once as access, counted in real days
    from the moment it is redeemed rather than from the moment it was written. Somebody who opens it
    three weeks later still gets their whole week.

WHAT IT DOES NOT CARRY: no name, no email, no player id, nothing about who it was for. A code is
not a record. Who got which one is a note in whatever Paz keeps notes in, and the row written at
redemption says which account spent it.

The alphabet is Crockford's base32 — no I, L, O or U, so there is no O/0 or I/1 to mistype, and no
accidental words. Sixteen characters in four groups, which is what fits in a message without
wrapping.
"""
import hashlib
import hmac
import os
import secrets
from datetime import date, datetime, timedelta, timezone

# No I, L, O, U. Thirty-two symbols, none of which can be confused for another down a phone line.
ALPHABET = "0123456789ABCDEFGHJKMNPQRSTVWXYZ"
PREFIX = "CREW"
# Days are counted from here so two bytes reach far enough to be irrelevant and no further.
EPOCH = date(2026, 1, 1)
MAC_BYTES = 5          # forty bits, against an attacker who must spend an API call per guess
BODY_BYTES = 5         # days (1) · dead-after (2) · serial (2)
CODE_CHARS = 16        # (BODY + MAC) * 8 / 5, rounded up


class BadCode(ValueError):
    """The code is not one of ours, or is not one any more. Never says which."""


def _b32(raw: bytes) -> str:
    n = int.from_bytes(raw, "big")
    out = []
    for _ in range(CODE_CHARS):
        out.append(ALPHABET[n & 31])
        n >>= 5
    return "".join(reversed(out))


def _unb32(s: str) -> bytes:
    n = 0
    for ch in s:
        i = ALPHABET.find(ch)
        if i < 0:
            raise BadCode("not a code")
        n = (n << 5) | i
    return n.to_bytes((CODE_CHARS * 5 + 7) // 8, "big")[-(BODY_BYTES + MAC_BYTES):]


def _mac(secret: str, body: bytes) -> bytes:
    return hmac.new(secret.encode(), b"thecrew-invite-v1" + body, hashlib.sha256).digest()[:MAC_BYTES]


def normalise(code: str) -> str:
    """What somebody typed, as the thing we look up.

    People retype these off a screen, so the spacing and the case are theirs and the dashes are
    decoration. O and I are not in the alphabet at all, which means somebody who typed one meant
    the digit — so those are the two substitutions worth making, and the only two."""
    s = "".join(str(code or "").split()).upper().replace("-", "")
    if s.startswith(PREFIX):
        s = s[len(PREFIX):]
    return s.replace("O", "0").replace("I", "1").replace("L", "1").replace("U", "V")


def mint(secret: str, days: int = 7, live_days: int = 90) -> str:
    """One code. `days` is what it is worth once redeemed; `live_days` is how long it may sit
    unredeemed before it is dead."""
    if not secret:
        raise BadCode("no invite secret")
    days = max(1, min(255, int(days)))
    dead = (date.today() - EPOCH).days + max(1, int(live_days))
    body = bytes([days]) + dead.to_bytes(2, "big") + secrets.token_bytes(2)
    return PREFIX + "-" + "-".join(_b32(body + _mac(secret, body))[i:i + 4] for i in range(0, CODE_CHARS, 4))


def read(secret: str, code: str) -> dict:
    """Is this ours, and is it still alive? Returns what it is worth, or raises.

    The signature is checked before the date, and both raise the same thing: a code that is real
    but out of date and a code somebody invented should not be distinguishable by how long the
    answer takes or by what it says, because the second one is somebody trying codes."""
    if not secret:
        raise BadCode("no invite secret")
    s = normalise(code)
    if len(s) != CODE_CHARS:
        raise BadCode("not a code")
    raw = _unb32(s)
    body, mac = raw[:BODY_BYTES], raw[BODY_BYTES:]
    if not hmac.compare_digest(mac, _mac(secret, body)):
        raise BadCode("not a code")
    dead = EPOCH + timedelta(days=int.from_bytes(body[1:3], "big"))
    if date.today() > dead:
        raise BadCode("not a code")
    return {"days": body[0], "dead_after": dead.isoformat(), "key": PREFIX + "-" + s}


def expiry(days: int) -> datetime:
    """When access bought with a code runs out. From NOW, not from when the code was written —
    somebody who opens the message three weeks later gets the whole week they were promised."""
    return datetime.now(timezone.utc) + timedelta(days=int(days))
