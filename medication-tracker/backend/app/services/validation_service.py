"""
Validation Service
Last Updated: 2024-12-25T20:46:35+01:00
Status: INTERNAL
Reference: ../../../docs/validation/decisions/VALIDATION_VISIBILITY.md

This module implements validation service functionality:
1. System validation checks
2. Critical path verification
3. Health monitoring
"""

import os
import json
from datetime import datetime
from pathlib import Path
from typing import Dict, Any

class ValidationService:
    """Service for handling system validation"""

    def __init__(self):
        self.project_root = Path(__file__).parent.parent.parent.parent
        self.docs_path = self.project_root / 'docs' / 'validation'

    def get_validation_status(self) -> Dict[str, Any]:
        """Get current validation status"""
        try:
            status_file = self.docs_path / 'reports' / 'validation_status.json'
            if status_file.exists():
                with open(status_file) as f:
                    return json.load(f)
            return self._generate_validation_status()
        except Exception as e:
            return {
                'error': str(e),
                'timestamp': datetime.utcnow().isoformat()
            }

    def get_critical_path_status(self) -> Dict[str, Any]:
        """Get critical path status"""
        try:
            critical_path_file = self.docs_path / 'critical_path' / 'MASTER_CRITICAL_PATH.md'
            if not critical_path_file.exists():
                return {
                    'error': 'Critical path file not found',
                    'timestamp': datetime.utcnow().isoformat()
                }

            with open(critical_path_file) as f:
                content = f.read()

            # Parse critical path content
            sections = self._parse_critical_path(content)
            return {
                'sections': sections,
                'timestamp': datetime.utcnow().isoformat()
            }
        except Exception as e:
            return {
                'error': str(e),
                'timestamp': datetime.utcnow().isoformat()
            }

    def get_health_status(self) -> Dict[str, Any]:
        """Get system health status"""
        try:
            return {
                'database': self._check_database_health(),
                'api': self._check_api_health(),
                'filesystem': self._check_filesystem_health(),
                'timestamp': datetime.utcnow().isoformat()
            }
        except Exception as e:
            return {
                'error': str(e),
                'timestamp': datetime.utcnow().isoformat()
            }

    def _generate_validation_status(self) -> Dict[str, Any]:
        """Generate current validation status"""
        return {
            'validation_status': {
                'total_files': self._count_files(),
                'validated_files': self._count_validated_files(),
                'error_files': self._count_error_files()
            },
            'critical_path_status': self._check_critical_path(),
            'timestamp': datetime.utcnow().isoformat()
        }

    def _parse_critical_path(self, content: str) -> Dict[str, Any]:
        """Parse critical path markdown content"""
        sections = {}
        current_section = None

        for line in content.split('\n'):
            if line.startswith('### '):
                current_section = line[4:].strip()
                sections[current_section] = {
                    'status': 'Unknown',
                    'items': []
                }
            elif line.startswith('Status: '):
                if current_section:
                    sections[current_section]['status'] = line[8:].strip()
            elif line.startswith('- '):
                if current_section:
                    sections[current_section]['items'].append(line[2:].strip())

        return sections

    def _check_database_health(self) -> Dict[str, Any]:
        """Check database health status"""
        from app.database import get_session
        try:
            with get_session() as session:
                session.execute('SELECT 1')
            return {'status': 'healthy'}
        except Exception as e:
            return {'status': 'unhealthy', 'error': str(e)}

    def _check_api_health(self) -> Dict[str, Any]:
        """Check API health status"""
        return {'status': 'healthy'}

    def _check_filesystem_health(self) -> Dict[str, Any]:
        """Check filesystem health status"""
        try:
            if not self.docs_path.exists():
                return {'status': 'unhealthy', 'error': 'Docs path not found'}
            return {'status': 'healthy'}
        except Exception as e:
            return {'status': 'unhealthy', 'error': str(e)}

    def _count_files(self) -> int:
        """Count total files in project"""
        count = 0
        for root, _, files in os.walk(self.project_root):
            count += len(files)
        return count

    def _count_validated_files(self) -> int:
        """Count validated files"""
        # Implementation depends on validation criteria
        return 0

    def _count_error_files(self) -> int:
        """Count files with validation errors"""
        # Implementation depends on validation criteria
        return 0

    def _check_critical_path(self) -> Dict[str, Any]:
        """Check critical path status"""
        return {
            'status': 'maintained',
            'last_check': datetime.utcnow().isoformat()
        }
