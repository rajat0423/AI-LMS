"""Add career analysis tables

Revision ID: 7a6c5f4e3d2b
Revises: c91c14fd5b3a
Create Date: 2026-04-06 21:58:00.000000
"""

from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = "7a6c5f4e3d2b"
down_revision: Union[str, Sequence[str], None] = "c91c14fd5b3a"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    bind = op.get_bind()
    op.create_table(
        "resume_analyses",
        sa.Column("analysis_id", sa.UUID(), nullable=False),
        sa.Column("user_id", sa.UUID(), nullable=False),
        sa.Column("resume_filename", sa.String(length=255), nullable=False),
        sa.Column("resume_file_url", sa.String(length=500), nullable=False),
        sa.Column("resume_text", sa.Text(), nullable=False),
        sa.Column("job_description", sa.Text(), nullable=False),
        sa.Column("match_percentage", sa.Integer(), nullable=True),
        sa.Column("matched_keywords", sa.JSON(), nullable=True),
        sa.Column("missing_keywords", sa.JSON(), nullable=True),
        sa.Column("analysis_summary", sa.Text(), nullable=True),
        sa.Column("status", sa.String(length=20), nullable=False),
        sa.Column("created_at", sa.DateTime(timezone=True), nullable=True),
        sa.Column("updated_at", sa.DateTime(timezone=True), nullable=True),
        sa.ForeignKeyConstraint(["user_id"], ["users.user_id"]),
        sa.PrimaryKeyConstraint("analysis_id"),
    )
    op.create_index(
        "ix_resume_analyses_user_id",
        "resume_analyses",
        ["user_id"],
        unique=False,
    )

    op.add_column(
        "interview_sessions",
        sa.Column("job_description", sa.Text(), nullable=True),
    )
    op.add_column(
        "interview_sessions",
        sa.Column("questions", sa.JSON(), nullable=True),
    )
    op.add_column(
        "interview_sessions",
        sa.Column("answers", sa.JSON(), nullable=True),
    )
    op.add_column(
        "interview_sessions",
        sa.Column("feedback_summary", sa.JSON(), nullable=True),
    )
    op.add_column(
        "interview_sessions",
        sa.Column("strengths", sa.JSON(), nullable=True),
    )
    op.add_column(
        "interview_sessions",
        sa.Column("improvement_areas", sa.JSON(), nullable=True),
    )
    op.add_column(
        "interview_sessions",
        sa.Column("better_answer_suggestions", sa.JSON(), nullable=True),
    )
    op.add_column(
        "interview_sessions",
        sa.Column("updated_at", sa.DateTime(timezone=True), nullable=True),
    )
    op.execute("UPDATE interview_sessions SET updated_at = created_at WHERE updated_at IS NULL")
    if bind.dialect.name != "sqlite":
        op.alter_column("interview_sessions", "updated_at", nullable=False)


def downgrade() -> None:
    op.drop_column("interview_sessions", "updated_at")
    op.drop_column("interview_sessions", "better_answer_suggestions")
    op.drop_column("interview_sessions", "improvement_areas")
    op.drop_column("interview_sessions", "strengths")
    op.drop_column("interview_sessions", "feedback_summary")
    op.drop_column("interview_sessions", "answers")
    op.drop_column("interview_sessions", "questions")
    op.drop_column("interview_sessions", "job_description")
    op.drop_index("ix_resume_analyses_user_id", table_name="resume_analyses")
    op.drop_table("resume_analyses")
