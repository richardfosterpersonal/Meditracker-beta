"""add enhanced notifications

Revision ID: add_enhanced_notifications
Revises: create_medications_table
Create Date: 2024-01-20

"""
from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql

# revision identifiers, used by Alembic
revision = 'add_enhanced_notifications'
down_revision = 'create_medications_table'
branch_labels = None
depends_on = None

def upgrade():
    # Drop old notification table constraints
    op.drop_constraint('notifications_schedule_id_fkey', 'notifications', type_='foreignkey')
    op.drop_column('notifications', 'schedule_id')
    
    # Make medication_id nullable
    op.alter_column('notifications', 'medication_id',
                    existing_type=sa.INTEGER(),
                    nullable=True)
    
    # Rename notification_type to type
    op.alter_column('notifications', 'notification_type',
                    new_column_name='type',
                    existing_type=sa.String(length=50),
                    nullable=False)
    
    # Add new columns
    op.add_column('notifications', sa.Column('priority', sa.String(length=20), nullable=False, server_default='normal'))
    op.add_column('notifications', sa.Column('data', postgresql.JSON(), nullable=True))
    op.add_column('notifications', sa.Column('acknowledged_at', sa.DateTime(), nullable=True))
    
    # Rename scheduled_for to scheduled_time
    op.alter_column('notifications', 'scheduled_for',
                    new_column_name='scheduled_time',
                    existing_type=sa.DateTime(),
                    nullable=False)

def downgrade():
    # Revert column renames
    op.alter_column('notifications', 'type',
                    new_column_name='notification_type',
                    existing_type=sa.String(length=50),
                    nullable=False)
    op.alter_column('notifications', 'scheduled_time',
                    new_column_name='scheduled_for',
                    existing_type=sa.DateTime(),
                    nullable=True)
    
    # Drop new columns
    op.drop_column('notifications', 'acknowledged_at')
    op.drop_column('notifications', 'data')
    op.drop_column('notifications', 'priority')
    
    # Make medication_id non-nullable again
    op.alter_column('notifications', 'medication_id',
                    existing_type=sa.INTEGER(),
                    nullable=False)
    
    # Add back schedule_id
    op.add_column('notifications', sa.Column('schedule_id', sa.INTEGER(), nullable=False))
    op.create_foreign_key('notifications_schedule_id_fkey', 'notifications', 'schedules', ['schedule_id'], ['id'])
