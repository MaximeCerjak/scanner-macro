"""add thumbnail_key to specimen and session

Revision ID: 2dcf535e6509
Revises: 804e36646c83
Create Date: 2026-04-24 09:29:13.741623

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = '2dcf535e6509'
down_revision: Union[str, Sequence[str], None] = '804e36646c83'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.add_column('specimen', sa.Column('thumbnail_key', sa.String(500), nullable=True))
    op.add_column('session',  sa.Column('thumbnail_key', sa.String(500), nullable=True))


def downgrade() -> None:
    op.drop_column('specimen', 'thumbnail_key')
    op.drop_column('session',  'thumbnail_key')