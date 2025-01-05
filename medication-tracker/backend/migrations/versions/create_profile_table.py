"""create profile table

Revision ID: create_profile_table
Revises: create_users_table
Create Date: 2024-01-20 10:00:00.000000

"""
from alembic import op
import sqlalchemy as sa
from datetime import datetime

# revision identifiers, used by Alembic.
revision = 'create_profile_table'
down_revision = 'create_users_table'
branch_labels = None
depends_on = None

def upgrade():
    op.create_table('profiles',
        sa.Column('id', sa.Integer(), nullable=False),
        sa.Column('user_id', sa.Integer(), nullable=False),
        sa.Column('first_name', sa.String(length=50), nullable=False),
        sa.Column('last_name', sa.String(length=50), nullable=False),
        sa.Column('phone', sa.String(length=20)),
        sa.Column('date_of_birth', sa.Date(), nullable=True),
        sa.Column('address', sa.String(length=200)),
        sa.Column('emergency_contact_name', sa.String(length=100)),
        sa.Column('emergency_contact_phone', sa.String(length=20)),
        sa.Column('emergency_contact_relationship', sa.String(length=50)),
        sa.Column('medical_conditions', sa.Text()),
        sa.Column('allergies', sa.Text()),
        sa.Column('blood_type', sa.String(length=10)),
        sa.Column('preferred_pharmacy', sa.String(length=200)),
        sa.Column('created_at', sa.DateTime(), nullable=False, default=datetime.utcnow),
        sa.Column('updated_at', sa.DateTime(), nullable=False, default=datetime.utcnow, onupdate=datetime.utcnow),
        sa.ForeignKeyConstraint(['user_id'], ['users.id'], ),
        sa.PrimaryKeyConstraint('id'),
        sa.UniqueConstraint('user_id')
    )
    op.create_index(op.f('ix_profiles_user_id'), 'profiles', ['user_id'], unique=True)

def downgrade():
    op.drop_index(op.f('ix_profiles_user_id'), table_name='profiles')
    op.drop_table('profiles')
