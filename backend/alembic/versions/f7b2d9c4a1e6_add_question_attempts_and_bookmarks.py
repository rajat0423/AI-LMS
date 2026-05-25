"""add question attempts and bookmarks

Revision ID: f7b2d9c4a1e6
Revises: e5a1c3d9b7f2
Create Date: 2026-05-14 22:10:00.000000
"""

from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = "f7b2d9c4a1e6"
down_revision: Union[str, Sequence[str], None] = "e5a1c3d9b7f2"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.create_table(
        "question_attempts",
        sa.Column("question_attempt_id", sa.UUID(), nullable=False),
        sa.Column("user_id", sa.UUID(), nullable=False),
        sa.Column("question_id", sa.UUID(), nullable=False),
        sa.Column("selected_option_id", sa.UUID(), nullable=False),
        sa.Column("is_correct", sa.Boolean(), nullable=False, server_default=sa.text("false")),
        sa.Column("mode", sa.String(length=20), nullable=False, server_default=sa.text("'learning'")),
        sa.Column("time_spent_seconds", sa.Integer(), nullable=True),
        sa.Column("attempted_at", sa.DateTime(timezone=True), nullable=False),
        sa.Column("created_at", sa.DateTime(timezone=True), nullable=False),
        sa.Column("updated_at", sa.DateTime(timezone=True), nullable=False),
        sa.ForeignKeyConstraint(["question_id"], ["questions.question_id"], ondelete="CASCADE"),
        sa.ForeignKeyConstraint(["selected_option_id"], ["options.option_id"], ondelete="CASCADE"),
        sa.ForeignKeyConstraint(["user_id"], ["users.user_id"], ondelete="CASCADE"),
        sa.PrimaryKeyConstraint("question_attempt_id", name="pk_question_attempts"),
        sa.UniqueConstraint("user_id", "question_id", name="uq_question_attempt_user_question"),
    )

    op.create_table(
        "question_bookmarks",
        sa.Column("question_bookmark_id", sa.UUID(), nullable=False),
        sa.Column("user_id", sa.UUID(), nullable=False),
        sa.Column("question_id", sa.UUID(), nullable=False),
        sa.Column("created_at", sa.DateTime(timezone=True), nullable=False),
        sa.ForeignKeyConstraint(["question_id"], ["questions.question_id"], ondelete="CASCADE"),
        sa.ForeignKeyConstraint(["user_id"], ["users.user_id"], ondelete="CASCADE"),
        sa.PrimaryKeyConstraint("question_bookmark_id", name="pk_question_bookmarks"),
        sa.UniqueConstraint("user_id", "question_id", name="uq_question_bookmark_user_question"),
    )


def downgrade() -> None:
    op.drop_table("question_bookmarks")
    op.drop_table("question_attempts")
