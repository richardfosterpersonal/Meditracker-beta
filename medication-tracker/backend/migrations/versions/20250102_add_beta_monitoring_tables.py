"""
Add Beta Monitoring Tables
Last Updated: 2025-01-02T10:15:00+01:00

Revision ID: 20250102_add_beta_monitoring_tables
"""

from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql

# revision identifiers, used by Alembic.
revision = '20250102_add_beta_monitoring_tables'
down_revision = '20250101_add_beta_tables'
branch_labels = None
depends_on = None


def upgrade():
    # Create beta_activity table
    op.create_table(
        'beta_activity',
        sa.Column('id', sa.Integer(), nullable=False),
        sa.Column('tester_id', sa.String(50), nullable=False),
        sa.Column('action', sa.String(100), nullable=False),
        sa.Column('details', sa.JSON(), nullable=True),
        sa.Column('timestamp', sa.DateTime(), nullable=False),
        sa.PrimaryKeyConstraint('id')
    )
    
    # Create beta_critical_issues table
    op.create_table(
        'beta_critical_issues',
        sa.Column('id', sa.Integer(), nullable=False),
        sa.Column('issue_type', sa.String(50), nullable=False),
        sa.Column('description', sa.String(500), nullable=False),
        sa.Column('severity', sa.String(20), nullable=False),
        sa.Column('status', sa.String(20), nullable=False),
        sa.Column('reported_by', sa.String(50), nullable=False),
        sa.Column('timestamp', sa.DateTime(), nullable=False),
        sa.PrimaryKeyConstraint('id')
    )
    
    # Create beta_backups table
    op.create_table(
        'beta_backups',
        sa.Column('id', sa.Integer(), nullable=False),
        sa.Column('user_id', sa.String(50), nullable=False),
        sa.Column('backup_path', sa.String(255), nullable=False),
        sa.Column('backup_type', sa.String(50), nullable=False),
        sa.Column('status', sa.String(20), nullable=False),
        sa.Column('metadata', sa.JSON(), nullable=True),
        sa.Column('timestamp', sa.DateTime(), nullable=False),
        sa.PrimaryKeyConstraint('id')
    )


def downgrade():
    op.drop_table('beta_backups')
    op.drop_table('beta_critical_issues')
    op.drop_table('beta_activity')
