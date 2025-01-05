"""
Reliability Validation Module
Critical Path: Runtime.Validation

This module handles runtime validation after services are started.
It works in conjunction with preflight validation but focuses on runtime aspects.
"""

import os
import sys
import logging
import sqlite3
from datetime import datetime
from typing import Dict, Any, List, Optional
from pathlib import Path
from dataclasses import dataclass

logger = logging.getLogger(__name__)

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
)

@dataclass
class ValidationReport:
    """Result of a runtime validation check"""
    component: str
    status: bool
    message: str
    details: Optional[Dict] = None

class ReliabilityValidator:
    """Handles runtime reliability validation
    Critical Path: Runtime.Core
    
    Note: This validator assumes preflight validation has already passed.
    It focuses on runtime aspects like service health and API endpoints.
    """
    
    def __init__(self):
        self.reports: List[ValidationReport] = []
        self.timestamp = datetime.utcnow().isoformat()
        self.project_root = Path(__file__).parent.parent.parent.parent
        
    def validate_all(self, skip_endpoints: bool = False) -> List[ValidationReport]:
        """Run all runtime validations
        Critical Path: Runtime.Main
        
        Args:
            skip_endpoints: If True, skip endpoint validation (useful during startup)
        """
        self.reports = []
        
        # Note: We don't check environment or dependencies here
        # Those are handled by preflight validation
        validations = [
            self._validate_service_health,
            self._validate_database,
            self._validate_frontend_build
        ]
        
        if not skip_endpoints:
            validations.append(self._validate_endpoints)
            
        for validation in validations:
            try:
                report = validation()
                self.reports.append(report)
            except Exception as e:
                logger.error(f"Validation {validation.__name__} failed: {str(e)}")
                self.reports.append(
                    ValidationReport(
                        component=validation.__name__,
                        status=False,
                        message=f"Validation failed: {str(e)}"
                    )
                )
                
        return self.reports

    def _validate_service_health(self) -> ValidationReport:
        """Validate service health"""
        try:
            # Check database URL
            from ..core.config import get_settings
            settings = get_settings()
            if not settings.DATABASE_URL:
                return ValidationReport(
                    component="Database",
                    status=False,
                    message="DATABASE_URL not configured"
                )
            
            # Check database migrations
            alembic_ini = self.project_root / 'backend' / 'alembic.ini'
            if not alembic_ini.exists():
                return ValidationReport(
                    component="Database",
                    status=False,
                    message="alembic.ini not found"
                )
            
            # Validate database connection
            from sqlalchemy import create_engine, text
            engine = create_engine(settings.DATABASE_URL)
            with engine.connect() as conn:
                # Check connection
                conn.execute(text("SELECT 1"))
                
            return ValidationReport(
                component="Database",
                status=True,
                message="Database connection successful"
            )
        except Exception as e:
            return ValidationReport(
                component="Database",
                status=False,
                message=f"Database validation failed: {str(e)}"
            )

    def _validate_database(self) -> ValidationReport:
        """Validate database operations and integrity
        Critical Path: Database.Operations
        """
        try:
            # Validate database connection
            from ..core.config import get_settings
            settings = get_settings()
            engine = create_engine(settings.DATABASE_URL)
            with engine.connect() as conn:
                # Check tables
                tables = conn.execute(text("""
                    SELECT name FROM sqlite_master 
                    WHERE type='table' AND name NOT LIKE 'sqlite_%'
                """))
                table_count = len(list(tables))
                
            return ValidationReport(
                component="Database",
                status=True,
                message=f"Found {table_count} tables in database"
            )
        except Exception as e:
            return ValidationReport(
                component="Database",
                status=False,
                message=f"Database validation failed: {str(e)}"
            )

    def _validate_frontend_build(self) -> ValidationReport:
        """Validate frontend build configuration
        Critical Path: Frontend.Build
        """
        try:
            frontend_dir = self.project_root / 'frontend'
            
            # Check package.json
            package_json = frontend_dir / 'package.json'
            if not package_json.exists():
                return ValidationReport(
                    component="Frontend",
                    status=False,
                    message="package.json not found"
                )
            
            # Check build configuration
            config_files = [
                'tsconfig.json',
                'vite.config.ts',
                '.env',
                '.env.template'
            ]
            for config in config_files:
                if not (frontend_dir / config).exists():
                    return ValidationReport(
                        component="Frontend",
                        status=False,
                        message=f"{config} not found"
                    )
                    
            # Check source files
            src_dir = frontend_dir / 'src'
            if not src_dir.exists():
                return ValidationReport(
                    component="Frontend",
                    status=False,
                    message="src directory not found"
                )
            else:
                # Check critical components
                critical_files = [
                    'App.tsx',
                    'main.tsx',
                    'vite-env.d.ts'
                ]
                for file in critical_files:
                    if not (src_dir / file).exists():
                        return ValidationReport(
                            component="Frontend",
                            status=False,
                            message=f"{file} not found"
                        )
                        
            return ValidationReport(
                component="Frontend",
                status=True,
                message="Frontend build configuration validated"
            )
        except Exception as e:
            return ValidationReport(
                component="Frontend",
                status=False,
                message=f"Frontend build validation failed: {str(e)}"
            )

    def _validate_endpoints(self) -> ValidationReport:
        """Validate that critical endpoints are accessible"""
        import requests
        from urllib.parse import urljoin
        import time
        
        logger.info("Starting endpoint validation...")
        
        # Backend health check
        backend_url = "http://localhost:8000"
        max_retries = 5
        retry_delay = 2
        
        logger.info(f"Checking backend health at {backend_url}/health...")
        for attempt in range(max_retries):
            try:
                # Check health endpoint
                health_response = requests.get(
                    urljoin(backend_url, "/health"),
                    timeout=5
                )
                if health_response.status_code == 200:
                    logger.info("Backend health check passed")
                    return ValidationReport(
                        component="Backend",
                        status=True,
                        message="Backend health check passed"
                    )
                else:
                    logger.warning(f"Backend health check attempt {attempt + 1} failed with status {health_response.status_code}")
                    if attempt == max_retries - 1:
                        return ValidationReport(
                            component="Backend",
                            status=False,
                            message=f"Backend health check failed: {health_response.status_code}"
                        )
            except requests.exceptions.RequestException as e:
                logger.warning(f"Backend health check attempt {attempt + 1} failed: {str(e)}")
                if attempt == max_retries - 1:
                    return ValidationReport(
                        component="Backend",
                        status=False,
                        message=f"Backend not accessible: {str(e)}"
                    )
                else:
                    time.sleep(retry_delay)
                    
        # Frontend accessibility check
        frontend_url = "http://localhost:3000"
        logger.info(f"Checking frontend accessibility at {frontend_url}...")
        for attempt in range(max_retries):
            try:
                frontend_response = requests.get(
                    frontend_url,
                    timeout=5
                )
                if frontend_response.status_code == 200:
                    logger.info("Frontend accessibility check passed")
                    return ValidationReport(
                        component="Frontend",
                        status=True,
                        message="Frontend accessibility check passed"
                    )
                else:
                    logger.warning(f"Frontend check attempt {attempt + 1} failed with status {frontend_response.status_code}")
                    if attempt == max_retries - 1:
                        return ValidationReport(
                            component="Frontend",
                            status=False,
                            message=f"Frontend check failed: {frontend_response.status_code}"
                        )
            except requests.exceptions.RequestException as e:
                logger.warning(f"Frontend check attempt {attempt + 1} failed: {str(e)}")
                if attempt == max_retries - 1:
                    return ValidationReport(
                        component="Frontend",
                        status=False,
                        message=f"Frontend not accessible: {str(e)}"
                    )
                else:
                    time.sleep(retry_delay)
