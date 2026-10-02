"""playtime

Two tables that answer one question — how long is the game actually played for — and are built so
they cannot answer another. No account id, no email, no address, no device: a row carries an
anonymous id the browser made up, three timestamps and a count of milliseconds.

  play_sessions    one sitting. started_at, last_beat_at, ended_at, active_ms, and whether it was
                   that anonymous id's first.
  play_milestones  that a sitting got past 1, 5, 15, 30, 60 or 120 minutes. The unique constraint
                   on (session, minutes) is what makes "no duplicate events" a property of the
                   database rather than of somebody remembering to check.

Nothing existing is touched. No column is added to players, and that is the point rather than an
omission — see the note in models.py.

active_ms is BigInteger: milliseconds overflow a 32-bit column at 24 days, which nobody will
reach and which is also not a conversation worth having later.

Revision ID: a81c4f2d9e07
Revises: e5a2c74b91d8
Create Date: 2026-10-02
"""
from alembic import op
import sqlalchemy as sa

revision = 'a81c4f2d9e07'
down_revision = 'e5a2c74b91d8'
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.create_table(
        "play_sessions",
        sa.Column("id", sa.Integer(), primary_key=True),
        sa.Column("anon_id", sa.String(length=64), nullable=False),
        sa.Column("session_id", sa.String(length=64), nullable=False),
        sa.Column("started_at", sa.DateTime(timezone=True), nullable=False),
        sa.Column("last_beat_at", sa.DateTime(timezone=True), nullable=False),
        sa.Column("ended_at", sa.DateTime(timezone=True), nullable=True),
        sa.Column("active_ms", sa.BigInteger(), nullable=False, server_default="0"),
        sa.Column("is_new", sa.Boolean(), nullable=False, server_default=sa.true()),
        sa.Column("session_no", sa.Integer(), nullable=False, server_default="1"),
        sa.UniqueConstraint("session_id", name="uq_play_sessions_session_id"),
    )
    op.create_index("ix_play_sessions_anon_id", "play_sessions", ["anon_id"])
    # The two shapes every dashboard query has: a window of time, and one player's history. The
    # second is what decides is_new on a first beat, so it is on the write path as well as the
    # read path and is worth an index from the first row rather than the millionth.
    op.create_index("ix_play_sessions_started_at", "play_sessions", ["started_at"])
    op.create_index("ix_play_sessions_anon_started", "play_sessions", ["anon_id", "started_at"])

    op.create_table(
        "play_milestones",
        sa.Column("id", sa.Integer(), primary_key=True),
        sa.Column("session_pk", sa.Integer(),
                  sa.ForeignKey("play_sessions.id", ondelete="CASCADE"), nullable=False),
        sa.Column("anon_id", sa.String(length=64), nullable=False),
        sa.Column("minutes", sa.Integer(), nullable=False),
        sa.Column("reached_at", sa.DateTime(timezone=True), nullable=False),
        sa.UniqueConstraint("session_pk", "minutes", name="uq_play_milestones_session_minutes"),
    )
    op.create_index("ix_play_milestones_session_pk", "play_milestones", ["session_pk"])
    op.create_index("ix_play_milestones_anon_id", "play_milestones", ["anon_id"])


def downgrade() -> None:
    op.drop_index("ix_play_milestones_anon_id", table_name="play_milestones")
    op.drop_index("ix_play_milestones_session_pk", table_name="play_milestones")
    op.drop_table("play_milestones")
    op.drop_index("ix_play_sessions_anon_started", table_name="play_sessions")
    op.drop_index("ix_play_sessions_started_at", table_name="play_sessions")
    op.drop_index("ix_play_sessions_anon_id", table_name="play_sessions")
    op.drop_table("play_sessions")
