import re
from typing import List, Dict, Optional
from datetime import datetime, timedelta
from pydantic import BaseModel

class PasswordValidationError(Exception):
    """Custom exception for password validation errors"""
    pass

class PasswordPolicy(BaseModel):
    """Password policy configuration"""
    min_length: int = 12
    require_uppercase: bool = True
    require_lowercase: bool = True
    require_numbers: bool = True
    require_special_chars: bool = True
    max_age_days: int = 90
    prevent_reuse: int = 5  # Number of previous passwords to check
    max_failed_attempts: int = 5
    lockout_duration_minutes: int = 30

class PasswordPolicyService:
    def __init__(self, policy: Optional[PasswordPolicy] = None):
        self.policy = policy or PasswordPolicy()
        self._failed_attempts: Dict[str, List[datetime]] = {}
        self._password_history: Dict[str, List[str]] = {}

    def validate_password(self, password: str, user_id: str, old_password: Optional[str] = None) -> None:
        """
        Validate a password against the policy
        Raises PasswordValidationError if validation fails
        """
        errors = []

        # Check length
        if len(password) < self.policy.min_length:
            errors.append(f"Password must be at least {self.policy.min_length} characters long")

        # Check character requirements
        if self.policy.require_uppercase and not re.search(r'[A-Z]', password):
            errors.append("Password must contain at least one uppercase letter")
        
        if self.policy.require_lowercase and not re.search(r'[a-z]', password):
            errors.append("Password must contain at least one lowercase letter")
        
        if self.policy.require_numbers and not re.search(r'\d', password):
            errors.append("Password must contain at least one number")
        
        if self.policy.require_special_chars and not re.search(r'[!@#$%^&*(),.?":{}|<>]', password):
            errors.append("Password must contain at least one special character")

        # Check password history
        if user_id in self._password_history:
            if password in self._password_history[user_id]:
                errors.append(f"Password has been used in the last {self.policy.prevent_reuse} changes")

        # Check if it's too similar to old password
        if old_password and self._similarity_score(password, old_password) > 0.7:
            errors.append("New password is too similar to old password")

        if errors:
            raise PasswordValidationError("\n".join(errors))

    def record_failed_attempt(self, user_id: str) -> Optional[timedelta]:
        """
        Record a failed login attempt and return lockout duration if account should be locked
        """
        now = datetime.now()
        if user_id not in self._failed_attempts:
            self._failed_attempts[user_id] = []

        # Remove attempts older than lockout duration
        self._failed_attempts[user_id] = [
            attempt for attempt in self._failed_attempts[user_id]
            if now - attempt < timedelta(minutes=self.policy.lockout_duration_minutes)
        ]

        self._failed_attempts[user_id].append(now)

        if len(self._failed_attempts[user_id]) >= self.policy.max_failed_attempts:
            return timedelta(minutes=self.policy.lockout_duration_minutes)
        return None

    def clear_failed_attempts(self, user_id: str) -> None:
        """Clear failed login attempts for a user"""
        self._failed_attempts.pop(user_id, None)

    def add_to_history(self, user_id: str, password: str) -> None:
        """Add a password to the user's password history"""
        if user_id not in self._password_history:
            self._password_history[user_id] = []
        
        self._password_history[user_id].append(password)
        if len(self._password_history[user_id]) > self.policy.prevent_reuse:
            self._password_history[user_id].pop(0)

    def check_password_age(self, password_changed_at: datetime) -> bool:
        """Check if password needs to be changed based on age"""
        age_limit = timedelta(days=self.policy.max_age_days)
        return datetime.now() - password_changed_at > age_limit

    @staticmethod
    def _similarity_score(str1: str, str2: str) -> float:
        """Calculate similarity between two strings"""
        # Simple Levenshtein distance based similarity
        m = len(str1)
        n = len(str2)
        
        if m == 0 or n == 0:
            return 0.0
            
        matrix = [[0] * (n + 1) for _ in range(m + 1)]
        
        for i in range(m + 1):
            matrix[i][0] = i
        for j in range(n + 1):
            matrix[0][j] = j
            
        for i in range(1, m + 1):
            for j in range(1, n + 1):
                if str1[i-1] == str2[j-1]:
                    matrix[i][j] = matrix[i-1][j-1]
                else:
                    matrix[i][j] = min(
                        matrix[i-1][j] + 1,    # deletion
                        matrix[i][j-1] + 1,    # insertion
                        matrix[i-1][j-1] + 1   # substitution
                    )
        
        max_len = max(m, n)
        similarity = 1 - (matrix[m][n] / max_len)
        return similarity

# Global instance
password_policy_service = PasswordPolicyService()
