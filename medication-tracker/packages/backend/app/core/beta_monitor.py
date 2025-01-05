"""
Beta Test Monitoring
Last Updated: 2024-12-27T22:34:46+01:00
"""

from datetime import datetime, timedelta
from typing import Dict, List, Optional
from sqlalchemy import Column, String, Integer, DateTime, JSON, create_engine
from sqlalchemy.orm import Session
from app.database import Base, get_db

class BetaActivity(Base):
    """Beta tester activity record"""
    __tablename__ = 'beta_activity'
    
    id = Column(Integer, primary_key=True)
    tester_id = Column(String(50), nullable=False)
    action = Column(String(100), nullable=False)
    details = Column(JSON, nullable=True)
    timestamp = Column(DateTime, nullable=False, default=datetime.utcnow)
    
class BetaCriticalIssue(Base):
    """Critical safety issues reported during beta testing"""
    __tablename__ = 'beta_critical_issues'
    
    id = Column(Integer, primary_key=True)
    issue_type = Column(String(50), nullable=False)
    description = Column(String(500), nullable=False)
    severity = Column(String(20), nullable=False)
    status = Column(String(20), nullable=False)
    reported_by = Column(String(50), nullable=False)
    timestamp = Column(DateTime, nullable=False, default=datetime.utcnow)

class BetaMonitor:
    def __init__(self):
        self.db = next(get_db())

    async def log_activity(self, tester_id: str, action: str, details: Optional[Dict] = None) -> Dict:
        """Log beta tester activity"""
        try:
            activity = BetaActivity(
                tester_id=tester_id,
                action=action,
                details=details
            )
            
            self.db.add(activity)
            self.db.commit()
            
            return {
                "success": True,
                "activity_id": activity.id,
                "timestamp": activity.timestamp.isoformat()
            }
            
        except Exception as e:
            return {
                "success": False,
                "error": str(e)
            }
            
    async def get_tester_stats(self, tester_id: str) -> Dict:
        """Get basic stats for a tester"""
        try:
            activities = (
                self.db.query(BetaActivity)
                .filter(BetaActivity.tester_id == tester_id)
                .order_by(BetaActivity.timestamp.desc())
                .all()
            )
            
            return {
                "success": True,
                "tester_id": tester_id,
                "activity_count": len(activities),
                "last_active": activities[0].timestamp.isoformat() if activities else None,
                "activities": [
                    {
                        "action": activity.action,
                        "details": activity.details,
                        "timestamp": activity.timestamp.isoformat()
                    }
                    for activity in activities
                ]
            }
            
        except Exception as e:
            return {
                "success": False,
                "error": str(e)
            }
            
    async def get_critical_issues(self) -> Dict:
        """Get any critical safety issues reported"""
        try:
            issues = (
                self.db.query(BetaCriticalIssue)
                .filter(BetaCriticalIssue.status != 'resolved')
                .order_by(BetaCriticalIssue.severity.desc(), BetaCriticalIssue.timestamp.desc())
                .all()
            )
            
            return {
                "success": True,
                "issue_count": len(issues),
                "issues": [
                    {
                        "issue_type": issue.issue_type,
                        "description": issue.description,
                        "severity": issue.severity,
                        "status": issue.status,
                        "reported_by": issue.reported_by,
                        "timestamp": issue.timestamp.isoformat()
                    }
                    for issue in issues
                ]
            }
            
        except Exception as e:
            return {
                "success": False,
                "error": str(e)
            }
            
    async def get_active_testers(self) -> Dict:
        """Get count of active testers"""
        try:
            # Get unique testers active in the last 24 hours
            cutoff = datetime.utcnow() - timedelta(hours=24)
            active_testers = (
                self.db.query(BetaActivity.tester_id)
                .filter(BetaActivity.timestamp >= cutoff)
                .distinct()
                .all()
            )
            
            return {
                "success": True,
                "active_count": len(active_testers),
                "active_testers": [tester[0] for tester in active_testers]
            }
            
        except Exception as e:
            return {
                "success": False,
                "error": str(e)
            }

# Create singleton instance
beta_monitor = BetaMonitor()
