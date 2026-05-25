"""add question metadata for study bank

Revision ID: e5a1c3d9b7f2
Revises: d4b7c2e9f1a3
Create Date: 2026-05-14 18:45:00.000000
"""

from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = "e5a1c3d9b7f2"
down_revision: Union[str, Sequence[str], None] = "d4b7c2e9f1a3"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    with op.batch_alter_table("questions") as batch_op:
        batch_op.add_column(
            sa.Column(
                "difficulty_level",
                sa.String(length=50),
                nullable=False,
                server_default=sa.text("'Medium'"),
            )
        )
        batch_op.add_column(
            sa.Column(
                "placement_relevance",
                sa.String(length=255),
                nullable=False,
                server_default=sa.text("'Core placement readiness'"),
            )
        )

    with op.batch_alter_table("questions") as batch_op:
        batch_op.alter_column("difficulty_level", server_default=None)
        batch_op.alter_column("placement_relevance", server_default=None)


def downgrade() -> None:
    with op.batch_alter_table("questions") as batch_op:
        batch_op.drop_column("placement_relevance")
        batch_op.drop_column("difficulty_level")
