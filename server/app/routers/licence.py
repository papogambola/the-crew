"""Paying, once, for good — and having it follow you.

THREE SHAPES, AND WHY THIS IS THE THIRD.

The first: the player pasted a Lemon Squeezy key and the BROWSER validated it, keeping the answer
in localStorage. Two things wrong. The answer lived in one browser, so a person who paid on a
laptop was unpaid on a desktop and had to go and find the receipt again. And the answer was a
value in localStorage, which is to say it was whatever the player typed into the console.

The second: the same key, but activated here, with the answer a row against the account. Better,
and it is what this replaces. Its problem was never security — it was the key. A key is a thing to
copy out of an email, mistype, lose, and write in about, and every one of those is a person who
paid and cannot play.

The third, this one: THERE IS NO KEY. The player presses Buy while signed in, Stripe takes the
money, Stripe tells us, and the row appears. They come back to a game that is already open.

    POST /licence/checkout   signed in, creates a Stripe Checkout Session carrying the player id
    POST /licence/stripe-hook  Stripe, signed, writes the row
    GET  /licence            what the game asks

NOTHING HERE NAMES A PAYMENT METHOD, deliberately: naming one excludes the rest. Stripe Checkout
offers whatever the dashboard has enabled and the buyer is eligible for, and which methods those
are is Stripe's answer for that buyer on that day rather than a thing this file decides.

Written expecting PayPal to be among them, and it is not — Stripe's PayPal reaches accounts in
thirty European countries and this account is not in one. The policy is unchanged and the promise
is: the game now says the price and stops, because a list of methods written into a page is a
promise about somebody else's product.

WHAT THE CLIENT IS TRUSTED WITH: nothing. It asks for a checkout and is told where to go. It
cannot say which price, cannot say which account, and cannot say that it paid. The player id goes
into the session server-side from the bearer token, so the only account a checkout can ever open
is the one that asked for it.
"""
import hashlib
import hmac
import json
import logging
import time
import urllib.error
import urllib.parse
import urllib.request
from datetime import date, datetime, timedelta, timezone

from fastapi import APIRouter, Depends, Header, HTTPException, Request, status
from pydantic import BaseModel, Field
from sqlalchemy import select
from sqlalchemy.exc import IntegrityError
from sqlalchemy.orm import Session

from app import invites
from app.config import settings
from app.database import get_db
from app.deps import current_admin, current_player
from app.entitlement import live_licence, state, utc
from app.models import Licence, Player

router = APIRouter(prefix="/licence", tags=["licence"])
log = logging.getLogger("thecrew.licence")

# How far out of step with Stripe's clock a webhook may be and still be believed. Five minutes is
# Stripe's own default. It is what stops a signature captured once from being replayed for ever.
WEBHOOK_TOLERANCE = 300

# What a player is told when the till cannot be opened. One sentence, in two places, and the
# important half of it is "nothing was charged" — somebody who has just pressed Buy needs to know
# that before they need to know anything else.
TILL_DOWN = "The till did not answer. Nothing was charged — try again in a minute."

# What a code that will not open anything is told, whatever is wrong with it. One sentence for
# invented, altered, out of date and already spent alike: the difference between those is of use
# to nobody except somebody working through codes one at a time.
NO_CODE = "That code is not open. Check it against the message it came in."

# The API version every call to Stripe is made on. See the header block in _stripe() for why it
# cannot go below this one.
STRIPE_VERSION = "2025-03-31.basil"


