"""Paying once, and having it follow you.

The weight of this file is on the WEBHOOK, because it is the only thing in the service that opens
a door and the only one a stranger can post at. Everything else needs a bearer token; this needs a
signature, and if that signature is not checked properly then the endpoint is a button on the
internet that says "give me the game".

Nothing here reaches Stripe. The checkout call is theirs to answer, and a test that needs their
API to be up is a test that fails for reasons that have nothing to do with the code. What is
tested is everything on this side of that call: who a session is tied to, what a signature must
look like to be believed, and what happens when the same event arrives twice — which it will,
because Stripe delivers at least once and in practice more.
"""
import hashlib
import hmac
import json
import time
import uuid

import pytest
from sqlalchemy import select

from app.config import settings
from app.database import SessionLocal
from app.models import Licence, Player

SECRET = "whsec_test_not_a_real_secret_but_long_enough"


@pytest.fixture
def shop(monkeypatch):
    """A configured shop, without a Stripe account behind it."""
    monkeypatch.setattr(settings, "stripe_secret", "sk_test_x", raising=False)
    monkeypatch.setattr(settings, "stripe_webhook_secret", SECRET, raising=False)
    monkeypatch.setattr(settings, "stripe_price", "price_test", raising=False)
    return True


def _player_id(email: str) -> int:
    with SessionLocal() as db:
        return db.scalar(select(Player).where(Player.email == email)).id


def _event(player_id, session_id=None, paid=True, kind="checkout.session.completed", amount=1200):
    return {
        "type": kind,
        "data": {"object": {
            "id": session_id or ("cs_test_" + uuid.uuid4().hex),
            "payment_status": "paid" if paid else "unpaid",
            "payment_intent": "pi_test_" + uuid.uuid4().hex,
            "client_reference_id": str(player_id),
            "amount_total": amount,
            "currency": "usd",
            "customer_details": {"name": "A Buyer", "email": "buyer@example.com"},
        }},
    }


def _sign(body: bytes, secret=SECRET, ts=None):
    ts = str(int(ts if ts is not None else time.time()))
    sig = hmac.new(secret.encode(), ts.encode() + b"." + body, hashlib.sha256).hexdigest()
    return "t=%s,v1=%s" % (ts, sig)


def _post(client, event, **kw):
    body = json.dumps(event).encode()
    return client.post("/licence/stripe-hook", content=body,
                       headers={"Stripe-Signature": _sign(body, **kw)})


# ---------------------------------------------------------------- the state

def test_an_account_starts_unpaid(client, signed_up):
    assert client.get("/licence", headers=signed_up["h"]).json()["paid"] is False


def test_the_game_is_told_whether_there_is_any_way_to_pay(client, signed_up):
    """A wall with no way through is worse than no wall, so the game asks rather than assuming."""
    assert client.get("/licence", headers=signed_up["h"]).json()["shop_open"] is False


def test_the_shop_needs_all_three_settings(monkeypatch):
    """Half-configured is shut. A secret with no price lets Buy be pressed and then fails at
    Stripe, which is being shut except that it wastes the moment somebody decided to pay."""
    monkeypatch.setattr(settings, "stripe_secret", "sk_test_x", raising=False)
    monkeypatch.setattr(settings, "stripe_webhook_secret", "", raising=False)
    monkeypatch.setattr(settings, "stripe_price", "price_test", raising=False)
    assert settings.shop_open is False


def test_checkout_is_refused_while_the_shop_is_shut(client, signed_up):
    assert client.post("/licence/checkout", headers=signed_up["h"]).status_code == 503


def test_checkout_needs_an_account(client):
    """There is nowhere for an anonymous order to land: the licence hangs off a player id."""
    assert client.post("/licence/checkout").status_code in (401, 403)


# ------------------------------------------------------------- the webhook

def test_an_unsigned_webhook_is_refused(client, shop):
    r = client.post("/licence/stripe-hook", content=b'{"type":"checkout.session.completed"}')
    assert r.status_code == 400


def test_a_webhook_signed_with_the_wrong_secret_is_refused(client, signed_up, shop):
    pid = _player_id(signed_up["email"])
    r = _post(client, _event(pid), secret="whsec_somebody_elses_secret")
    assert r.status_code == 400
    assert client.get("/licence", headers=signed_up["h"]).json()["paid"] is False


def test_a_tampered_body_is_refused(client, signed_up, shop):
    """The signature covers the body. Sign one event, post another — which is exactly what an
    attacker who sniffed one real webhook would try."""
    pid = _player_id(signed_up["email"])
    honest = json.dumps(_event(pid, amount=1200)).encode()
    header = _sign(honest)
    forged = json.dumps(_event(pid, amount=1)).encode()
    r = client.post("/licence/stripe-hook", content=forged, headers={"Stripe-Signature": header})
    assert r.status_code == 400
    assert client.get("/licence", headers=signed_up["h"]).json()["paid"] is False


