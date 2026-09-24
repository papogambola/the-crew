"""A real database for every test, thrown away after. SQLite in a temp file, built by the SAME
migrations that build Postgres in production — so a migration that only works on Postgres fails
here, which is the point of not using create_all()."""
import os
import tempfile

import pytest

TMP = tempfile.mkdtemp(prefix="thecrew-test-")
os.environ["DATABASE_URL"] = "sqlite:///" + os.path.join(TMP, "test.db")
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
