"""add session name

Revision ID: 6b1f9151ba4a
Revises: 5eeb64fbc3b0
Create Date: 2026-04-23

"""
from alembic import op
import sqlalchemy as sa

revision = '6b1f9151ba4a'
down_revision = '5eeb64fbc3b0'
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.add_column('session', sa.Column('name', sa.String(length=200), nullable=True))


def downgrade() -> None:
    op.drop_column('session', 'name')