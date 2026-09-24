"""The account itself. Passwords, tokens, and the things a sign-in form should not tell people."""
import uuid


def _email():
    return f"p-{uuid.uuid4().hex[:10]}@example.com"


def test_sign_up_then_sign_in(client):
    e = _email()
    r = client.post("/auth/signup", json={"email": e, "password": "a long enough password"})
    assert r.status_code == 201 and r.json()["token"]
    r2 = client.post("/auth/login", json={"email": e, "password": "a long enough password"})
    assert r2.status_code == 200 and r2.json()["token"]


def test_the_address_is_the_same_address_in_any_case(client):
    e = _email()
    client.post("/auth/signup", json={"email": e.upper(), "password": "a long enough password"})
    # signing in with the other case reaches the same account
    r = client.post("/auth/login", json={"email": e.lower(), "password": "a long enough password"})
    assert r.status_code == 200
    # and a second sign-up on the same address is refused, so one person cannot hold two free runs
    again = client.post("/auth/signup", json={"email": e.title(), "password": "a long enough password"})
    assert again.status_code == 409


def test_a_short_password_is_refused_with_a_reason(client):
    r = client.post("/auth/signup", json={"email": _email(), "password": "short"})
    assert r.status_code == 400
    assert "10 characters" in r.json()["detail"]


def test_the_wrong_password_and_the_wrong_address_read_the_same(client):
    e = _email()
    client.post("/auth/signup", json={"email": e, "password": "a long enough password"})
    wrong_pw = client.post("/auth/login", json={"email": e, "password": "not that password"})
    no_such = client.post("/auth/login", json={"email": _email(), "password": "a long enough password"})
    assert wrong_pw.status_code == no_such.status_code == 401
    assert wrong_pw.json()["detail"] == no_such.json()["detail"], \
        "a form that distinguishes the two answers questions for whoever is working through a list"


def test_the_password_is_not_stored(client):
    """bcrypt, not the password, and not a hash anybody can reverse with a rainbow table."""
    from sqlalchemy import select
    from app.database import SessionLocal
    from app.models import Player
    e, pw = _email(), "a long enough password"
    client.post("/auth/signup", json={"email": e, "password": pw})
    with SessionLocal() as db:
        p = db.scalar(select(Player).where(Player.email == e))
    assert pw not in p.password_hash
    assert p.password_hash.startswith("$2b$"), "a bcrypt hash, so it is slow on purpose"
    assert len(p.password_hash) >= 55


def test_me_needs_a_token(client):
    assert client.get("/auth/me").status_code in (401, 403)


def test_a_forged_token_opens_nothing(client, signed_up):
    import jwt
    forged = jwt.encode({"sub": "1", "exp": 4102444800}, "not the real secret", algorithm="HS256")
    assert client.get("/auth/me", headers={"Authorization": "Bearer " + forged}).status_code == 401
    # and a real one still works, so the test is not passing because everything is broken
    assert client.get("/auth/me", headers=signed_up["h"]).status_code == 200


def test_me_says_where_the_free_run_stands(client, signed_up):
    for w in (1, 2, 3):
        client.post("/run/week", headers=signed_up["h"], json={"game_id": "g", "game_week": w})
    me = client.get("/auth/me", headers=signed_up["h"]).json()
    assert me["email"] == signed_up["email"]
    assert me["weeks_played"] == 3 and me["weeks_left"] == 9 and me["paid"] is False


def test_health_is_open(client):
    assert client.get("/health").json() == {"ok": True}


def test_a_short_signing_secret_stops_the_server_booting():
    """Not a warning. PyJWT signs with "secret" and only grumbles; this refuses, because a
    forgeable token is every account at once."""
    import os
    import pytest
    from app.config import Settings
    s = Settings()
    keep = os.environ.get("JWT_SECRET")
    try:
        os.environ["JWT_SECRET"] = "tooshort"
        with pytest.raises(RuntimeError, match="32 bytes"):
            _ = s.jwt_secret
        os.environ["JWT_SECRET"] = ""
        with pytest.raises(RuntimeError, match="not set"):
            _ = s.jwt_secret
    finally:
        os.environ["JWT_SECRET"] = keep or ""
