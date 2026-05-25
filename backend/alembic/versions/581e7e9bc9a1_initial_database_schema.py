"""Initial database schema

Revision ID: 581e7e9bc9a1
Revises: 
Create Date: 2026-03-25 23:46:22.008220

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql

# revision identifiers, used by Alembic.
revision: str = '581e7e9bc9a1'
down_revision: Union[str, Sequence[str], None] = None
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    # === 1. Create tables with NO foreign keys first ===
    
    op.create_table('roles',
        sa.Column('role_id', sa.UUID(), nullable=False),
        sa.Column('role_name', sa.String(length=50), nullable=False),
        sa.Column('permissions', sa.JSON(), nullable=True),
        sa.Column('created_at', sa.DateTime(), nullable=True),
        sa.PrimaryKeyConstraint('role_id'),
        sa.UniqueConstraint('role_name')
    )
    
    op.create_table('modules',
        sa.Column('module_id', sa.UUID(), nullable=False),
        sa.Column('title', sa.String(length=255), nullable=False),
        sa.Column('description', sa.Text(), nullable=True),
        sa.Column('order', sa.Integer(), nullable=False),
        sa.Column('is_premium', sa.Boolean(), nullable=True),
        sa.Column('created_at', sa.DateTime(), nullable=True),
        sa.Column('updated_at', sa.DateTime(), nullable=True),
        sa.PrimaryKeyConstraint('module_id')
    )
    
    # === 2. Create tables that depend on roles/modules ===
    
    op.create_table('users',
        sa.Column('user_id', sa.UUID(), nullable=False),
        sa.Column('email', sa.String(length=255), nullable=False),
        sa.Column('password_hash', sa.String(length=255), nullable=False),
        sa.Column('first_name', sa.String(length=100), nullable=False),
        sa.Column('last_name', sa.String(length=100), nullable=False),
        sa.Column('role_id', sa.UUID(), nullable=True),
        sa.Column('subscription_id', sa.UUID(), nullable=True),
        sa.Column('is_active', sa.Boolean(), nullable=True),
        sa.Column('created_at', sa.DateTime(), nullable=True),
        sa.Column('updated_at', sa.DateTime(), nullable=True),
        sa.PrimaryKeyConstraint('user_id'),
        sa.UniqueConstraint('email'),
        sa.ForeignKeyConstraint(['role_id'], ['roles.role_id'], ),
        # Note: subscription_id FK will be added later after subscriptions table exists
    )
    
    op.create_table('lessons',
        sa.Column('lesson_id', sa.UUID(), nullable=False),
        sa.Column('module_id', sa.UUID(), nullable=False),
        sa.Column('title', sa.String(length=255), nullable=False),
        sa.Column('content', sa.Text(), nullable=False),
        sa.Column('video_url', sa.String(length=500), nullable=True),
        sa.Column('order', sa.Integer(), nullable=False),
        sa.Column('duration_minutes', sa.Integer(), nullable=True),
        sa.Column('created_at', sa.DateTime(), nullable=True),
        sa.PrimaryKeyConstraint('lesson_id'),
        sa.ForeignKeyConstraint(['module_id'], ['modules.module_id'], )
    )
    
    # === 3. Create tables that depend on users/lessons ===
    
    op.create_table('user_progress',
        sa.Column('progress_id', sa.UUID(), nullable=False),
        sa.Column('user_id', sa.UUID(), nullable=False),
        sa.Column('lesson_id', sa.UUID(), nullable=False),
        sa.Column('is_completed', sa.Boolean(), nullable=True),
        sa.Column('completed_at', sa.DateTime(), nullable=True),
        sa.Column('score', sa.Integer(), nullable=True),
        sa.Column('created_at', sa.DateTime(), nullable=True),
        sa.Column('updated_at', sa.DateTime(), nullable=True),
        sa.PrimaryKeyConstraint('progress_id'),
        sa.ForeignKeyConstraint(['lesson_id'], ['lessons.lesson_id'], ),
        sa.ForeignKeyConstraint(['user_id'], ['users.user_id'], ),
        sa.UniqueConstraint('user_id', 'lesson_id', name='unique_user_lesson')
    )
    
    op.create_table('submissions',
        sa.Column('submission_id', sa.UUID(), nullable=False),
        sa.Column('user_id', sa.UUID(), nullable=False),
        sa.Column('submission_type', sa.String(length=50), nullable=False),
        sa.Column('content', sa.Text(), nullable=False),
        sa.Column('file_url', sa.String(length=500), nullable=True),
        sa.Column('status', sa.String(length=20), nullable=True),
        sa.Column('created_at', sa.DateTime(), nullable=True),
        sa.PrimaryKeyConstraint('submission_id'),
        sa.ForeignKeyConstraint(['user_id'], ['users.user_id'], )
    )
    
    op.create_table('streaks',
        sa.Column('streak_id', sa.UUID(), nullable=False),
        sa.Column('user_id', sa.UUID(), nullable=False),
        sa.Column('current_streak', sa.Integer(), nullable=True),
        sa.Column('longest_streak', sa.Integer(), nullable=True),
        sa.Column('last_activity_date', sa.Date(), nullable=True),
        sa.Column('updated_at', sa.DateTime(), nullable=True),
        sa.PrimaryKeyConstraint('streak_id'),
        sa.ForeignKeyConstraint(['user_id'], ['users.user_id'], ),
        sa.UniqueConstraint('user_id')
    )
    
    op.create_table('interview_sessions',
        sa.Column('session_id', sa.UUID(), nullable=False),
        sa.Column('user_id', sa.UUID(), nullable=False),
        sa.Column('role_applied', sa.String(length=100), nullable=True),
        sa.Column('total_questions', sa.Integer(), nullable=False),
        sa.Column('overall_score', sa.Integer(), nullable=True),
        sa.Column('status', sa.String(length=20), nullable=True),
        sa.Column('created_at', sa.DateTime(), nullable=True),
        sa.Column('completed_at', sa.DateTime(), nullable=True),
        sa.PrimaryKeyConstraint('session_id'),
        sa.ForeignKeyConstraint(['user_id'], ['users.user_id'], )
    )
    
    op.create_table('personality_analysis',
        sa.Column('analysis_id', sa.UUID(), nullable=False),
        sa.Column('user_id', sa.UUID(), nullable=False),
        sa.Column('submission_id', sa.UUID(), nullable=True),
        sa.Column('personality_type', sa.String(length=100), nullable=True),
        sa.Column('traits', sa.JSON(), nullable=False),
        sa.Column('recommendations', sa.Text(), nullable=True),
        sa.Column('created_at', sa.DateTime(), nullable=True),
        sa.PrimaryKeyConstraint('analysis_id'),
        sa.ForeignKeyConstraint(['submission_id'], ['submissions.submission_id'], ),
        sa.ForeignKeyConstraint(['user_id'], ['users.user_id'], )
    )
    
    op.create_table('ai_feedback',
        sa.Column('feedback_id', sa.UUID(), nullable=False),
        sa.Column('submission_id', sa.UUID(), nullable=True),
        sa.Column('score', sa.Integer(), nullable=True),
        sa.Column('feedback_text', sa.Text(), nullable=False),
        sa.Column('improved_version', sa.Text(), nullable=True),
        sa.Column('strengths', sa.JSON(), nullable=True),
        sa.Column('weaknesses', sa.JSON(), nullable=True),
        sa.Column('suggestions', sa.JSON(), nullable=True),
        sa.Column('created_at', sa.DateTime(), nullable=True),
        sa.PrimaryKeyConstraint('feedback_id'),
        sa.ForeignKeyConstraint(['submission_id'], ['submissions.submission_id'], ),
        sa.UniqueConstraint('submission_id')
    )
    
    # === 4. Create subscriptions (depends on users) ===
    
    op.create_table('subscriptions',
        sa.Column('subscription_id', sa.UUID(), nullable=False),
        sa.Column('user_id', sa.UUID(), nullable=True),
        sa.Column('plan_type', sa.String(length=50), nullable=False),
        sa.Column('stripe_customer_id', sa.String(length=100), nullable=True),
        sa.Column('stripe_subscription_id', sa.String(length=100), nullable=True),
        sa.Column('status', sa.String(length=20), nullable=True),
        sa.Column('current_period_start', sa.DateTime(), nullable=True),
        sa.Column('current_period_end', sa.DateTime(), nullable=True),
        sa.Column('created_at', sa.DateTime(), nullable=True),
        sa.Column('updated_at', sa.DateTime(), nullable=True),
        sa.PrimaryKeyConstraint('subscription_id'),
        sa.ForeignKeyConstraint(['user_id'], ['users.user_id'], ),
        sa.UniqueConstraint('user_id')
    )
    
    # === 5. Create payments (depends on users AND subscriptions) ===
    
    op.create_table('payments',
        sa.Column('payment_id', sa.UUID(), nullable=False),
        sa.Column('user_id', sa.UUID(), nullable=False),
        sa.Column('subscription_id', sa.UUID(), nullable=True),
        sa.Column('amount', sa.Numeric(precision=10, scale=2), nullable=False),
        sa.Column('currency', sa.String(length=3), nullable=True),
        sa.Column('stripe_payment_intent_id', sa.String(length=100), nullable=True),
        sa.Column('status', sa.String(length=20), nullable=False),
        sa.Column('payment_date', sa.DateTime(), nullable=True),
        sa.PrimaryKeyConstraint('payment_id'),
        sa.ForeignKeyConstraint(['subscription_id'], ['subscriptions.subscription_id'], ),
        sa.ForeignKeyConstraint(['user_id'], ['users.user_id'], )
    )
    
    # === 6. Add indexes for performance ===
    
    op.create_index('ix_users_email', 'users', ['email'], unique=False)
    op.create_index('ix_submissions_user_id', 'submissions', ['user_id'], unique=False)


def downgrade() -> None:
    # Drop in reverse order of creation
    op.drop_table('payments')
    op.drop_table('subscriptions')
    op.drop_table('ai_feedback')
    op.drop_table('personality_analysis')
    op.drop_table('interview_sessions')
    op.drop_table('streaks')
    op.drop_table('submissions')
    op.drop_table('user_progress')
    op.drop_table('lessons')
    op.drop_table('users')
    op.drop_table('modules')
    op.drop_table('roles')