"""
Admin User Model
Last Updated: 2024-12-25T20:46:35+01:00
Status: INTERNAL
Reference: ../../../docs/validation/decisions/VALIDATION_VISIBILITY.md

This module implements the admin user model:
1. Secure password storage
2. Role management
3. Access control
"""

from sqlalchemy import Column, Integer, String, DateTime, Boolean
from sqlalchemy.dialects.postgresql import ARRAY
from datetime import datetime
from app.database import Base

class AdminUser(Base):
    """Admin user model for system administration"""
    __tablename__ = 'admin_users'

    id = Column(Integer, primary_key=True)
    username = Column(String, unique=True, nullable=False)
    password_hash = Column(String, nullable=False)
    roles = Column(ARRAY(String), nullable=False, default=['admin'])
    is_active = Column(Boolean, default=True, nullable=False)
    created_at = Column(DateTime, default=datetime.utcnow, nullable=False)
    last_login = Column(DateTime)

    def __repr__(self):
        return f'<AdminUser {self.username}>'

    def to_dict(self):
        """Convert admin user to dictionary"""
        return {
            'id': self.id,
            'username': self.username,
            'roles': self.roles,
            'is_active': self.is_active,
            'created_at': self.created_at.isoformat(),
            'last_login': self.last_login.isoformat() if self.last_login else None
        }