def test_an_old_signature_is_refused(client, signed_up, shop):
    """Without this a signature captured once is good for ever."""
    pid = _player_id(signed_up["email"])
    r = _post(client, _event(pid), ts=time.time() - 3600)
    assert r.status_code == 400
    assert client.get("/licence", headers=signed_up["h"]).json()["paid"] is False


def test_a_signed_paid_session_opens_the_account(client, signed_up, shop):
    pid = _player_id(signed_up["email"])
    assert _post(client, _event(pid)).status_code == 200
    body = client.get("/licence", headers=signed_up["h"]).json()
    assert body["paid"] is True
    assert body["price"] == 1200 and body["currency"] == "USD"


def test_what_the_receipt_keeps(client, signed_up, shop):
    """Enough to answer a support question without logging in to Stripe."""
    pid = _player_id(signed_up["email"])
    ev = _event(pid)
    _post(client, ev)
    with SessionLocal() as db:
        lic = db.scalar(select(Licence).where(Licence.player_id == pid))
    assert lic.key == ev["data"]["object"]["id"]
    assert lic.payment_intent == ev["data"]["object"]["payment_intent"]
    assert lic.email == "buyer@example.com" and lic.name == "A Buyer"


def test_an_unpaid_session_opens_nothing(client, signed_up, shop):
    """A session can complete without being paid — an async method still clearing, a zero total.
    Acting on 'completed' alone hands the game to anyone who can reach that state."""
    pid = _player_id(signed_up["email"])
    assert _post(client, _event(pid, paid=False)).status_code == 200
    assert client.get("/licence", headers=signed_up["h"]).json()["paid"] is False


def test_another_kind_of_event_is_ignored_politely(client, signed_up, shop):
    """200, not 500. Stripe retries anything that is not 2xx for days, and a hook that fails on
    events it does not care about buries the one that matters in a queue of noise."""
    pid = _player_id(signed_up["email"])
    r = _post(client, _event(pid, kind="payment_intent.created"))
    assert r.status_code == 200
    assert client.get("/licence", headers=signed_up["h"]).json()["paid"] is False


def test_the_same_event_twice_is_one_licence(client, signed_up, shop):
    """Stripe delivers at least once, which means twice more often than anybody expects."""
    pid = _player_id(signed_up["email"])
    ev = _event(pid)
    assert _post(client, ev).status_code == 200
    assert _post(client, ev).status_code == 200
    with SessionLocal() as db:
        n = len(db.scalars(select(Licence).where(Licence.player_id == pid)).all())
    assert n == 1


def test_an_order_for_a_player_who_does_not_exist_is_dropped(client, shop):
    """Not retried: the account is gone, or the session was not made by us. Nothing here will ever
    succeed, so say so and leave it in Stripe's log rather than in a retry queue."""
    r = _post(client, _event(999999))
    assert r.status_code == 200
    assert r.json().get("no_such_player") == "999999"


def test_one_order_opens_one_account(client, signed_up, shop):
    """The unique index on the session id is the backstop. Somebody replaying a friend's webhook
    onto their own account cannot, because the id is already spent."""
    a = _player_id(signed_up["email"])
    mail = "second-%s@example.com" % uuid.uuid4().hex[:10]
    r = client.post("/auth/signup", json={"email": mail, "password": "a long enough password"})
    other = {"email": mail, "h": {"Authorization": "Bearer " + r.json()["token"]}}
    b = _player_id(other["email"])
    ev = _event(a)
    _post(client, ev)
    ev_b = json.loads(json.dumps(ev))
    ev_b["data"]["object"]["client_reference_id"] = str(b)
    _post(client, ev_b)
    assert client.get("/licence", headers=other["h"]).json()["paid"] is False


# ------------------------------------------------- what being paid is worth

def test_paying_is_the_only_thing_that_opens_the_door(client, signed_up, shop):
    """There is no free run to end any more: the account is shut from the moment it exists, and a
    signed webhook is the one event in the whole service that changes that."""
    assert client.get("/licence", headers=signed_up["h"]).json()["over"] is True
    _post(client, _event(_player_id(signed_up["email"])))
    body = client.get("/licence", headers=signed_up["h"]).json()
    assert body["over"] is False and body["paid"] is True


def test_the_api_version_is_new_enough_for_a_managed_payments_account():
    """The one that stopped the first real sale.

    Stripe's merchant-of-record product — Managed Payments, which is the whole reason for choosing
    Stripe over taking the money directly, because it carries the sales tax — cannot open a
    Checkout Session on a 2024 API at all. The pin was 2024-06-20 and every live checkout came back
    400: "Managed Payments is not supported on API version 2024-06-20 ... set the API Version of
    this request to 2025-03-31.basil or greater."

    So this is a floor, and it is Stripe's floor rather than ours. Anybody tempted to pin further
    back to make something else work has to read this first."""
    from app.routers.licence import STRIPE_VERSION
    assert STRIPE_VERSION >= "2025-03-31", STRIPE_VERSION