def _stripe(path: str, fields: dict) -> dict:
    """One call to Stripe, over urllib.

    No client library, for the reason the Lemon Squeezy call had none: this is one endpoint in the
    whole service, and a dependency that has to be kept up to date is a dependency that stops the
    app booting one morning for a reason nobody remembers. The two things a library would give —
    retries and typed errors — are not wanted here either. A failed checkout should fail loudly
    and immediately, because somebody is standing in front of it with a card out.

    Nested keys go as Stripe's bracket form: line_items[0][price]."""
    body = urllib.parse.urlencode(fields).encode()
    req = urllib.request.Request(
        settings.stripe_api + path, data=body,
        headers={
            "Authorization": "Bearer " + settings.stripe_secret,
            "Content-Type": "application/x-www-form-urlencoded",
            # Stripe versions its API by account, and an account's default version moves when
            # Stripe upgrades it. Pinning means a change to their API is a change we choose.
            #
            # WHY THIS VERSION AND NOT AN OLDER ONE. It was 2024-06-20, and the first live checkout
            # was refused with: "Managed Payments is not supported on API version 2024-06-20.
            # Update your API version, or set the API Version of this request to 2025-03-31.basil
            # or greater." Managed Payments is Stripe's merchant-of-record product — it is the
            # thing that carries the sales tax, which is the reason Stripe was chosen over doing
            # this directly — and an account on it cannot open a Checkout Session on a 2024 API at
            # all. So the floor is theirs, not ours, and this is the version they named.
            #
            # It moves only the call BELOW it. The webhook's payload shape is set by the version on
            # the endpoint in Stripe's dashboard, not by this header, so nothing about how a
            # receipt is read changes with it.
            "Stripe-Version": STRIPE_VERSION,
        },
    )
    with urllib.request.urlopen(req, timeout=15) as r:
        return json.loads(r.read().decode("utf-8"))


@router.get("")
def read(p: Player = Depends(current_player), db: Session = Depends(get_db)):
    """Everything the game needs to decide what to show, in one answer.

    `shop_open` is here rather than in the game because whether there is a way to pay is a fact
    about the server's configuration, and a copy of it in play.html is a copy that goes stale. The
    game gates nobody while it is false."""
    lic = live_licence(db, p.id)
    return {**state(db, p.id),
            "shop_open": settings.shop_open,
            "invites_open": settings.invites_open,
            "kind": (lic.kind if lic else None),
            "price": (lic.amount if lic else None),
            "currency": (lic.currency if lic else None),
            "bought_at": (lic.activated_at.isoformat() if lic else None)}


@router.post("/checkout")
def checkout(p: Player = Depends(current_player), db: Session = Depends(get_db)):
    """Somewhere to pay, tied to this account before the player ever sees it."""
    if not settings.shop_open:
        raise HTTPException(status.HTTP_503_SERVICE_UNAVAILABLE, "The shop is not open yet.")
    if state(db, p.id)["paid"]:
        # Not an error worth a scary code: they are paid, they pressed Buy again, tell them so.
        return {"already": True, "url": None}

    try:
        sess = _stripe("checkout/sessions", {
            "mode": "payment",
            "line_items[0][price]": settings.stripe_price,
            "line_items[0][quantity]": "1",
            # THE ONE THAT MATTERS. This comes back on the webhook and is the only thing that says
            # which account an order belongs to. It is taken from the bearer token, never from the
            # request body, so nobody can buy the game onto somebody else's account.
            "client_reference_id": str(p.id),
            "metadata[player_id]": str(p.id),
            # Prefilled so the receipt and the account agree by default. The player can change it
            # at Stripe, and that is fine — the account is decided above, not by this.
            "customer_email": p.email,
            "success_url": settings.site_url + "/play.html?paid=1",
            "cancel_url": settings.site_url + "/play.html?paid=0",
            # No payment_method_types. Stripe shows what the dashboard has enabled and the buyer
            # can use; naming any of them here would quietly turn the rest off.
        })
    except urllib.error.HTTPError as e:
        # WHAT STRIPE SAID, WHICH IS THE WHOLE OF WHAT IS WRONG.
        #
        # This used to say, in a comment, that their body "is worth having in the log" — and then
        # drop it on the floor. So the first time a live checkout refused, all anybody had was a
        # 502 and a sentence written for a player, and the fault — a key, a price, the wrong mode
        # — could not be told from the outside at all.
        #
        # Two things now. The message goes to the log in full, for whoever can read the service's
        # logs. And the SLUG — Stripe's own error.code, a short machine string like
        # `resource_missing` or `api_key_expired` — goes back in the response, because the person
        # who has to fix a misconfigured till is usually the person standing at it, and a slug
        # names the fault without putting a key, a customer or a price in front of a stranger.
        detail = TILL_DOWN
        try:
            body = json.loads(e.read().decode("utf-8")).get("error") or {}
        except Exception:
            body = {}
        log.error("checkout refused by Stripe (HTTP %s): %s / %s / %s",
                  e.code, body.get("type"), body.get("code"), body.get("message"))
        # Only a fault in what this service was configured with — a 5xx from Stripe is their
        # weather, and a player told "resource_missing" about it learns nothing.
        if 400 <= e.code < 500:
            # The status and the parameter go in beside the code, because between them they name
            # the fault on their own: Stripe answers 401 for a key it does not recognise and 403
            # for a key that is real and not allowed to do this, and `param` names the field it
            # objected to when it objected to a field at all. The first time this fired in
            # production the code was empty and the type was the generic `invalid_request_error`,
            # which said only "you asked for something wrong" — the status would have said which.
            bits = [str(e.code)]
            for k in ("code", "type"):
                if body.get(k):
                    bits.append(str(body[k])[:48])
                    break
            if body.get("param"):
                bits.append("param=" + str(body["param"])[:48])
            detail = TILL_DOWN + " [" + " ".join(bits) + "]"
        raise HTTPException(status.HTTP_502_BAD_GATEWAY, detail)
    except Exception as e:
        log.exception("checkout: could not reach Stripe: %s", e)
        raise HTTPException(status.HTTP_502_BAD_GATEWAY, TILL_DOWN)

    url = sess.get("url")
    if not url:
        raise HTTPException(status.HTTP_502_BAD_GATEWAY, "The till gave no way in. Nothing was charged.")
    return {"already": False, "url": url}


