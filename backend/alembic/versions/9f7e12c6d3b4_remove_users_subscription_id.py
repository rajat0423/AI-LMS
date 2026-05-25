"""Remove redundant users.subscription_id column

Revision ID: 9f7e12c6d3b4
Revises: 581e7e9bc9a1
Create Date: 2026-04-01 20:10:00.000000
"""

from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = "9f7e12c6d3b4"
down_revision: Union[str, Sequence[str], None] = "581e7e9bc9a1"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    bind = op.get_bind()
    if bind.dialect.name == "sqlite":
        op.execute(
            """
            UPDATE subscriptions
            SET user_id = (
                SELECT users.user_id
                FROM users
                WHERE users.subscription_id = subscriptions.subscription_id
                  AND users.subscription_id IS NOT NULL
                LIMIT 1
            )
            WHERE EXISTS (
                SELECT 1
                FROM users
                WHERE users.subscription_id = subscriptions.subscription_id
                  AND users.subscription_id IS NOT NULL
            )
              AND (user_id IS NULL OR user_id = (
                  SELECT users.user_id
                  FROM users
                  WHERE users.subscription_id = subscriptions.subscription_id
                    AND users.subscription_id IS NOT NULL
                  LIMIT 1
              ))
            """
        )
    else:
        op.execute(
            """
            UPDATE public.subscriptions AS s
            SET user_id = u.user_id
            FROM public.users AS u
            WHERE u.subscription_id = s.subscription_id
              AND u.subscription_id IS NOT NULL
              AND (s.user_id IS NULL OR s.user_id = u.user_id)
            """
        )

    with op.batch_alter_table("users") as batch_op:
        batch_op.drop_column("subscription_id")


def downgrade() -> None:
    with op.batch_alter_table("users") as batch_op:
        batch_op.add_column(sa.Column("subscription_id", sa.UUID(), nullable=True))
