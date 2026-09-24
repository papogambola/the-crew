"""Forgetting a password stops being permanent.

What these are actually watching for, in order of how much it would cost to get wrong:

1. **The reply cannot depend on whether the account exists.** The moment it does, this endpoint
   is a customer list anybody can download one address at a time.
2. **A link works once.** A reset link lives in an inbox forever; one that stays live is a
   permanent key to the account sitting in a place people forward from.
3. **A reset ends the sessions that came before it.** The person resetting is usually the person
   who thinks somebody else got in, and a token here lives sixty days with no row behind it to
   delete. Without this the lock changes and the stranger's key still turns.

The mail is not sent in these — no SMTP_HOST, no RESEND_API_KEY, so emailer logs and returns
False, which is exactly the path a laptop takes. The token is read out of the database instead of
the inbox, which is the only part of the flow a test can't do the way a person does.
"""
from datetime import datetime, timedelta, timezone

import pytest
from sqlalchemy import select

from app import rate_limit
from app.database import SessionLocal
from app.models import PasswordReset, Player
from app.security import hash_reset_token


@pytest.fixture(autouse=True)
def clean_limits():
    """Every test starts with a full allowance.

    Without this the fifth test to ask for a reset gets a 429 from the fourth one's attempts, and
    which test fails depends on the order they run in."""
    rate_limit.forget_everything()
    yield
    rate_limit.forget_everything()


def link_token(email):
    """The raw token is only ever in the email, so tests take the newest row and mint a known one.

    Not a shortcut around anything: the endpoint stores a SHA-256 of the token and nothing else,
    so there is no way to read the real one back out. Writing a hash we know the preimage of
    exercises exactly the same lookup path the real link does."""
    with SessionLocal() as db:
        p = db.scalar(select(Player).where(Player.email == email))
        row = db.scalars(select(PasswordReset)
                         .where(PasswordReset.player_id == p.id)
                         .order_by(PasswordReset.id.desc())).first()
        if row is None:
            return None
        # Unique per row, because token_hash is a unique index: a fixed string here means the
        # second test to call this collides with the first, and which test fails depends on the
        # order they ran in.
        known = f"known-token-for-a-test-{row.id}"
        row.token_hash = hash_reset_token(known)
        db.commit()
        return known


def test_unknown_address_gets_the_same_answer_as_a_real_one(client, signed_up):
    real = client.post("/auth/forgot", json={"email": signed_up["email"]})
    nobody = client.post("/auth/forgot", json={"email": "nobody-at-all@example.com"})
    assert real.status_code == nobody.status_code == 200
    # Byte for byte. A difference in wording is as good as a yes/no to somebody with a list.
    assert real.json() == nobody.json()


def test_no_row_is_written_for_an_address_with_no_account(client):
    client.post("/auth/forgot", json={"email": "still-nobody@example.com"})
    with SessionLocal() as db:
        assert db.scalar(select(Player).where(Player.email == "still-nobody@example.com")) is None


def test_the_link_sets_the_password_and_signs_them_in(client, signed_up):
    client.post("/auth/forgot", json={"email": signed_up["email"]})
    t = link_token(signed_up["email"])
    r = client.post("/auth/reset", json={"token": t, "password": "a whole new password"})
    assert r.status_code == 200, r.text
    assert r.json()["email"] == signed_up["email"]
    # The token it hands back is a working session, not a formality.
    me = client.get("/auth/me", headers={"Authorization": "Bearer " + r.json()["token"]})
    assert me.status_code == 200
    # And the new password is the one that works now.
    assert client.post("/auth/login", json={"email": signed_up["email"],
                                            "password": "a whole new password"}).status_code == 200
    assert client.post("/auth/login", json={"email": signed_up["email"],
                                            "password": "a long enough password"}).status_code == 401


def test_a_link_works_once(client, signed_up):
    client.post("/auth/forgot", json={"email": signed_up["email"]})
    t = link_token(signed_up["email"])
    assert client.post("/auth/reset", json={"token": t, "password": "first new password"}).status_code == 200
    again = client.post("/auth/reset", json={"token": t, "password": "second new password"})
    assert again.status_code == 400
    # And it really did not take: the second password is not the account's password.
    assert client.post("/auth/login", json={"email": signed_up["email"],
                                            "password": "second new password"}).status_code == 401


def test_an_expired_link_is_refused(client, signed_up):
    client.post("/auth/forgot", json={"email": signed_up["email"]})
    t = link_token(signed_up["email"])
    with SessionLocal() as db:
        row = db.scalar(select(PasswordReset).where(PasswordReset.token_hash == hash_reset_token(t)))
        row.expires_at = datetime.now(timezone.utc) - timedelta(minutes=1)
        db.commit()
    assert client.post("/auth/reset", json={"token": t, "password": "too late for this"}).status_code == 400


def test_an_invented_token_is_refused(client):
    r = client.post("/auth/reset", json={"token": "nothing-like-a-real-one", "password": "a fine password"})
    assert r.status_code == 400


def test_unknown_spent_and_expired_all_say_the_same_thing(client, signed_up):
    """Because naming which one it was tells somebody holding a guess whether they guessed."""
    client.post("/auth/forgot", json={"email": signed_up["email"]})
    t = link_token(signed_up["email"])
    client.post("/auth/reset", json={"token": t, "password": "a fresh long password"})
    spent = client.post("/auth/reset", json={"token": t, "password": "another long password"})
    unknown = client.post("/auth/reset", json={"token": "no-such-token", "password": "another long password"})
    assert spent.json()["detail"] == unknown.json()["detail"]