def test_every_call_to_stripe_carries_that_version(monkeypatch):
    """Pinned in one place and sent on the wire — the version being right in a constant and absent
    from the request is the same outage with a longer search."""
    import urllib.request

    from app.routers import licence as lic
    seen = {}

    class _Resp:
        def read(self): return b'{"url":"https://checkout.example/x","id":"cs_x"}'
        def __enter__(self): return self
        def __exit__(self, *a): return False

    def fake_open(req, timeout=None):
        seen["v"] = req.headers.get("Stripe-version") or req.headers.get("Stripe-Version")
        return _Resp()
    monkeypatch.setattr(urllib.request, "urlopen", fake_open)
    monkeypatch.setattr(lic.settings, "stripe_secret", "sk_test_x", raising=False)
    lic._stripe("checkout/sessions", {"mode": "payment"})
    assert seen["v"] == lic.STRIPE_VERSION


# --------------------------------------------- when the till itself is broken

def _http_error(code, payload):
    import io
    import urllib.error
    return urllib.error.HTTPError("https://api.stripe.com/v1/checkout/sessions", code, "err", {},
                                  io.BytesIO(json.dumps(payload).encode()))


def test_a_refused_checkout_says_which_fault_it_was(client, signed_up, shop, monkeypatch):
    """The one that cost an afternoon. A live checkout refused and all anybody had was a 502 and a
    sentence written for a player — the fault could not be told from outside the service at all.

    So Stripe's own error CODE comes back on the end of it. Not their message, which can carry a
    price, a customer or a masked key: the code, which is a short machine string naming the fault
    and nothing else."""
    from app.routers import licence as lic

    def boom(path, fields):
        raise _http_error(400, {"error": {"type": "invalid_request_error",
                                          "code": "resource_missing",
                                          "message": "No such price: 'price_wrong'"}})
    monkeypatch.setattr(lic, "_stripe", boom)
    r = client.post("/licence/checkout", headers=signed_up["h"])
    assert r.status_code == 502
    assert "[400 resource_missing]" in r.json()["detail"], r.json()["detail"]
    assert "price_wrong" not in r.json()["detail"], "their message can name a price; the code cannot"
    assert "Nothing was charged" in r.json()["detail"], "the half that matters is still first"


def test_a_key_that_is_refused_says_so_by_its_status(client, signed_up, shop, monkeypatch):
    """Stripe answers 401 for a key it does not know and 403 for one that is real and not allowed
    to do this. Neither carries a code, and the type on both is the generic invalid_request_error
    — so without the status the answer is "something was wrong with the request", which is not an
    answer. This is the exact shape that fired the first time a live checkout refused."""
    from app.routers import licence as lic

    def boom(path, fields):
        raise _http_error(403, {"error": {"type": "invalid_request_error",
                                          "message": "The provided key does not have the required permissions."}})
    monkeypatch.setattr(lic, "_stripe", boom)
    d = client.post("/licence/checkout", headers=signed_up["h"]).json()["detail"]
    assert "[403 invalid_request_error]" in d, d
    assert "permissions" not in d, "their message is for the log; the status and the type are for here"


def test_the_field_stripe_objected_to_is_named(client, signed_up, shop, monkeypatch):
    from app.routers import licence as lic

    def boom(path, fields):
        raise _http_error(400, {"error": {"type": "invalid_request_error",
                                          "param": "line_items[0][price]"}})
    monkeypatch.setattr(lic, "_stripe", boom)
    d = client.post("/licence/checkout", headers=signed_up["h"]).json()["detail"]
    assert "param=line_items[0][price]" in d, d


def test_stripes_own_bad_weather_is_not_reported_as_a_fault_here(client, signed_up, shop, monkeypatch):
    """A 5xx from Stripe is not something anybody can configure their way out of, and a player
    told `api_error` about it has been handed a word instead of an answer."""
    from app.routers import licence as lic

    def boom(path, fields):
        raise _http_error(503, {"error": {"type": "api_error", "code": "lock_timeout"}})
    monkeypatch.setattr(lic, "_stripe", boom)
    r = client.post("/licence/checkout", headers=signed_up["h"])
    assert r.status_code == 502
    assert "[" not in r.json()["detail"]


def test_a_till_that_cannot_be_reached_at_all_still_says_nothing_was_charged(client, signed_up, shop, monkeypatch):
    from app.routers import licence as lic

    def boom(path, fields):
        raise OSError("no route to host")
    monkeypatch.setattr(lic, "_stripe", boom)
    r = client.post("/licence/checkout", headers=signed_up["h"])
    assert r.status_code == 502 and "Nothing was charged" in r.json()["detail"]


def test_buying_twice_is_answered_rather_than_charged(client, signed_up, shop):
    _post(client, _event(_player_id(signed_up["email"])))
    r = client.post("/licence/checkout", headers=signed_up["h"])
    assert r.status_code == 200 and r.json()["already"] is True and r.json()["url"] is None
