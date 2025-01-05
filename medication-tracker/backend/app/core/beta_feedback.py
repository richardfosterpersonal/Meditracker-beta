"""
Beta Feedback and Usage Tracking
Critical Path: Beta.Feedback
Last Updated: 2025-01-01T21:49:57+01:00
"""

import json
import logging
from pathlib import Path
from datetime import datetime
from typing import Dict, List, Optional, Set
from enum import Enum

from .pre_validation_requirements import (
    PreValidationRequirement,
    BetaValidationStatus,
    BetaValidationPriority,
    BetaValidationType,
    BetaValidationScope,
    BetaValidationResult
)

logger = logging.getLogger(__name__)

class FeedbackType(Enum):
    """Types of beta feedback"""
    BUG_REPORT = "bug_report"
    FEATURE_REQUEST = "feature_request"
    USABILITY_FEEDBACK = "usability_feedback"
    PERFORMANCE_ISSUE = "performance_issue"
    GENERAL_FEEDBACK = "general_feedback"

class FeedbackPriority(Enum):
    """Priority levels for feedback"""
    CRITICAL = "critical"
    HIGH = "high"
    MEDIUM = "medium"
    LOW = "low"

class FeedbackStatus(Enum):
    """Status of feedback items"""
    NEW = "new"
    TRIAGED = "triaged"
    IN_PROGRESS = "in_progress"
    RESOLVED = "resolved"
    WONT_FIX = "wont_fix"

