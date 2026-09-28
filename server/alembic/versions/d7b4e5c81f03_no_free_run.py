"""no free run

The game is bought before it is played, so nothing counts weeks any more and `free_runs` answers a
question nobody puts. Dropped rather than left standing: a table with no reader is a table somebody
later has to work out the meaning of, and its meaning was "the twelve weeks", which no longer exist.

WHAT IS LOST, SAID PLAINLY: how far each dossier had got on the free run. Nothing is lost that the
game needs — a save already carries its own week, and entitlement is now one question, "is there a
licence". Nobody had paid when this was written, so no row in this table was standing between a
player and a game they had bought.

The downgrade rebuilds the table empty. It cannot do otherwise, and that is honest rather than
careless: the counts it held were about a rule the code no longer contains, so there is nothing for
them to mean on the way back. Whoever downgrades gets a working schema and a free run that starts
from nothing, which for a trial that has been withdrawn is the generous direction to fail in.

Revision ID: d7b4e5c81f03
Revises: c3f1a90b47d2
Create Date: 2026-09-28
"""
from alembic import op
import sqlalchemy as sa

revision = 'd7b4e5c81f03'
down_revision = 'c3f1a90b47d2'
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.drop_table('free_runs')


def downgrade() -> None:
    op.create_table(
        'free_runs',
        sa.Column('id', sa.Integer(), primary_key=True),
        sa.Column('player_id', sa.Integer(),
                  sa.ForeignKey('players.id', ondelete='CASCADE'), nullable=False),
        sa.Column('game_id', sa.String(length=64), nullable=False),
        sa.Column('weeks', sa.Integer(), nullable=False, server_default='0'),
        sa.Column('first_week_at', sa.DateTime(timezone=True), nullable=True),
        sa.Column('last_week_at', sa.DateTime(timezone=True), nullable=True),
        sa.UniqueConstraint('player_id', 'game_id', name='uq_free_runs_player_game'),
    )
    op.create_index('ix_free_runs_player_id', 'free_runs', ['player_id'])
