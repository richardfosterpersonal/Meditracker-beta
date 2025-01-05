"""
Configuration Monitoring System
Last Updated: 2024-12-27T09:59:04+01:00
Critical Path: Configuration.Monitoring
"""

import asyncio
from typing import Dict, List, Optional, Set, Any
from datetime import datetime, timedelta
from dataclasses import dataclass
from enum import Enum
from .logging import config_logger
from .critical_validation import CriticalValidation

class ConfigRiskLevel(Enum):
    """Configuration risk levels"""
    LOW = "low"
    MEDIUM = "medium"
    HIGH = "high"
    CRITICAL = "critical"

@dataclass
class ConfigValidationRule:
    """Configuration validation rule"""
    key: str
    risk_level: ConfigRiskLevel
    validation_fn: Any
    description: str
    critical_path: bool = False

class ConfigurationMonitor:
    """
    Configuration monitoring system ensuring critical path alignment
    and configuration safety
    """
    
    def __init__(self):
        self.logger = config_logger
        self._critical_validation = CriticalValidation()
        self._validation_rules: Dict[str, List[ConfigValidationRule]] = {}
        self._access_patterns: Dict[str, List[datetime]] = {}
        self._violations: List[Dict] = []
        self._setup_core_rules()
        
    def _setup_core_rules(self):
        """Setup core validation rules"""
        # Database URL validation
        self.add_validation_rule(
            ConfigValidationRule(
                key="DATABASE_URL",
                risk_level=ConfigRiskLevel.CRITICAL,
                validation_fn=self._validate_database_url,
                description="Validate database URL format and security",
                critical_path=True
            )
        )
        
        # JWT Secret validation
        self.add_validation_rule(
            ConfigValidationRule(
                key="JWT_SECRET_KEY",
                risk_level=ConfigRiskLevel.CRITICAL,
                validation_fn=self._validate_jwt_secret,
                description="Validate JWT secret security",
                critical_path=True
            )
        )
        
        # Beta mode validation
        self.add_validation_rule(
            ConfigValidationRule(
                key="BETA_MODE",
                risk_level=ConfigRiskLevel.HIGH,
                validation_fn=self._validate_beta_mode,
                description="Validate beta mode configuration",
                critical_path=True
            )
        )
        
    def add_validation_rule(self, rule: ConfigValidationRule):
        """Add a validation rule"""
        if rule.key not in self._validation_rules:
            self._validation_rules[rule.key] = []
        self._validation_rules[rule.key].append(rule)
        
    async def validate_config_value(
        self,
        key: str,
        value: Any
    ) -> tuple[bool, Optional[str]]:
        """Validate configuration value against rules"""
        if key not in self._validation_rules:
            return True, None
            
        validation_id = await self._critical_validation.start_validation(
            f"config_validation_{key}",
            "high"
        )
        
        try:
            for rule in self._validation_rules[key]:
                is_valid = await rule.validation_fn(value)
                if not is_valid:
                    await self._record_violation(key, rule, value)
                    await self._critical_validation.complete_validation(
                        validation_id,
                        "failed"
                    )
                    return False, f"Failed validation: {rule.description}"
                    
            await self._critical_validation.complete_validation(
                validation_id,
                "success"
            )
            return True, None
            
        except Exception as e:
            await self._critical_validation.complete_validation(
                validation_id,
                "error"
            )
            self.logger.error(
                f"Validation error for {key}",
                error=str(e)
            )
            return False, str(e)
            
    async def _record_violation(
        self,
        key: str,
        rule: ConfigValidationRule,
        value: Any
    ):
        """Record a configuration violation"""
        violation = {
            "timestamp": datetime.utcnow().isoformat(),
            "key": key,
            "risk_level": rule.risk_level.value,
            "description": rule.description,
            "critical_path": rule.critical_path
        }
        
        self._violations.append(violation)
        
        if rule.risk_level in [ConfigRiskLevel.HIGH, ConfigRiskLevel.CRITICAL]:
            self.logger.error(
                "Critical configuration violation",
                violation=violation
            )
            
    def track_access(self, key: str):
        """Track configuration access patterns"""
        if key not in self._access_patterns:
            self._access_patterns[key] = []
        self._access_patterns[key].append(datetime.utcnow())
        
    async def get_monitoring_metrics(self) -> Dict:
        """Get configuration monitoring metrics"""
        now = datetime.utcnow()
        hour_ago = now - timedelta(hours=1)
        
        metrics = {
            "access_patterns": {},
            "violations": {
                "total": len(self._violations),
                "critical": len([v for v in self._violations 
                               if v["risk_level"] in 
                               [ConfigRiskLevel.HIGH.value, 
                                ConfigRiskLevel.CRITICAL.value]]),
                "recent": len([v for v in self._violations 
                             if datetime.fromisoformat(v["timestamp"]) > hour_ago])
            },
            "critical_path_status": "healthy",
            "timestamp": now.isoformat()
        }
        
        # Calculate access patterns
        for key, accesses in self._access_patterns.items():
            recent_accesses = [a for a in accesses if a > hour_ago]
            metrics["access_patterns"][key] = {
                "total": len(accesses),
                "recent": len(recent_accesses),
                "last_access": accesses[-1].isoformat() if accesses else None
            }
            
        return metrics
        
    # Validation functions
    @staticmethod
    async def _validate_database_url(url: str) -> bool:
        """Validate database URL"""
        if not url:
            return False
        if not any(url.startswith(prefix) for prefix in 
                  ["postgresql://", "mysql://", "sqlite:///"]):
            return False
        return True
        
    @staticmethod
    async def _validate_jwt_secret(secret: str) -> bool:
        """Validate JWT secret"""
        return bool(secret and len(secret) >= 32)
        
    @staticmethod
    async def _validate_beta_mode(mode: bool) -> bool:
        """Validate beta mode"""
        return isinstance(mode, bool)

# Global instance
config_monitor = ConfigurationMonitor()
