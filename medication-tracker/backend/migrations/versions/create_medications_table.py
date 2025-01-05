"""create medications table

Revision ID: create_medications_table
Revises: create_profile_table
Create Date: 2024-01-20 11:00:00.000000

"""
from alembic import op
import sqlalchemy as sa
from datetime import datetime

# revision identifiers, used by Alembic.
revision = 'create_medications_table'
down_revision = 'create_profile_table'
branch_labels = None
depends_on = None

def upgrade():
    op.create_table('medications',
        sa.Column('id', sa.Integer(), nullable=False),
        sa.Column('name', sa.String(length=100), nullable=False),
        sa.Column('dosage', sa.String(length=50), nullable=False),
        sa.Column('frequency', sa.String(length=50), nullable=False),
        sa.Column('next_dose', sa.DateTime(), nullable=True),
        sa.Column('user_id', sa.Integer(), nullable=False),
        sa.Column('category', sa.String(length=50), nullable=True),
        sa.Column('instructions', sa.Text(), nullable=True),
        sa.Column('start_date', sa.DateTime(), nullable=False, default=datetime.utcnow),
        sa.Column('end_date', sa.DateTime(), nullable=True),
        sa.Column('reminder_enabled', sa.Boolean(), default=True),
        sa.Column('reminder_time', sa.Integer(), default=30),
        sa.Column('created_at', sa.DateTime(), nullable=False, default=datetime.utcnow),
        sa.Column('updated_at', sa.DateTime(), nullable=False, default=datetime.utcnow, onupdate=datetime.utcnow),
        sa.ForeignKeyConstraint(['user_id'], ['users.id'], ),
        sa.PrimaryKeyConstraint('id')
    )
    op.create_index(op.f('ix_medications_user_id'), 'medications', ['user_id'], unique=False)

def downgrade():
    op.drop_index(op.f('ix_medications_user_id'), table_name='medications')
    op.drop_table('medications')
