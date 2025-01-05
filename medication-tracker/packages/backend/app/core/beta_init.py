"""
Beta Testing Initialization
Initializes and starts the beta testing process
Last Updated: 2025-01-01T19:14:16+01:00
"""

import asyncio
import logging
from datetime import datetime
from pathlib import Path
from typing import Dict, Any

from .beta_settings import BetaSettings
from .beta_critical_path_orchestrator import BetaCriticalPathOrchestrator
from .beta_startup import BetaStartup
from .beta_phase_hooks import BetaPhaseHooks, HookType
from .beta_validation_orchestrator import BetaValidationOrchestrator
from .beta_monitoring import BetaMonitoring
from .beta_data_collector import BetaDataCollector

logger = logging.getLogger(__name__)

class BetaInitializer:
    """Initializes beta testing environment and starts the process"""
    
    def __init__(self):
        self.settings = BetaSettings()
        self.orchestrator = BetaCriticalPathOrchestrator(self.settings)
        self.startup = BetaStartup()
        self.hooks = BetaPhaseHooks()
        self.validation = BetaValidationOrchestrator()
        self.monitoring = BetaMonitoring()
        self.data_collector = BetaDataCollector()
        
    async def initialize_beta(self) -> Dict[str, Any]:
        """Initialize beta testing environment"""
        try:
            logger.info("Starting beta environment initialization")
            
            # Step 1: Validate environment
            env_validation = await self.startup.validate_environment()
            if not all(env_validation.values()):
                return {
                    "success": False,
                    "error": "Environment validation failed",
                    "details": env_validation
                }
                
            logger.info("Environment validation successful")
            
            # Step 2: Initialize critical path
            await self.orchestrator.initialize_critical_path()
            logger.info("Critical path initialized")
            
            # Step 3: Register phase hooks
            self._register_phase_hooks()
            logger.info("Phase hooks registered")
            
            # Step 4: Start monitoring
            await self.monitoring.start_monitoring()
            logger.info("Monitoring system started")
            
            # Step 5: Initialize data collection
            await self.data_collector.initialize()
            logger.info("Data collection initialized")
            
            # Step 6: Start onboarding phase
            phase_result = await self.orchestrator.start_phase("ONBOARDING")
            if not phase_result["success"]:
                return {
                    "success": False,
                    "error": "Failed to start onboarding phase",
                    "details": phase_result
                }
                
            logger.info("Onboarding phase started")
            
            return {
                "success": True,
                "message": "Beta testing environment initialized successfully",
                "timestamp": datetime.utcnow().isoformat(),
                "phase": "ONBOARDING",
                "status": "ready"
            }
            
        except Exception as e:
            logger.error(f"Beta initialization failed: {str(e)}")
            return {
                "success": False,
                "error": "Beta initialization failed",
                "details": str(e)
            }
            
    def _register_phase_hooks(self) -> None:
        """Register phase transition hooks"""
        # Pre-transition hooks
        self.hooks.register_hook(
            "ONBOARDING",
            HookType.PRE_TRANSITION,
            self.validation.validate_onboarding_readiness
        )
        
        self.hooks.register_hook(
            "CORE_FEATURES",
            HookType.PRE_TRANSITION,
            self.validation.validate_core_functionality
        )
        
        self.hooks.register_hook(
            "DATA_SAFETY",
            HookType.PRE_TRANSITION,
            self.validation.validate_data_safety
        )
        
        self.hooks.register_hook(
            "USER_EXPERIENCE",
            HookType.PRE_TRANSITION,
            self.validation.validate_user_experience
        )
        
        # Post-transition hooks
        self.hooks.register_hook(
            "ONBOARDING",
            HookType.POST_TRANSITION,
            self.monitoring.start_phase_monitoring
        )
        
        self.hooks.register_hook(
            "CORE_FEATURES",
            HookType.POST_TRANSITION,
            self.monitoring.start_feature_monitoring
        )
        
        self.hooks.register_hook(
            "DATA_SAFETY",
            HookType.POST_TRANSITION,
            self.monitoring.start_safety_monitoring
        )
        
        self.hooks.register_hook(
            "USER_EXPERIENCE",
            HookType.POST_TRANSITION,
            self.monitoring.start_ux_monitoring
        )
        
        # Validation hooks
        self.hooks.register_hook(
            "ONBOARDING",
            HookType.VALIDATION,
            self.validation.collect_onboarding_evidence
        )
        
        self.hooks.register_hook(
            "CORE_FEATURES",
            HookType.VALIDATION,
            self.validation.collect_feature_evidence
        )
        
        self.hooks.register_hook(
            "DATA_SAFETY",
            HookType.VALIDATION,
            self.validation.collect_safety_evidence
        )
        
        self.hooks.register_hook(
            "USER_EXPERIENCE",
            HookType.VALIDATION,
            self.validation.collect_ux_evidence
        )

# Create singleton instance
beta_initializer = BetaInitializer()