class BetaMetrics:
    """Simple beta feedback and usage tracking"""
    
    def __init__(self, project_root: Path):
        self.project_root = project_root
        self.beta_dir = project_root / 'beta'
        self.feedback_file = self.beta_dir / 'feedback.json'
        self.usage_file = self.beta_dir / 'usage.json'
        self.beta_dir.mkdir(parents=True, exist_ok=True)
        self._init_files()
        
    def _init_files(self) -> None:
        """Initialize storage files"""
        if not self.feedback_file.exists():
            self._save_feedback([])
        if not self.usage_file.exists():
            self._save_usage({'features': {}, 'errors': []})
            
    def _load_feedback(self) -> List[Dict]:
        """Load feedback data"""
        with open(self.feedback_file) as f:
            return json.load(f)
            
    def _save_feedback(self, data: List[Dict]) -> None:
        """Save feedback data"""
        with open(self.feedback_file, 'w') as f:
            json.dump(data, f, indent=2)
            
    def _load_usage(self) -> Dict:
        """Load usage data"""
        with open(self.usage_file) as f:
            return json.load(f)
            
    def _save_usage(self, data: Dict) -> None:
        """Save usage data"""
        with open(self.usage_file, 'w') as f:
            json.dump(data, f, indent=2)
            
    def submit_feedback(
        self,
        user_id: str,
        feature: str,
        message: str,
        feedback_type: FeedbackType = FeedbackType.GENERAL_FEEDBACK,
        priority: FeedbackPriority = FeedbackPriority.MEDIUM
    ) -> Dict:
        """Submit user feedback"""
        feedback = {
            'id': f"feedback_{datetime.utcnow().timestamp()}",
            'user_id': user_id,
            'feature': feature,
            'message': message,
            'type': feedback_type.value,
            'priority': priority.value,
            'status': FeedbackStatus.NEW.value,
            'timestamp': datetime.utcnow().isoformat(),
            'resolution': None,
            'resolution_time': None
        }
        
        all_feedback = self._load_feedback()
        all_feedback.append(feedback)
        self._save_feedback(all_feedback)
        
        # Track critical feedback
        if priority == FeedbackPriority.CRITICAL:
            self._handle_critical_feedback(feedback)
        
        logger.info(f"Feedback received for {feature} from {user_id}")
        return feedback
        
    def _handle_critical_feedback(self, feedback: Dict) -> None:
        """Handle critical feedback"""
        try:
            # Log critical feedback
            logger.critical(
                f"Critical feedback received: {feedback['message']} "
                f"(Feature: {feedback['feature']}, User: {feedback['user_id']})"
            )
            
            # TODO: Implement notification system for critical feedback
            
        except Exception as e:
            logger.error(f"Failed to handle critical feedback: {str(e)}")
            
    def update_feedback_status(
        self,
        feedback_id: str,
        status: FeedbackStatus,
        resolution: Optional[str] = None
    ) -> Dict:
        """Update feedback status"""
        all_feedback = self._load_feedback()
        
        for item in all_feedback:
            if item['id'] == feedback_id:
                item['status'] = status.value
                if resolution:
                    item['resolution'] = resolution
                    item['resolution_time'] = datetime.utcnow().isoformat()
                break
                
        self._save_feedback(all_feedback)
        return item
        
    async def validate_feedback_system(self) -> BetaValidationResult:
        """Validate beta feedback system"""
        try:
            # Check storage directory
            if not self.beta_dir.exists():
                return BetaValidationResult(
                    requirement=PreValidationRequirement.BETA_FEEDBACK_READY,
                    status=BetaValidationStatus.FAILED,
                    priority=BetaValidationPriority.HIGH,
                    validation_type=BetaValidationType.FEEDBACK,
                    scope=BetaValidationScope.SYSTEM,
                    message="Beta feedback directory not found",
                    timestamp=datetime.utcnow().isoformat(),
                    corrective_action="Create beta feedback directory"
                )
                
            # Check data files
            if not (self.feedback_file.exists() and self.usage_file.exists()):
                return BetaValidationResult(
                    requirement=PreValidationRequirement.BETA_FEEDBACK_READY,
                    status=BetaValidationStatus.FAILED,
                    priority=BetaValidationPriority.HIGH,
                    validation_type=BetaValidationType.FEEDBACK,
                    scope=BetaValidationScope.SYSTEM,
                    message="Feedback data files not found",
                    timestamp=datetime.utcnow().isoformat(),
                    corrective_action="Initialize feedback data files"
                )
                
            # Validate data integrity
            try:
                feedback_data = self._load_feedback()
                usage_data = self._load_usage()
                
                if not isinstance(feedback_data, list):
                    raise ValueError("Invalid feedback data format")
                    
                if not isinstance(usage_data, dict) or 'features' not in usage_data:
                    raise ValueError("Invalid usage data format")
                    
            except Exception as e:
                return BetaValidationResult(
                    requirement=PreValidationRequirement.BETA_FEEDBACK_READY,
                    status=BetaValidationStatus.FAILED,
                    priority=BetaValidationPriority.CRITICAL,
                    validation_type=BetaValidationType.FEEDBACK,
                    scope=BetaValidationScope.DATA,
                    message=f"Data integrity check failed: {str(e)}",
                    timestamp=datetime.utcnow().isoformat(),
                    corrective_action="Fix corrupted feedback data"
                )
                
            return BetaValidationResult(
                requirement=PreValidationRequirement.BETA_FEEDBACK_READY,
                status=BetaValidationStatus.PASSED,
                priority=BetaValidationPriority.HIGH,
                validation_type=BetaValidationType.FEEDBACK,
                scope=BetaValidationScope.SYSTEM,
                message="Beta feedback validation passed",
                timestamp=datetime.utcnow().isoformat()
            )
            
        except Exception as e:
            return BetaValidationResult(
                requirement=PreValidationRequirement.BETA_FEEDBACK_READY,
                status=BetaValidationStatus.FAILED,
                priority=BetaValidationPriority.CRITICAL,
                validation_type=BetaValidationType.FEEDBACK,
                scope=BetaValidationScope.SYSTEM,
                message=f"Beta feedback validation failed: {str(e)}",
                timestamp=datetime.utcnow().isoformat(),
                corrective_action="Fix feedback system error"
            )
            
    def get_feedback_metrics(self) -> Dict:
        """Get detailed feedback metrics"""
        all_feedback = self._load_feedback()
        
        metrics = {
            'total_feedback': len(all_feedback),
            'by_type': {},
            'by_priority': {},
            'by_status': {},
            'resolution_time': {
                'average': 0,
                'min': float('inf'),
                'max': 0
            }
        }
        
        resolution_times = []
        
        for feedback in all_feedback:
            # Count by type
            feedback_type = feedback.get('type', FeedbackType.GENERAL_FEEDBACK.value)
            metrics['by_type'][feedback_type] = metrics['by_type'].get(feedback_type, 0) + 1
            
            # Count by priority
            priority = feedback.get('priority', FeedbackPriority.MEDIUM.value)
            metrics['by_priority'][priority] = metrics['by_priority'].get(priority, 0) + 1
            
            # Count by status
            status = feedback.get('status', FeedbackStatus.NEW.value)
            metrics['by_status'][status] = metrics['by_status'].get(status, 0) + 1
            
            # Calculate resolution time
            if feedback.get('resolution_time'):
                resolution_time = (
                    datetime.fromisoformat(feedback['resolution_time']) -
                    datetime.fromisoformat(feedback['timestamp'])
                ).total_seconds() / 3600  # Convert to hours
                
                resolution_times.append(resolution_time)
                metrics['resolution_time']['min'] = min(
                    metrics['resolution_time']['min'],
                    resolution_time
                )
                metrics['resolution_time']['max'] = max(
                    metrics['resolution_time']['max'],
                    resolution_time
                )
                
        if resolution_times:
            metrics['resolution_time']['average'] = sum(resolution_times) / len(resolution_times)
        else:
            metrics['resolution_time'] = None
            
        return metrics

    def track_feature_usage(self, feature: str, user_id: str) -> None:
        """Track feature usage"""
        usage = self._load_usage()
        
        if feature not in usage['features']:
            usage['features'][feature] = {
                'total_uses': 0,
                'unique_users': []
            }
            
        usage['features'][feature]['total_uses'] += 1
        if user_id not in usage['features'][feature]['unique_users']:
            usage['features'][feature]['unique_users'].append(user_id)
            
        self._save_usage(usage)
        
    def log_error(self, feature: str, error: str, user_id: Optional[str] = None) -> None:
        """Log beta error"""
        usage = self._load_usage()
        
        error_entry = {
            'timestamp': datetime.utcnow().isoformat(),
            'feature': feature,
            'error': error,
            'user_id': user_id
        }
        
        usage['errors'].append(error_entry)
        self._save_usage(usage)
        
    def get_metrics(self) -> Dict:
        """Get basic beta metrics"""
        usage = self._load_usage()
        feedback = self._load_feedback()
        
        return {
            'feature_usage': {
                feature: {
                    'total_uses': data['total_uses'],
                    'unique_users': len(data['unique_users'])
                }
                for feature, data in usage['features'].items()
            },
            'error_count': len(usage['errors']),
            'feedback_count': len(feedback),
            'active_features': list(usage['features'].keys())
        }
