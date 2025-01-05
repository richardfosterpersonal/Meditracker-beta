from datetime import datetime, timedelta
from typing import Dict, List, Optional, Set
from enum import Enum
from dataclasses import dataclass
import re
from ..core.logging import beta_logger
from ..core.exceptions import SecurityValidationError

class ThreatLevel(Enum):
    CRITICAL = "critical"   # Immediate action required - potential data breach
    HIGH = "high"          # Urgent action required - suspicious activity
    MEDIUM = "medium"      # Investigation required - unusual patterns
    LOW = "low"           # Monitoring required - minor anomalies

class ThreatType(Enum):
    UNAUTHORIZED_ACCESS = "unauthorized_access"
    DATA_EXFILTRATION = "data_exfiltration"
    INJECTION_ATTEMPT = "injection_attempt"
    ABNORMAL_BEHAVIOR = "abnormal_behavior"
    ENCRYPTION_FAILURE = "encryption_failure"
    AUDIT_TAMPERING = "audit_tampering"

@dataclass
class SecurityEvent:
    """Represents a security-relevant event"""
    timestamp: datetime
    event_type: ThreatType
    severity: ThreatLevel
    source_ip: str
    user_id: Optional[str]
    resource_accessed: str
    request_pattern: str
    validation_codes: List[str]  # Related VALIDATION-SEC-* codes

