from sqlalchemy import Column, Integer, String, DateTime, ForeignKey
from .base import BaseModel

class AuditLog(BaseModel):
    __tablename__ = "audit_logs"

    id = Column(Integer, primary_key=True)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=True)
    event_type = Column(String, nullable=False)
    resource_type = Column(String, nullable=False)
    resource_id = Column(String, nullable=True)
    description = Column(String, nullable=False)
    ip_address = Column(String, nullable=True)
    status = Column(String, nullable=False)
    timestamp = Column(DateTime, nullable=False)

    def to_dict(self):
        return {
            "id": self.id,
            "user_id": self.user_id,
            "event_type": self.event_type,
            "resource_type": self.resource_type,
            "resource_id": self.resource_id,
            "description": self.description,
            "ip_address": self.ip_address,
            "status": self.status,
            "timestamp": self.timestamp.isoformat()
        }