class Mint(BaseModel):
    count: int = Field(default=10, ge=1, le=100)
    days: int = Field(default=7, ge=1, le=90)


@router.post("/invites")
def write_invites(body: Mint, p: Player = Depends(current_admin)):
    """Press passes, written from inside the game.

    THERE IS A TOOL FOR THIS (tools/invite.py) AND IT IS NOT ENOUGH. It needs Python and a clone of
    the repository, and the person who gives away review copies has neither on the machine they are
    holding. A tool that cannot be run is not a way of doing something, and the consequence is not
    that passes get written some harder way — it is that they never get written.

    So: signed in as the one admin address, ask for ten, get ten. The secret stays in the server's
    environment and is never sent anywhere, which is strictly better than the tool, where it has to
    be on a laptop.

    WHAT KEEPS THIS FROM BEING A BUTTON THAT PRINTS MONEY: current_admin, which needs both the
    address in ADMIN_EMAIL and that account's password. Anybody else asking is told the endpoint
    does not exist — see deps.current_admin for why that is a 404 rather than a 403.

    Nothing is written to the database here. A code is a signature, so minting is arithmetic, and
    the row appears when somebody redeems one. That is also why there is no list of codes to show:
    what was written is not recorded anywhere, deliberately, and the note of who got which one is
    whatever the person handing them out keeps."""
    if not settings.invites_open:
        raise HTTPException(status.HTTP_503_SERVICE_UNAVAILABLE,
                            "No INVITE_SECRET is set on the server, so there is nothing to sign with.")
    codes = [invites.mint(settings.invite_secret, days=body.days) for _ in range(body.count)]
    log.info("admin %s wrote %d passes of %d days", p.email, body.count, body.days)
    return {"codes": codes, "days": body.days,
            "redeem_by": (date.today() + timedelta(days=90)).isoformat()}


