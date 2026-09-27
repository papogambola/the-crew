"""licences are stripe receipts

The licence stopped being a key somebody pasted and became an order Stripe told us about, so the
columns that described a Lemon Squeezy activation describe nothing now and the ones a Stripe
receipt needs were not there.

Safe to do destructively: nobody has ever bought the game. The shop has never been open — the
game's SHOP.checkout was empty and LEMON_STORE was unset — so `licences` is empty in every
environment this runs against. If that ever stops being true this migration needs rewriting as a
copy rather than a drop, and the downgrade below would need to invent data it cannot.

Revision ID: c3f1a90b47d2
Revises: bc2612acc605
Create Date: 2026-09-27
"""
from alembic import op
import sqlalchemy as sa

revision = 'c3f1a90b47d2'
down_revision = 'bc2612acc605'
branch_labels = None
depends_on = None


def upgrade() -> None:
    # What a Lemon Squeezy activation left behind.
    op.drop_column('licences', 'instance_id')
    op.drop_column('licences', 'store_id')
    op.drop_column('licences', 'product_id')
    # What a Stripe order leaves behind. All nullable: a webhook can arrive with a field missing
    # and the row is still worth writing — the door opening is the point, the rest is support.
    op.add_column('licences', sa.Column('payment_intent', sa.String(length=128), nullable=True))
    op.add_column('licences', sa.Column('email', sa.String(length=320), nullable=True))
    op.add_column('licences', sa.Column('price_id', sa.String(length=64), nullable=True))
    op.add_column('licences', sa.Column('amount', sa.Integer(), nullable=True))
    op.add_column('licences', sa.Column('currency', sa.String(length=8), nullable=True))


def downgrade() -> None:
    op.drop_column('licences', 'currency')
    op.drop_column('licences', 'amount')
    op.drop_column('licences', 'price_id')
    op.drop_column('licences', 'email')
    op.drop_column('licences', 'payment_intent')
    op.add_column('licences', sa.Column('product_id', sa.String(length=64), nullable=True))
    op.add_column('licences', sa.Column('store_id', sa.String(length=64), nullable=True))
    op.add_column('licences', sa.Column('instance_id', sa.String(length=128), nullable=True))
