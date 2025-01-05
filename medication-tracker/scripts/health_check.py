"""
Health Check Script
Critical Path: BETA-LAUNCH-HEALTH
Last Updated: 2025-01-02T13:49:32+01:00

Performs comprehensive health checks during beta launch.
"""

import sys
import logging
import requests
from typing import Dict, Any, List
from datetime import datetime, timezone
from pathlib import Path

from backend.app.core.unified_validation_framework import UnifiedValidationFramework
from backend.app.exceptions import ValidationError

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s [%(levelname)s] %(message)s',
    handlers=[
        logging.FileHandler('health_check.log'),
        logging.StreamHandler(sys.stdout)
    ]
)

logger = logging.getLogger(__name__)

class HealthCheck:
    """Performs comprehensive system health checks"""
    
    def __init__(self):
        self.validation_framework = UnifiedValidationFramework()
        self.check_results: Dict[str, Any] = {}
        self.timestamp = datetime.now(timezone.utc).isoformat()
        
    def run_checks(self) -> bool:
        """Run all health checks"""
        logger.info("Starting health checks")
        
        try:
            # Run unified validation
            self.validation_framework.validate({
                'timestamp': self.timestamp,
                'check_type': 'health',
                'stage': 'beta_launch'
            })
            
            # Run specific health checks
            self._check_api_health()
            self._check_database_health()
            self._check_monitoring_system()
            self._check_security_system()
            
            self._save_results()
            return True
            
        except Exception as e:
            logger.error(f"Health check failed: {str(e)}")
            return False
            
    def _check_api_health(self) -> None:
        """Check API endpoints health"""
        endpoints = [
            '/api/health',
            '/api/medications',
            '/api/notifications',
            '/api/users/status'
        ]
        
        results = {}
        for endpoint in endpoints:
            try:
                response = requests.get(f'http://localhost:5000{endpoint}')
                results[endpoint] = {
                    'status': response.status_code,
                    'response_time': response.elapsed.total_seconds() * 1000
                }
            except Exception as e:
                results[endpoint] = {
                    'status': 'error',
                    'error': str(e)
                }
                
        self.check_results['api_health'] = results
        
    def _check_database_health(self) -> None:
        """Check database health"""
        from backend.app.infrastructure.database import get_db
        
        try:
            db = next(get_db())
            result = db.execute("SELECT 1").fetchone()
            self.check_results['database_health'] = {
                'status': 'healthy' if result[0] == 1 else 'unhealthy',
                'timestamp': self.timestamp
            }
        except Exception as e:
            self.check_results['database_health'] = {
                'status': 'error',
                'error': str(e),
                'timestamp': self.timestamp
            }
            
    def _check_monitoring_system(self) -> None:
        """Check monitoring system health"""
        try:
            # Check monitoring endpoints
            response = requests.get('http://localhost:5000/api/metrics')
            
            self.check_results['monitoring_system'] = {
                'status': 'healthy' if response.status_code == 200 else 'unhealthy',
                'metrics_available': response.status_code == 200,
                'timestamp': self.timestamp
            }
            
        except Exception as e:
            self.check_results['monitoring_system'] = {
                'status': 'error',
                'error': str(e),
                'timestamp': self.timestamp
            }
            
    def _check_security_system(self) -> None:
        """Check security system health"""
        try:
            # Verify security configurations
            security_checks = {
                'jwt_secret': bool(self._get_env('JWT_SECRET')),
                'database_url': bool(self._get_env('DATABASE_URL')),
                'api_key': bool(self._get_env('API_KEY'))
            }
            
            self.check_results['security_system'] = {
                'status': 'healthy' if all(security_checks.values()) else 'unhealthy',
                'checks': security_checks,
                'timestamp': self.timestamp
            }
            
        except Exception as e:
            self.check_results['security_system'] = {
                'status': 'error',
                'error': str(e),
                'timestamp': self.timestamp
            }
            
    def _get_env(self, key: str) -> str:
        """Safely get environment variable"""
        import os
        return os.getenv(key, '')
        
    def _save_results(self) -> None:
        """Save health check results"""
        output_dir = Path('health_checks')
        output_dir.mkdir(exist_ok=True)
        
        output_file = output_dir / f'health_check_{self.timestamp}.json'
        
        import json
        with open(output_file, 'w') as f:
            json.dump(
                {
                    'timestamp': self.timestamp,
                    'results': self.check_results
                },
                f,
                indent=2
            )
            
def main():
    """Main entry point for health checks"""
    try:
        health_check = HealthCheck()
        if health_check.run_checks():
            logger.info("Health checks completed successfully")
            return 0
        else:
            logger.error("Health checks failed")
            return 1
            
    except Exception as e:
        logger.critical(f"Unhandled exception during health checks: {str(e)}")
        return 2
        
if __name__ == '__main__':
    sys.exit(main())