def test_a_short_password_is_refused_without_spending_the_link(client, signed_up):
    """One typo should not cost the only link in the inbox."""
    client.post("/auth/forgot", json={"email": signed_up["email"]})
    t = link_token(signed_up["email"])
    assert client.post("/auth/reset", json={"token": t, "password": "short"}).status_code == 400
    # Same token, a password that passes. It must still work.
    assert client.post("/auth/reset", json={"token": t,
                                            "password": "a long enough password now"}).status_code == 200


def stranger_token(email, signed_in_ago_seconds=3600):
    """A session from an hour ago, signed exactly the way /auth/login signs one.

    Minted here rather than by calling /auth/login because what is being tested is the age of a
    token relative to the reset, and a token this test signed in the same second as the reset
    proves nothing either way. An hour is the scenario the feature is for: somebody is already
    signed in, and the person who owns the account is trying to get them out."""
    import jwt
    from app.config import settings
    with SessionLocal() as db:
        p = db.scalar(select(Player).where(Player.email == email))
        now = datetime.now(timezone.utc)
        return jwt.encode({"sub": str(p.id),
                           "iat": int((now - timedelta(seconds=signed_in_ago_seconds)).timestamp()),
                           "exp": int((now + timedelta(days=60)).timestamp()),
                           "jti": "test"}, settings.jwt_secret, algorithm="HS256")


def test_the_old_session_dies_when_the_password_changes(client, signed_up):
    """The whole reason pw_changed_at exists.

    Somebody resets because they think a stranger is in the account. The stranger's token is a
    signed JWT with two months left on it and no row anywhere to delete."""
    theirs = {"Authorization": "Bearer " + stranger_token(signed_up["email"])}
    assert client.get("/auth/me", headers=theirs).status_code == 200    # in, an hour ago
    client.post("/auth/forgot", json={"email": signed_up["email"]})
    t = link_token(signed_up["email"])
    assert client.post("/auth/reset", json={"token": t, "password": "locks changed now"}).status_code == 200
    after = client.get("/auth/me", headers=theirs)
    assert after.status_code == 401, "a token minted before the reset still opened the account"


def test_the_session_the_reset_hands_back_survives_its_own_reset(client, signed_up):
    """The other side of the same comparison, and the one that breaks quietly.

    pw_changed_at has microseconds and a token's iat is whole seconds, so a comparison written
    the obvious way signs somebody out of the session they were handed a millisecond earlier —
    which does not look like an off-by-one, it looks like the reset silently failing."""
    client.post("/auth/forgot", json={"email": signed_up["email"]})
    t = link_token(signed_up["email"])
    r = client.post("/auth/reset", json={"token": t, "password": "straight back in please"})
    assert r.status_code == 200
    assert client.get("/auth/me",
                      headers={"Authorization": "Bearer " + r.json()["token"]}).status_code == 200


def test_other_outstanding_links_die_too(client, signed_up):
    """A stranger who asked for a reset an hour ago must not still hold a live one."""
    client.post("/auth/forgot", json={"email": signed_up["email"]})
    theirs = link_token(signed_up["email"])
    client.post("/auth/forgot", json={"email": signed_up["email"]})
    mine = link_token(signed_up["email"])
    assert client.post("/auth/reset", json={"token": mine, "password": "put right again"}).status_code == 200
    assert client.post("/auth/reset", json={"token": theirs, "password": "let me back in"}).status_code == 400


def test_asking_twice_leaves_both_links_alive(client, signed_up):
    """Press it, wait, press it again because nothing arrived — then the first email turns up.

    Opening the older of the two is the obvious thing to do and it must work."""
    client.post("/auth/forgot", json={"email": signed_up["email"]})
    first = link_token(signed_up["email"])
    client.post("/auth/forgot", json={"email": signed_up["email"]})
    link_token(signed_up["email"])             # a second row exists
    assert client.post("/auth/reset", json={"token": first,
                                            "password": "the first one still works"}).status_code == 200


def test_the_reset_is_rate_limited(client, signed_up):
    """Each call sends mail to an address the caller picked."""
    codes = [client.post("/auth/forgot", json={"email": signed_up["email"]}).status_code
             for _ in range(8)]
    assert 429 in codes, "an unbounded forgot-password endpoint is a mail cannon"
    # And it is not so tight that a person who tries twice sees it.
    assert codes[0] == 200 and codes[1] == 200


def test_the_limit_is_per_address_as_well_as_per_caller(client):
    """A bank of machines on one address is what the per-caller window does not touch."""
    for i in range(rate_limit.RESET_PER_EMAIL):
        client.post("/auth/forgot", json={"email": "one-target@example.com"})
    blocked = client.post("/auth/forgot", json={"email": "one-target@example.com"})
    assert blocked.status_code == 429
    # A different address from the same caller is still inside the (larger) per-caller window.
    assert client.post("/auth/forgot", json={"email": "somebody-else@example.com"}).status_code == 200


def test_health_says_whether_mail_is_working(client):
    """The one failure the reset flow cannot report about itself."""
    body = client.get("/health").json()
    assert body["ok"] is True
    assert body["mail"]["transport"] == "none"      # nothing configured in a test run
    assert body["mail"]["configured"] is False
    # No secret on a public endpoint.
    assert "password" not in str(body).lower()
    assert "api_key" not in str(body).lower()
