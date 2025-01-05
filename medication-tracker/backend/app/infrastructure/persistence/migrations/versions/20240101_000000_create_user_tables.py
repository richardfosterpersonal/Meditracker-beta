"""create user tables

Revision ID: 20240101_000000
Revises: 
Create Date: 2024-01-01 00:00:00.000000

"""
from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects.postgresql import JSON


# revision identifiers, used by Alembic.
revision = '20240101_000000'
down_revision = None
branch_labels = None
depends_on = None


def upgrade() -> None:
    # Create users table
    op.create_table(
        'users',
        sa.Column('id', sa.Integer(), nullable=False),
        sa.Column('name', sa.String(length=100), nullable=False),
        sa.Column('email', sa.String(length=255), nullable=False),
        sa.Column('password_hash', sa.String(length=255), nullable=False),
        sa.Column('email_verified', sa.Boolean(), nullable=False, default=False),
        sa.Column('notification_preferences', JSON, nullable=False),
        sa.Column('push_subscription', sa.String(length=1024), nullable=True),
        sa.Column('last_login', sa.DateTime(), nullable=False),
        sa.Column('is_admin', sa.Boolean(), nullable=False, default=False),
        sa.Column('is_carer', sa.Boolean(), nullable=False, default=False),
        sa.Column('created_at', sa.DateTime(), nullable=False),
        sa.Column('updated_at', sa.DateTime(), nullable=False),
        sa.PrimaryKeyConstraint('id'),
        sa.UniqueConstraint('email')
    )

    # Create carers table
    op.create_table(
        'carers',
        sa.Column('id', sa.Integer(), nullable=False),
        sa.Column('user_id', sa.Integer(), nullable=False),
        sa.Column('type', sa.String(length=50), nullable=False),
        sa.Column('verified', sa.Boolean(), nullable=False, default=False),
        sa.Column('qualifications', JSON, nullable=True),
        sa.Column('patients', JSON, nullable=False),
        sa.Column('created_at', sa.DateTime(), nullable=False),
        sa.Column('updated_at', sa.DateTime(), nullable=False),
        sa.PrimaryKeyConstraint('id'),
        sa.ForeignKeyConstraint(['user_id'], ['users.id'], ondelete='CASCADE'),
        sa.UniqueConstraint('user_id')
    )

    # Create carer_assignments table
    op.create_table(
        'carer_assignments',
        sa.Column('id', sa.Integer(), nullable=False),
        sa.Column('carer_id', sa.Integer(), nullable=False),
        sa.Column('patient_id', sa.Integer(), nullable=False),
        sa.Column('permissions', JSON, nullable=False),
        sa.Column('active', sa.Boolean(), nullable=False, default=True),
        sa.Column('created_at', sa.DateTime(), nullable=False),
        sa.Column('updated_at', sa.DateTime(), nullable=False),
        sa.PrimaryKeyConstraint('id'),
        sa.ForeignKeyConstraint(['carer_id'], ['carers.id'], ondelete='CASCADE'),
        sa.ForeignKeyConstraint(['patient_id'], ['users.id'], ondelete='CASCADE')
    )

    # Create indexes
    op.create_index('ix_users_email', 'users', ['email'])
    op.create_index('ix_carers_user_id', 'carers', ['user_id'])
    op.create_index('ix_carer_assignments_carer_id', 'carer_assignments', ['carer_id'])
    op.create_index('ix_carer_assignments_patient_id', 'carer_assignments', ['patient_id'])
    op.create_index(
        'ix_carer_assignments_carer_patient',
        'carer_assignments',
        ['carer_id', 'patient_id'],
        unique=True,
        postgresql_where=sa.text('active = true')
    )


def downgrade() -> None:
    # Drop tables in reverse order
    op.drop_table('carer_assignments')
    op.drop_table('carers')
    op.drop_table('users')
