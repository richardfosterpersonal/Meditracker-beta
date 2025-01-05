"""
Critical Path Validation Script
Last Updated: 2024-12-25T21:53:39+01:00
Status: ACTIVE
Reference: ../../docs/validation/critical_path/MASTER_CRITICAL_PATH.md
"""

import os
import sys
import logging
from datetime import datetime
from pathlib import Path

# Add parent directory to path
sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from app.core.unified_critical_path import UnifiedCriticalPath, AppComponent, AppPhase
from app.validation.core import ValidationCore
from app.services.interaction_monitor_service import InteractionMonitorService

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

class CriticalPathValidator:
    """Validates critical path components after dependency updates."""
    
    def __init__(self):
        self.critical_path = UnifiedCriticalPath()
        self.validator = ValidationCore()
        self.monitor = InteractionMonitorService()
        
    async def validate_all(self):
        """Run all critical path validations."""
        results = {
            'timestamp': datetime.utcnow().isoformat(),
            'status': 'pending',
            'components': {}
        }
        
        # 1. Security Validation
        results['components']['security'] = await self.critical_path.validate_app_state(
            AppPhase.PRODUCTION,
            AppComponent.SECURITY,
            {'check_dependencies': True}
        )
        
        # 2. Data Integrity
        results['components']['data'] = await self.critical_path.validate_app_state(
            AppPhase.PRODUCTION,
            AppComponent.VALIDATION,
            {'check_data_consistency': True}
        )
        
        # 3. Monitoring Systems
        results['components']['monitoring'] = await self.critical_path.validate_app_state(
            AppPhase.PRODUCTION,
            AppComponent.MONITORING,
            {'verify_metrics': True}
        )
        
        # Check overall status
        failed_components = [
            comp for comp, result in results['components'].items()
            if not result.is_valid
        ]
        
        results['status'] = 'failed' if failed_components else 'passed'
        if failed_components:
            logger.error(f"Validation failed for components: {failed_components}")
        
        return results

    def save_evidence(self, results):
        """Save validation evidence."""
        evidence_path = Path("docs/validation/evidence")
        evidence_path.mkdir(parents=True, exist_ok=True)
        
        timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")
        evidence_file = evidence_path / f"critical_path_validation_{timestamp}.json"
        
        with open(evidence_file, 'w') as f:
            json.dump(results, f, indent=2)
        
        logger.info(f"Validation evidence saved to {evidence_file}")

async def main():
    """Main validation function."""
    validator = CriticalPathValidator()
    
    try:
        logger.info("Starting critical path validation...")
        results = await validator.validate_all()
        
        validator.save_evidence(results)
        
        if results['status'] == 'failed':
            sys.exit(1)
            
        logger.info("Critical path validation completed successfully")
        
    except Exception as e:
        logger.error(f"Critical path validation failed: {str(e)}")
        sys.exit(1)

if __name__ == "__main__":
    import asyncio
    asyncio.run(main())
