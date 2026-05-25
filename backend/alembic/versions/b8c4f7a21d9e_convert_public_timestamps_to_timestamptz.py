"""Convert public timestamp columns to timestamptz

Revision ID: b8c4f7a21d9e
Revises: 9f7e12c6d3b4
Create Date: 2026-04-01 21:05:00.000000
"""

from typing import Sequence, Union

from alembic import context, op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = "b8c4f7a21d9e"
down_revision: Union[str, Sequence[str], None] = "9f7e12c6d3b4"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


TIMESTAMP_COLUMNS: dict[str, list[str]] = {
    "ai_feedback": ["created_at"],
    "interview_sessions": ["created_at", "completed_at"],
    "lessons": ["created_at"],
    "modules": ["created_at", "updated_at"],
    "payments": ["payment_date"],
    "personality_analysis": ["created_at"],
    "roles": ["created_at"],
    "streaks": ["updated_at"],
    "submissions": ["created_at"],
    "subscriptions": [
        "current_period_start",
        "current_period_end",
        "created_at",
        "updated_at",
    ],
    "user_progress": ["completed_at", "created_at", "updated_at"],
    "users": ["created_at", "updated_at"],
}


def _existing_columns() -> set[tuple[str, str]]:
    if context.is_offline_mode():
        return {
            (table_name, column_name)
            for table_name, columns in TIMESTAMP_COLUMNS.items()
            for column_name in columns
        }

    bind = op.get_bind()
    if bind.dialect.name == "sqlite":
        inspector = sa.inspect(bind)
        existing: set[tuple[str, str]] = set()
        for table_name in inspector.get_table_names():
            for column in inspector.get_columns(table_name):
                existing.add((table_name, column["name"]))
        return existing

    rows = bind.execute(
        sa.text(
            """
            SELECT table_name, column_name
            FROM information_schema.columns
            WHERE table_schema = 'public'
            """
        )
    ).fetchall()
    return {(row[0], row[1]) for row in rows}


def _alter_column(table_name: str, column_name: str, target_type: str, using_sql: str) -> None:
    bind = op.get_bind()
    if bind.dialect.name == "sqlite":
        return

    op.execute(
        f"""
        ALTER TABLE public.{table_name}
        ALTER COLUMN {column_name}
        TYPE {target_type}
        USING {using_sql}
        """
    )


def upgrade() -> None:
    existing_columns = _existing_columns()
    for table_name, columns in TIMESTAMP_COLUMNS.items():
        for column_name in columns:
            if (table_name, column_name) not in existing_columns:
                continue
            _alter_column(
                table_name,
                column_name,
                "TIMESTAMP WITH TIME ZONE",
                f"CASE WHEN {column_name} IS NULL THEN NULL ELSE {column_name} AT TIME ZONE 'UTC' END",
            )


def downgrade() -> None:
    existing_columns = _existing_columns()
    for table_name, columns in TIMESTAMP_COLUMNS.items():
        for column_name in columns:
            if (table_name, column_name) not in existing_columns:
                continue
            _alter_column(
                table_name,
                column_name,
                "TIMESTAMP WITHOUT TIME ZONE",
                f"CASE WHEN {column_name} IS NULL THEN NULL ELSE {column_name} AT TIME ZONE 'UTC' END",
            )
