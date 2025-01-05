"""add PRN medication support

Revision ID: add_prn_support
Revises: previous_revision
Create Date: 2024-01-09 10:00:00.000000

"""
from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision = 'add_prn_support'
down_revision = None  # Update this to your previous migration
branch_labels = None
depends_on = None


def upgrade():
    # Make doses_per_day nullable
    op.alter_column('medications', 'doses_per_day',
                    existing_type=sa.Integer(),
                    nullable=True)
    
    # Add new PRN-related columns
    op.add_column('medications', sa.Column('is_prn', sa.Boolean(), nullable=False, server_default='false'))
    op.add_column('medications', sa.Column('min_hours_between_doses', sa.Integer(), nullable=True))
    op.add_column('medications', sa.Column('max_daily_doses', sa.Integer(), nullable=True))
    op.add_column('medications', sa.Column('reason_for_taking', sa.Text(), nullable=True))
    op.add_column('medications', sa.Column('daily_doses_taken', sa.Integer(), nullable=False, server_default='0'))
    op.add_column('medications', sa.Column('daily_doses_reset_at', sa.DateTime(), nullable=True))


def downgrade():
    # Remove PRN-related columns
    op.drop_column('medications', 'daily_doses_reset_at')
    op.drop_column('medications', 'daily_doses_taken')
    op.drop_column('medications', 'reason_for_taking')
    op.drop_column('medications', 'max_daily_doses')
    op.drop_column('medications', 'min_hours_between_doses')
    op.drop_column('medications', 'is_prn')
    
    # Make doses_per_day non-nullable again
    op.alter_column('medications', 'doses_per_day',
                    existing_type=sa.Integer(),
                    nullable=False,
                    server_default='1')
