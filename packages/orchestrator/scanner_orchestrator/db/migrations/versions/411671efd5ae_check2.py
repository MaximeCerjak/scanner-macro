"""check2

Revision ID: 411671efd5ae
Revises: 2dcf535e6509
Create Date: 2026-04-24 09:34:49.983714

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = '411671efd5ae'
down_revision: Union[str, Sequence[str], None] = '2dcf535e6509'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    pass

def downgrade() -> None:
    pass
