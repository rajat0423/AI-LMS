"""Add AI feedback metadata fields

Revision ID: c91c14fd5b3a
Revises: b8c4f7a21d9e
Create Date: 2026-04-06 19:15:00.000000
"""

from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = "c91c14fd5b3a"
down_revision: Union[str, Sequence[str], None] = "b8c4f7a21d9e"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    bind = op.get_bind()
    op.add_column(
        "ai_feedback",
        sa.Column("source", sa.String(length=20), nullable=True),
    )
    op.add_column(
        "ai_feedback",
        sa.Column("model_name", sa.String(length=100), nullable=True),
    )
    op.add_column(
        "ai_feedback",
        sa.Column("updated_at", sa.DateTime(timezone=True), nullable=True),
    )

    op.execute("UPDATE ai_feedback SET source = 'admin' WHERE source IS NULL")
    op.execute("UPDATE ai_feedback SET updated_at = created_at WHERE updated_at IS NULL")

    if bind.dialect.name != "sqlite":
        op.alter_column("ai_feedback", "source", nullable=False)
        op.alter_column("ai_feedback", "updated_at", nullable=False)


def downgrade() -> None:
    op.drop_column("ai_feedback", "updated_at")
    op.drop_column("ai_feedback", "model_name")
    op.drop_column("ai_feedback", "source")
