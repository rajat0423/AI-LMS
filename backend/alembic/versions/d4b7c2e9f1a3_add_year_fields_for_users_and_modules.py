"""add year fields for users and modules

Revision ID: d4b7c2e9f1a3
Revises: c91c14fd5b3a
Create Date: 2026-05-04 18:20:00.000000

"""

from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = "d4b7c2e9f1a3"
down_revision: Union[str, Sequence[str], None] = "c91c14fd5b3a"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    with op.batch_alter_table("modules") as batch_op:
        batch_op.add_column(sa.Column("year", sa.Integer(), nullable=False, server_default=sa.text("1")))

    with op.batch_alter_table("users") as batch_op:
        batch_op.add_column(sa.Column("year", sa.Integer(), nullable=False, server_default=sa.text("3")))

    with op.batch_alter_table("modules") as batch_op:
        batch_op.alter_column("year", server_default=None)

    with op.batch_alter_table("users") as batch_op:
        batch_op.alter_column("year", server_default=None)


def downgrade() -> None:
    with op.batch_alter_table("users") as batch_op:
        batch_op.drop_column("year")

    with op.batch_alter_table("modules") as batch_op:
        batch_op.drop_column("year")