@router.get("/invites")
def read_invites(p: Player = Depends(current_admin), db: Session = Depends(get_db)):
    """WHICH ONES WERE SPENT, AND WHAT CAME OF THEM.

    The half that was missing. Passes could be written and there was no way on earth to find out
    whether anybody had used one — the information was in the database the whole time, and a fact
    that can only be reached by opening a database console is a fact nobody has.

    THIS IS NOT A LIST OF CODES, and cannot be. Nothing records what was minted, by design, so the
    only passes that exist here are the ones somebody redeemed: a spend writes a row, and this reads
    the rows. A code that is never typed in leaves no trace anywhere, which is also the honest answer
    to "did they ignore it" — silence.

    `bought` is the point of the whole feature. A press pass exists to become a purchase, and a
    reviewer who paid afterwards is the only outcome that says the thing worked. It is a second
    licence on the same account that does not expire, so it is read here rather than inferred from
    a pass that happens to have ended.

    The code comes back because it is the only thing that ties a row to the person it was sent to.
    Nothing in a code says who had it; the note kept by whoever handed it out says, and this is what
    that note is matched against."""
    rows = db.scalars(
        select(Licence).where(Licence.kind == "pass")
        .order_by(Licence.activated_at.desc()).limit(200)
    ).all()
    if not rows:
        return {"passes": []}

    ids = {r.player_id for r in rows}
    who = {q.id: q.email for q in db.scalars(select(Player).where(Player.id.in_(ids))).all()}
    # Anything on these accounts that is not a pass and is still on: a purchase, and the one
    # outcome worth knowing about.
    bought = {r.player_id for r in db.scalars(
        select(Licence).where(Licence.player_id.in_(ids), Licence.kind != "pass",
                              Licence.active.is_(True)))}

    now = datetime.now(timezone.utc)
    out = []
    for r in rows:
        at = r.activated_at if r.activated_at.tzinfo else r.activated_at.replace(tzinfo=timezone.utc)
        until = r.expires_at
        if until is not None and until.tzinfo is None:
            until = until.replace(tzinfo=timezone.utc)
        out.append({
            "code": r.key,
            "email": who.get(r.player_id) or "an account that has since gone",
            "redeemed_at": utc(r.activated_at),
            "expires_at": utc(r.expires_at),
            # What it was worth, worked back out of the two dates rather than stored twice.
            "days": (round((until - at).total_seconds() / 86400) if until else None),
            "running": bool(r.active and until and until > now),
            "bought": r.player_id in bought,
        })
    return {"passes": out}


class Redeem(BaseModel):
    code: str = Field(min_length=1, max_length=64)


@router.post("/redeem")
def redeem(body: Redeem, p: Player = Depends(current_player), db: Session = Depends(get_db)):
    """A press pass, spent.

    WHAT THE CLIENT IS TRUSTED WITH HERE IS THE SAME AS EVERYWHERE ELSE: nothing. It sends the
    string somebody typed. It does not say how long the code is worth — that is inside the
    signature — and it does not say whose account, which comes off the bearer token. There is no
    request a player can make that opens their own door.

    ONE CODE, ONE ACCOUNT, AND THE DATABASE IS WHAT SAYS SO. The code becomes the licence's `key`,
    which is unique, so a second redemption loses the race rather than being caught by a check —
    including two arriving at the same instant, which a read-then-write could not have handled and
    which is exactly what happens when somebody double-clicks.

    ALREADY OPEN IS NOT AN ERROR. Somebody who has bought the game and then types a code they were
    also sent should not be told off, and should certainly not have a week's expiry written over a
    licence that does not expire: they are told they are already in, and the code stays unspent for
    whoever it was meant for.

    EVERY REFUSAL IS THE SAME REFUSAL. Invented, altered, out of date, or already spent all answer
    "that code is not open", because the difference between them is only useful to somebody trying
    codes one after another."""
    if not settings.invites_open:
        raise HTTPException(status.HTTP_503_SERVICE_UNAVAILABLE, NO_CODE)
    if live_licence(db, p.id) is not None:
        return {"already": True, "over": False}

    try:
        got = invites.read(settings.invite_secret, body.code)
    except invites.BadCode:
        log.info("invite refused for player %s", p.id)
        raise HTTPException(status.HTTP_400_BAD_REQUEST, NO_CODE)

    until = invites.expiry(got["days"])
    db.add(Licence(player_id=p.id, key=got["key"], kind="pass", active=True,
                   expires_at=until, checked_at=datetime.now(timezone.utc)))
    try:
        db.commit()
    except IntegrityError:
        # The unique index on `key`. Somebody has already spent this one — possibly this same
        # player a moment ago, on a second click, which is why the answer is the state rather than
        # a complaint.
        db.rollback()
        if live_licence(db, p.id) is not None:
            return {"already": True, "over": False}
        raise HTTPException(status.HTTP_400_BAD_REQUEST, NO_CODE)

    log.info("invite redeemed by player %s for %s days", p.id, got["days"])
    return {"already": False, "over": False, "days": got["days"],
            "pass_until": until.isoformat()}


