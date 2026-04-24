"""add specimen name

Revision ID: 804e36646c83
Revises: 6b1f9151ba4a
Create Date: 2026-04-23 22:31:00.983934

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = '804e36646c83'
down_revision: Union[str, Sequence[str], None] = '6b1f9151ba4a'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.add_column('specimen', sa.Column('name', sa.String(200), nullable=True))


def downgrade() -> None:
    op.drop_column('specimen', 'name')
