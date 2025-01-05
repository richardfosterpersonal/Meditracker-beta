"""add carer tables

Revision ID: add_carer_tables
Revises: # will be filled by alembic
Create Date: 2024-01-19 10:00:00.000000

"""
from alembic import op
import sqlalchemy as sa
from datetime import datetime

# revision identifiers, used by Alembic.
revision = 'add_carer_tables'
down_revision = None  # will be filled by alembic
branch_labels = None
depends_on = None

def upgrade():
    # Create carers table
    op.create_table(
        'carers',
        sa.Column('id', sa.Integer(), nullable=False),
        sa.Column('user_id', sa.Integer(), nullable=False),
        sa.Column('type', sa.String(50), nullable=False),
        sa.Column('verified', sa.Boolean(), default=False),
        sa.Column('created_at', sa.DateTime(), default=datetime.utcnow),
        sa.Column('updated_at', sa.DateTime(), default=datetime.utcnow),
        sa.ForeignKeyConstraint(['user_id'], ['users.id'], ),
        sa.PrimaryKeyConstraint('id')
    )

    # Create carer_assignments table
    op.create_table(
        'carer_assignments',
        sa.Column('id', sa.Integer(), nullable=False),
        sa.Column('carer_id', sa.Integer(), nullable=False),
        sa.Column('patient_id', sa.Integer(), nullable=False),
        sa.Column('permissions', sa.JSON(), nullable=False),
        sa.Column('active', sa.Boolean(), default=True),
        sa.Column('created_at', sa.DateTime(), default=datetime.utcnow),
        sa.Column('updated_at', sa.DateTime(), default=datetime.utcnow),
        sa.ForeignKeyConstraint(['carer_id'], ['carers.id'], ),
        sa.ForeignKeyConstraint(['patient_id'], ['users.id'], ),
        sa.PrimaryKeyConstraint('id')
    )

    # Create indexes
    op.create_index('idx_carer_user_id', 'carers', ['user_id'])
    op.create_index('idx_assignment_carer_id', 'carer_assignments', ['carer_id'])
    op.create_index('idx_assignment_patient_id', 'carer_assignments', ['patient_id'])

def downgrade():
    op.drop_index('idx_assignment_patient_id', 'carer_assignments')
    op.drop_index('idx_assignment_carer_id', 'carer_assignments')
    op.drop_index('idx_carer_user_id', 'carers')
    op.drop_table('carer_assignments')
    op.drop_table('carers')