def _verify(raw: bytes, header: str) -> dict:
    """Is this really Stripe, and is it recent?

    The header is `t=<unix>,v1=<hex>[,v1=<hex>...]`, and the signed payload is the timestamp, a
    dot, and the RAW body — raw, not re-serialised, because a single byte of different JSON
    formatting changes the digest and nothing would ever verify.

    Two checks, and both matter. Without the signature anyone who learns this URL can hand the
    game out for free by posting their own JSON at it. Without the timestamp a signature captured
    once is good for ever."""
    parts = dict(x.split("=", 1) for x in header.split(",") if "=" in x)
    ts = parts.get("t", "")
    if not ts.isdigit():
        raise HTTPException(status.HTTP_400_BAD_REQUEST, "unsigned")
    if abs(time.time() - int(ts)) > WEBHOOK_TOLERANCE:
        raise HTTPException(status.HTTP_400_BAD_REQUEST, "stale")

    want = hmac.new(settings.stripe_webhook_secret.encode(),
                    ts.encode() + b"." + raw, hashlib.sha256).hexdigest()
    # Every v1 in the header, because Stripe sends more than one while a secret is being rotated.
    got = [v for k, v in (x.split("=", 1) for x in header.split(",") if "=" in x) if k == "v1"]
    if not any(hmac.compare_digest(want, g) for g in got):
        raise HTTPException(status.HTTP_400_BAD_REQUEST, "bad signature")
    try:
        return json.loads(raw.decode("utf-8"))
    except Exception:
        raise HTTPException(status.HTTP_400_BAD_REQUEST, "bad body")


@router.post("/stripe-hook")
async def stripe_hook(request: Request,
                      stripe_signature: str = Header(default=""),
                      db: Session = Depends(get_db)):
    """Stripe saying somebody paid. The only thing in the service that opens a door.

    It answers 200 to almost everything on purpose. Stripe retries anything that is not a 2xx, for
    days, and a webhook that 500s on an event it simply does not care about turns into a queue of
    failures that hides the one that matters. So: a bad signature is a 400 and nothing else is."""
    if not settings.stripe_webhook_secret:
        raise HTTPException(status.HTTP_503_SERVICE_UNAVAILABLE, "no webhook secret")
    raw = await request.body()
    event = _verify(raw, stripe_signature)

    if event.get("type") != "checkout.session.completed":
        return {"ok": True, "ignored": event.get("type")}

    sess = (event.get("data") or {}).get("object") or {}
    # Paid, not merely completed. A session can complete unpaid — an async method still clearing,
    # a zero-total order — and handing the game over on "completed" alone would hand it to anyone
    # who could get a session to that state.
    if sess.get("payment_status") != "paid":
        return {"ok": True, "unpaid": sess.get("payment_status")}

    sid = str(sess.get("id") or "")
    if not sid:
        return {"ok": True, "no_session_id": True}

    # ALREADY DONE IS DONE. Stripe delivers at least once, which in practice means twice more often
    # than anybody expects, and the unique index on `key` is the backstop if two arrive at once.
    if db.scalar(select(Licence).where(Licence.key == sid)):
        return {"ok": True, "already": True}

    ref = sess.get("client_reference_id") or (sess.get("metadata") or {}).get("player_id")
    player = db.get(Player, int(ref)) if (ref and str(ref).isdigit()) else None
    if not player:
        # Do not retry this: the account is gone, or the session was made by something that is not
        # us. Either way nothing here will ever succeed, and saying so leaves it in Stripe's log to
        # be found rather than in a retry queue to be ignored.
        return {"ok": True, "no_such_player": str(ref)}

    details = sess.get("customer_details") or {}
    db.add(Licence(
        player_id=player.id,
        key=sid,
        payment_intent=str(sess.get("payment_intent") or "") or None,
        name=details.get("name") or None,
        email=details.get("email") or None,
        price_id=settings.stripe_price or None,
        amount=sess.get("amount_total"),
        currency=(sess.get("currency") or "").upper() or None,
        active=True,
        checked_at=datetime.now(timezone.utc),
    ))
    db.commit()
    return {"ok": True, "paid": True}
