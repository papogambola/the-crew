"""A real database for every test, thrown away after. SQLite in a temp file by default, built by
the SAME migrations that build Postgres in production — so a migration that only works on Postgres
fails here, which is the point of not using create_all().

SQLite is not the whole story, though, and one difference bites: it returns **naive** datetimes
whatever the column says, and Postgres returns aware ones. Two places compare a stored datetime to
`now()` — `deps._minted_before_the_password_changed` and the expiry check in `routers/auth.py` —
and comparing naive to aware raises TypeError. Both handle it, but on SQLite only the naive branch
is ever taken, so the branch production actually uses was untested.

So point the suite at a real Postgres when it matters:

    TEST_DATABASE_URL=postgresql://user:pass@127.0.0.1:5432/crew python -m pytest -q

Nothing else changes; the same migrations build it. Left as an option rather than a requirement
because a suite that needs a database daemon running is a suite people stop running."""
import os
import tempfile

import pytest

TMP = tempfile.mkdtemp(prefix="thecrew-test-")
os.environ["DATABASE_URL"] = os.environ.get("TEST_DATABASE_URL") or ("sqlite:///" + os.path.join(TMP, "test.db"))
os.environ["JWT_SECRET"] = "test-secret-not-used-anywhere-real-and-long-enough-for-hs256"
os.environ["ALLOWED_ORIGINS"] = "https://playthecrew.com"

from alembic import command                      # noqa: E402
from alembic.config import Config                # noqa: E402
from fastapi.testclient import TestClient        # noqa: E402

from app.main import app                         # noqa: E402


@pytest.fixture(scope="session", autouse=True)
def migrated():
    cfg = Config(os.path.join(os.path.dirname(__file__), "..", "alembic.ini"))
    cfg.set_main_option("script_location", os.path.join(os.path.dirname(__file__), "..", "alembic"))
    command.upgrade(cfg, "head")


@pytest.fixture
def client():
    return TestClient(app)


@pytest.fixture
def signed_up(client):
    """A fresh account and its token. The email is unique per call so tests do not collide."""
    import uuid
    email = f"paz-{uuid.uuid4().hex[:10]}@example.com"
    r = client.post("/auth/signup", json={"email": email, "password": "a long enough password"})
    assert r.status_code == 201, r.text
    return {"email": email, "token": r.json()["token"],
            "h": {"Authorization": "Bearer " + r.json()["token"]}}
