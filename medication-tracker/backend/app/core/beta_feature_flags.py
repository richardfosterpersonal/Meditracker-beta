"""
Beta Feature Flag System
Controls feature availability and rollout for beta testing
Last Updated: 2025-01-01T21:47:34+01:00
"""

from typing import Dict, List, Optional, Set
from enum import Enum
import json
import asyncio
from datetime import datetime
import logging
from pathlib import Path

from .pre_validation_requirements import (
    PreValidationRequirement,
    BetaValidationStatus,
    BetaValidationPriority,
    BetaValidationType,
    BetaValidationScope,
    BetaValidationResult
)

logger = logging.getLogger(__name__)

class BetaFeatureStatus(Enum):
    """Status of beta features"""
    DISABLED = "disabled"
    ALPHA = "alpha"  # Internal testing only
    BETA_LIMITED = "beta_limited"  # Small group of beta users
    BETA_FULL = "beta_full"  # All beta users
    GRADUATED = "graduated"  # Ready for production

class BetaFeature:
    """Represents a beta feature with its configuration"""
    
    def __init__(
        self,
        name: str,
        status: BetaFeatureStatus,
        description: str,
        dependencies: List[str],
        rollout_percentage: float = 0.0,
        allowed_users: Optional[Set[str]] = None,
        metrics: Optional[List[str]] = None,
        validation_requirements: Optional[List[PreValidationRequirement]] = None
    ):
        self.name = name
        self.status = status
        self.description = description
        self.dependencies = dependencies
        self.rollout_percentage = max(0.0, min(100.0, rollout_percentage))
        self.allowed_users = allowed_users or set()
        self.metrics = metrics or []
        self.validation_requirements = validation_requirements or []
        self.created_at = datetime.utcnow().isoformat()
        self.last_updated = self.created_at
        self.error_count = 0
        self.usage_count = 0

class BetaFeatureFlagManager:
    """Manages beta feature flags and their states"""
    
    def __init__(self):
        self.features: Dict[str, BetaFeature] = {}
        self._lock = asyncio.Lock()
        self.config_path = Path("config/beta_features.json")
        self.load_features()
        
    def load_features(self) -> None:
        """Load feature configurations from file"""
        try:
            if self.config_path.exists():
                with open(self.config_path) as f:
                    data = json.load(f)
                    for feature_data in data["features"]:
                        feature = BetaFeature(
                            name=feature_data["name"],
                            status=BetaFeatureStatus(feature_data["status"]),
                            description=feature_data["description"],
                            dependencies=feature_data["dependencies"],
                            rollout_percentage=feature_data.get("rollout_percentage", 0.0),
                            allowed_users=set(feature_data.get("allowed_users", [])),
                            metrics=feature_data.get("metrics", []),
                            validation_requirements=[
                                PreValidationRequirement(req)
                                for req in feature_data.get("validation_requirements", [])
                            ]
                        )
                        self.features[feature.name] = feature
        except Exception as e:
            logger.error(f"Failed to load beta features: {str(e)}")
            raise
            
    async def save_features(self) -> None:
        """Save feature configurations to file"""
        async with self._lock:
            try:
                self.config_path.parent.mkdir(parents=True, exist_ok=True)
                data = {
                    "last_updated": datetime.utcnow().isoformat(),
                    "features": [
                        {
                            "name": feature.name,
                            "status": feature.status.value,
                            "description": feature.description,
                            "dependencies": feature.dependencies,
                            "rollout_percentage": feature.rollout_percentage,
                            "allowed_users": list(feature.allowed_users),
                            "metrics": feature.metrics,
                            "validation_requirements": [
                                req.value for req in feature.validation_requirements
                            ],
                            "created_at": feature.created_at,
                            "last_updated": feature.last_updated,
                            "error_count": feature.error_count,
                            "usage_count": feature.usage_count
                        }
                        for feature in self.features.values()
                    ]
                }
                
                with open(self.config_path, "w") as f:
                    json.dump(data, f, indent=2)
                    
            except Exception as e:
                logger.error(f"Failed to save beta features: {str(e)}")
                raise
                
    async def add_feature(self, feature: BetaFeature) -> None:
        """Add a new beta feature"""
        async with self._lock:
            if feature.name in self.features:
                raise ValueError(f"Feature {feature.name} already exists")
                
            self.features[feature.name] = feature
            await self.save_features()
            
    async def update_feature(self, name: str, **kwargs) -> None:
        """Update an existing beta feature"""
        async with self._lock:
            if name not in self.features:
                raise ValueError(f"Feature {name} does not exist")
                
            feature = self.features[name]
            for key, value in kwargs.items():
                if hasattr(feature, key):
                    setattr(feature, key, value)
                    
            feature.last_updated = datetime.utcnow().isoformat()
            await self.save_features()
            
    async def remove_feature(self, name: str) -> None:
        """Remove a beta feature"""
        async with self._lock:
            if name not in self.features:
                raise ValueError(f"Feature {name} does not exist")
                
            del self.features[name]
            await self.save_features()
            
    def is_feature_enabled(self, name: str, user_id: Optional[str] = None) -> bool:
        """Check if a feature is enabled for a user"""
        if name not in self.features:
            return False
            
        feature = self.features[name]
        
        # Check feature status
        if feature.status == BetaFeatureStatus.DISABLED:
            return False
            
        if feature.status == BetaFeatureStatus.GRADUATED:
            return True
            
        # Check user access
        if user_id and feature.allowed_users:
            return user_id in feature.allowed_users
            
        # Check rollout percentage
        if feature.rollout_percentage <= 0:
            return False
            
        if feature.rollout_percentage >= 100:
            return True
            
        # TODO: Implement percentage-based rollout logic
        return False
        
    async def validate_feature(self, name: str) -> BetaValidationResult:
        """Validate a beta feature"""
        if name not in self.features:
            return BetaValidationResult(
                requirement=PreValidationRequirement.BETA_FEATURE_FLAGS_READY,
                status=BetaValidationStatus.FAILED,
                priority=BetaValidationPriority.HIGH,
                validation_type=BetaValidationType.FEATURE_FLAG,
                scope=BetaValidationScope.FEATURE,
                message=f"Feature {name} does not exist",
                timestamp=datetime.utcnow().isoformat()
            )
            
        feature = self.features[name]
        
        # Validate dependencies
        for dep in feature.dependencies:
            if dep not in self.features:
                return BetaValidationResult(
                    requirement=PreValidationRequirement.BETA_FEATURE_FLAGS_READY,
                    status=BetaValidationStatus.FAILED,
                    priority=BetaValidationPriority.HIGH,
                    validation_type=BetaValidationType.FEATURE_FLAG,
                    scope=BetaValidationScope.FEATURE,
                    message=f"Dependency {dep} not found for feature {name}",
                    timestamp=datetime.utcnow().isoformat(),
                    corrective_action=f"Add missing dependency {dep}"
                )
                
        # Validate requirements
        for req in feature.validation_requirements:
            # TODO: Implement requirement validation logic
            pass
            
        return BetaValidationResult(
            requirement=PreValidationRequirement.BETA_FEATURE_FLAGS_READY,
            status=BetaValidationStatus.PASSED,
            priority=BetaValidationPriority.HIGH,
            validation_type=BetaValidationType.FEATURE_FLAG,
            scope=BetaValidationScope.FEATURE,
            message=f"Feature {name} validation passed",
            timestamp=datetime.utcnow().isoformat()
        )
        
    async def validate_all_features(self) -> List[BetaValidationResult]:
        """Validate all beta features"""
        results = []
        for name in self.features:
            results.append(await self.validate_feature(name))
        return results
