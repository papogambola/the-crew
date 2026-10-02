"""play events

What happens inside a game, in the game's own vocabulary: a founding week, a file opened on the
roster, a recruitment trip, a posting viewed, cased, run, and a verdict in one of five bands.

Nine typed columns and one short label rather than a JSON blob of game state — a blob is cheap to
write, impossible to group by, and the shortest road to an analytics table that is a copy of the
save file. Nothing here identifies anybody: the same anonymous id as play_sessions, and no new
kind of fact about a person.

`at` is the server's clock. (session_id, seq) is unique, which is what makes a retried batch or a
page restored from the back/forward cache harmless rather than a source of double-counted funnels.

Revision ID: b93d5e1a7c42
Revises: a81c4f2d9e07
Create Date: 2026-10-02
"""
from alembic import op
import sqlalchemy as sa

revision = 'b93d5e1a7c42'
down_revision = 'a81c4f2d9e07'
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.create_table(
        "play_events",
        sa.Column("id", sa.Integer(), primary_key=True),
        sa.Column("anon_id", sa.String(length=64), nullable=False),
        sa.Column("session_id", sa.String(length=64), nullable=False),
        sa.Column("seq", sa.Integer(), nullable=False),
        sa.Column("name", sa.String(length=32), nullable=False),
        sa.Column("at", sa.DateTime(timezone=True), nullable=False),
        sa.Column("week", sa.Integer(), nullable=True),
        sa.Column("cat", sa.String(length=24), nullable=True),
        sa.Column("tier", sa.Integer(), nullable=True),
        sa.Column("verdict", sa.Integer(), nullable=True),
        sa.Column("team", sa.Integer(), nullable=True),
        sa.Column("dur_ms", sa.BigInteger(), nullable=True),
        sa.Column("ok", sa.Boolean(), nullable=True),
        sa.Column("extra", sa.String(length=120), nullable=True),
        sa.UniqueConstraint("session_id", "seq", name="uq_play_events_session_seq"),
    )
    op.create_index("ix_play_events_anon_id", "play_events", ["anon_id"])
    op.create_index("ix_play_events_session_id", "play_events", ["session_id"])
    # One index per question the dashboard asks: a player's journey, a funnel step over a window,
    # and one kind of posting across everybody.
    op.create_index("ix_play_events_anon_at", "play_events", ["anon_id", "at"])
    op.create_index("ix_play_events_name_at", "play_events", ["name", "at"])
    op.create_index("ix_play_events_cat_tier", "play_events", ["cat", "tier"])


def downgrade() -> None:
    for ix in ("ix_play_events_cat_tier", "ix_play_events_name_at", "ix_play_events_anon_at",
               "ix_play_events_session_id", "ix_play_events_anon_id"):
        op.drop_index(ix, table_name="play_events")
    op.drop_table("play_events")
