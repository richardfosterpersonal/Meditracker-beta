"""create medication history table

Revision ID: create_medication_history_table
Revises: create_medications_table
Create Date: 2024-01-20 12:00:00.000000

"""
from alembic import op
import sqlalchemy as sa
from datetime import datetime

# revision identifiers, used by Alembic.
revision = 'create_medication_history_table'
down_revision = 'create_medications_table'
branch_labels = None
depends_on = None

def upgrade():
    op.create_table('medication_history',
        sa.Column('id', sa.Integer(), nullable=False),
        sa.Column('medication_id', sa.Integer(), nullable=False),
        sa.Column('action', sa.String(length=20), nullable=False),  # 'taken', 'missed', 'skipped'
        sa.Column('scheduled_time', sa.DateTime(), nullable=False),
        sa.Column('taken_time', sa.DateTime(), nullable=True),
        sa.Column('notes', sa.Text(), nullable=True),
        sa.Column('created_at', sa.DateTime(), nullable=False, default=datetime.utcnow),
        sa.Column('updated_at', sa.DateTime(), nullable=False, default=datetime.utcnow, onupdate=datetime.utcnow),
        sa.ForeignKeyConstraint(['medication_id'], ['medications.id'], ondelete='CASCADE'),
        sa.PrimaryKeyConstraint('id')
    )
    op.create_index(op.f('ix_medication_history_medication_id'), 'medication_history', ['medication_id'], unique=False)

def downgrade():
    op.drop_index(op.f('ix_medication_history_medication_id'), table_name='medication_history')
    op.drop_table('medication_history')
