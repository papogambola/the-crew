"""press passes

A licence can now be a week rather than a life: a code handed to a reviewer, redeemed onto their
account, worth seven real days from the moment they type it in.

Two columns, and both are on `licences` rather than in a table of their own, because a redeemed
code IS a licence — it opens the same door by the same question — and the thing that stops one code
opening two accounts is the unique index this table already has on `key`. A separate table would
have needed its own uniqueness, its own join, and its own answer to "is this account open", which
is the question entitlement.py exists to answer exactly once.

  kind        "purchase" or "pass". Written down rather than inferred from a null `amount`,
              because that inference is right until the first comped refund.
  expires_at  null for everything bought, which is the ordinary case and the existing rows.

Nothing is backfilled because null and "purchase" are already what every existing row means.

Revision ID: e5a2c74b91d8
Revises: d7b4e5c81f03
Create Date: 2026-09-28
"""
from alembic import op
import sqlalchemy as sa

revision = 'e5a2c74b91d8'
down_revision = 'd7b4e5c81f03'
branch_labels = None
depends_on = None


def upgrade() -> None:
    # server_default, not just a Python default: the column is NOT NULL and there may be rows in
    # it already, and a default that only exists in the model does not help the ALTER.
    op.add_column('licences', sa.Column('kind', sa.String(length=16),
                                        nullable=False, server_default='purchase'))
    op.add_column('licences', sa.Column('expires_at', sa.DateTime(timezone=True), nullable=True))


def downgrade() -> None:
    # Going back makes every pass permanent, which is the generous direction and the only one
    # available: the column that said when it ran out is the column being dropped.
    op.drop_column('licences', 'expires_at')
    op.drop_column('licences', 'kind')
