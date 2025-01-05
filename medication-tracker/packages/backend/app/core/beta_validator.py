"""
Beta Validator
Last Updated: 2024-12-27T20:18:32+01:00
Critical Path: Beta Validation
"""

from typing import Dict, Any
import logging

from .settings import settings
from .hooks.validation_hooks import ValidationEvent, hook_manager
from .models import ValidationResult

logger = logging.getLogger(__name__)

class BetaValidator:
    """Validates beta readiness"""
    
    def __init__(self):
        self._setup_validation_hooks()
    
    def _setup_validation_hooks(self):
        """Setup validation hooks for beta readiness"""
        # Register beta validation hooks
        hook_manager.register_hook(
            ValidationEvent.BETA_VALIDATION,
            self._validate_beta_components
        )
    
    async def validate_beta_readiness(self) -> bool:
        """Validate beta readiness"""
        try:
            # Execute beta validation hooks
            context = {'component': 'beta'}
            hook_results = await hook_manager.run_hooks(
                ValidationEvent.BETA_VALIDATION,
                context=dict(context)
            )
            
            # Aggregate results
            is_valid = all(result.is_valid for result in hook_results)
            messages = [result.message for result in hook_results]
            
            if not is_valid:
                logger.error("\n".join(messages))
                return False
            
            logger.info("Beta validation successful")
            return True
            
        except Exception as e:
            logger.error(f"Beta validation error: {str(e)}")
            return False
    
    async def _validate_beta_components(self, context: Dict[str, Any]) -> ValidationResult:
        """Validate beta components"""
        try:
            # Check beta mode is enabled
            if not settings.BETA_MODE:
                return ValidationResult(
                    is_valid=False,
                    message="Beta mode is not enabled"
                )
            
            # Check beta access key is set
            if not settings.BETA_ACCESS_KEY:
                return ValidationResult(
                    is_valid=False,
                    message="Beta access key is not set"
                )
            
            # Check validation interval is set
            if not settings.BETA_VALIDATION_INTERVAL:
                return ValidationResult(
                    is_valid=False,
                    message="Beta validation interval is not set"
                )
            
            # Check backup interval is set
            if not settings.BETA_BACKUP_INTERVAL:
                return ValidationResult(
                    is_valid=False,
                    message="Beta backup interval is not set"
                )
            
            # Check required beta features
            required_features = [
                settings.BETA_USER_VALIDATION,
                settings.BETA_ACCESS_CONTROL,
                settings.BETA_AUDIT_LOGGING,
                settings.BETA_FEATURE_FLAGS
            ]
            
            if not all(required_features):
                return ValidationResult(
                    is_valid=False,
                    message="Not all required beta features are enabled"
                )
            
            return ValidationResult(
                is_valid=True,
                message="All beta components validated successfully"
            )
            
        except Exception as e:
            logger.error(f"Beta component validation error: {str(e)}")
            return ValidationResult(
                is_valid=False,
                message=f"Beta validation error: {str(e)}"
            )

# Create singleton instance
beta_validator = BetaValidator()