class ThreatDetectionService:
    def __init__(self):
        self.logger = beta_logger
        self._initialize_detection_patterns()
        self.suspicious_ips: Dict[str, List[SecurityEvent]] = {}
        self.suspicious_users: Dict[str, List[SecurityEvent]] = {}
        self.active_threats: Dict[str, SecurityEvent] = {}
        
    def _initialize_detection_patterns(self) -> None:
        """Initialize patterns for threat detection"""
        self.sql_injection_patterns = [
            r"(\b(union|select|insert|update|delete|drop)\b.*\b(from|into|table)\b)",
            r"('|\")\s*or\s*('|\")?\s*1\s*=\s*1",
            r"--.*$",
            r";\s*$"
        ]
        
        self.phi_patterns = [
            r"\b\d{3}-\d{2}-\d{4}\b",  # SSN
            r"\b\d{10}\b",              # Patient ID
            r"\b[A-Za-z]{2}\d{6}\b"     # Medical Record Number
        ]
        
        self.encryption_patterns = [
            r"password=",
            r"key=",
            r"secret="
        ]
    
    async def analyze_request(
        self,
        request_data: Dict,
        user_id: Optional[str] = None
    ) -> Optional[SecurityEvent]:
        """Analyze incoming request for potential threats"""
        try:
            # Extract request information
            source_ip = request_data.get('ip_address', '')
            resource = request_data.get('path', '')
            request_pattern = f"{request_data.get('method', '')} {resource}"
            
            # Check for injection attempts
            if self._detect_injection_attempt(request_data):
                return await self._create_security_event(
                    ThreatType.INJECTION_ATTEMPT,
                    ThreatLevel.HIGH,
                    source_ip,
                    user_id,
                    resource,
                    request_pattern,
                    ["VALIDATION-SEC-001", "VALIDATION-SEC-002"]
                )
            
            # Check for unauthorized PHI access
            if self._detect_phi_access(request_data):
                return await self._create_security_event(
                    ThreatType.DATA_EXFILTRATION,
                    ThreatLevel.CRITICAL,
                    source_ip,
                    user_id,
                    resource,
                    request_pattern,
                    ["VALIDATION-SEC-002"]
                )
            
            # Check for encryption-related issues
            if self._detect_encryption_issue(request_data):
                return await self._create_security_event(
                    ThreatType.ENCRYPTION_FAILURE,
                    ThreatLevel.HIGH,
                    source_ip,
                    user_id,
                    resource,
                    request_pattern,
                    ["VALIDATION-SEC-001"]
                )
            
            # Check for abnormal behavior
            if await self._detect_abnormal_behavior(source_ip, user_id, resource):
                return await self._create_security_event(
                    ThreatType.ABNORMAL_BEHAVIOR,
                    ThreatLevel.MEDIUM,
                    source_ip,
                    user_id,
                    resource,
                    request_pattern,
                    ["VALIDATION-SEC-003"]
                )
            
            return None
            
        except Exception as e:
            raise SecurityValidationError(f"Threat detection failed: {str(e)}")
    
    def _detect_injection_attempt(self, request_data: Dict) -> bool:
        """Detect potential SQL injection attempts"""
        request_str = str(request_data)
        return any(
            re.search(pattern, request_str, re.IGNORECASE)
            for pattern in self.sql_injection_patterns
        )
    
    def _detect_phi_access(self, request_data: Dict) -> bool:
        """Detect unauthorized PHI access attempts"""
        request_str = str(request_data)
        return any(
            re.search(pattern, request_str)
            for pattern in self.phi_patterns
        )
    
    def _detect_encryption_issue(self, request_data: Dict) -> bool:
        """Detect potential encryption-related issues"""
        request_str = str(request_data)
        return any(
            re.search(pattern, request_str)
            for pattern in self.encryption_patterns
        )
    
    async def _detect_abnormal_behavior(
        self,
        source_ip: str,
        user_id: Optional[str],
        resource: str
    ) -> bool:
        """Detect abnormal behavior patterns"""
        # Check for rapid successive requests
        if source_ip in self.suspicious_ips:
            recent_events = [
                event for event in self.suspicious_ips[source_ip]
                if event.timestamp > datetime.utcnow() - timedelta(minutes=5)
            ]
            if len(recent_events) > 50:  # More than 50 requests in 5 minutes
                return True
        
        # Check for unusual resource access patterns
        if user_id and user_id in self.suspicious_users:
            recent_events = [
                event for event in self.suspicious_users[user_id]
                if event.timestamp > datetime.utcnow() - timedelta(minutes=15)
            ]
            accessed_resources = {event.resource_accessed for event in recent_events}
            if len(accessed_resources) > 20:  # Accessing many different resources
                return True
        
        return False
    
    async def _create_security_event(
        self,
        event_type: ThreatType,
        severity: ThreatLevel,
        source_ip: str,
        user_id: Optional[str],
        resource: str,
        request_pattern: str,
        validation_codes: List[str]
    ) -> SecurityEvent:
        """Create and log a security event"""
        event = SecurityEvent(
            timestamp=datetime.utcnow(),
            event_type=event_type,
            severity=severity,
            source_ip=source_ip,
            user_id=user_id,
            resource_accessed=resource,
            request_pattern=request_pattern,
            validation_codes=validation_codes
        )
        
        # Update tracking dictionaries
        if source_ip:
            if source_ip not in self.suspicious_ips:
                self.suspicious_ips[source_ip] = []
            self.suspicious_ips[source_ip].append(event)
        
        if user_id:
            if user_id not in self.suspicious_users:
                self.suspicious_users[user_id] = []
            self.suspicious_users[user_id].append(event)
        
        # Log the security event
        self.logger.error(
            "security_threat_detected",
            event_type=event_type.value,
            severity=severity.value,
            source_ip=source_ip,
            user_id=user_id,
            resource=resource,
            validation_codes=validation_codes
        )
        
        # Track active threats
        threat_key = f"{event_type.value}_{source_ip}_{user_id}"
        self.active_threats[threat_key] = event
        
        return event
    
    async def get_active_threats(self) -> Dict[str, List[SecurityEvent]]:
        """Get summary of active security threats"""
        return {
            "critical": [
                event for event in self.active_threats.values()
                if event.severity == ThreatLevel.CRITICAL
            ],
            "high": [
                event for event in self.active_threats.values()
                if event.severity == ThreatLevel.HIGH
            ],
            "medium": [
                event for event in self.active_threats.values()
                if event.severity == ThreatLevel.MEDIUM
            ]
        }
