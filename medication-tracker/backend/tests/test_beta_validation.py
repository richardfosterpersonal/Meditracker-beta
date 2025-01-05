"""
Beta Validation Test Suite
Tests for beta testing validation infrastructure
Last Updated: 2024-12-30T21:57:46+01:00
"""

import pytest
import os
import json
from datetime import datetime
from typing import Dict

from app.core.beta_requirements_validator import BetaRequirementsValidator
from app.core.beta_validation_evidence import BetaValidationEvidence
from app.core.beta_critical_path import BetaCriticalPath
from app.core.settings import settings

@pytest.fixture
async def beta_validator():
    """Beta requirements validator fixture"""
    return BetaRequirementsValidator()

@pytest.fixture
async def evidence_collector():
    """Beta validation evidence collector fixture"""
    return BetaValidationEvidence()

@pytest.fixture
async def critical_path():
    """Beta critical path fixture"""
    return BetaCriticalPath()

class TestBetaValidation:
    """Test beta validation infrastructure"""
    
    @pytest.mark.asyncio
    async def test_core_functionality_validation(self, beta_validator):
        """Test core functionality validation"""
        # Test data
        data = {
            "medication_crud": {
                "create_success": 100,
                "create_total": 100,
                "read_success": 99,
                "read_total": 100,
                "update_success": 98,
                "update_total": 100,
                "delete_success": 99,
                "delete_total": 100
            },
            "scheduling": {
                "schedule_success": 995,
                "schedule_total": 1000,
                "reminder_success": 990,
                "reminder_total": 1000
            }
        }
        
        # Validate
        result = await beta_validator.validate_core_functionality(data)
        
        # Assert
        assert result["valid"] == True
        assert "results" in result
        assert all(v["valid"] for v in result["results"].values())
        
    @pytest.mark.asyncio
    async def test_performance_validation(self, beta_validator):
        """Test performance validation"""
        # Test data
        data = {
            "api_response": {
                "p95_response_time": 450,
                "p99_response_time": 800
            },
            "resource_usage": {
                "memory_usage": 75,
                "cpu_usage": 65
            }
        }
        
        # Validate
        result = await beta_validator.validate_performance_requirements(data)
        
        # Assert
        assert result["valid"] == True
        assert "results" in result
        assert all(v["valid"] for v in result["results"].values())
        
    @pytest.mark.asyncio
    async def test_user_experience_validation(self, beta_validator):
        """Test user experience validation"""
        # Test data
        data = {
            "navigation": {
                "completion_success": 96,
                "completion_total": 100
            },
            "accessibility": {
                "screen_reader_score": 0.96,
                "keyboard_score": 0.97,
                "contrast_score": 0.99
            }
        }
        
        # Validate
        result = await beta_validator.validate_user_experience(data)
        
        # Assert
        assert result["valid"] == True
        assert "results" in result
        assert all(v["valid"] for v in result["results"].values())
        
    @pytest.mark.asyncio
    async def test_evidence_collection(self, evidence_collector):
        """Test validation evidence collection"""
        # Test data
        phase = "internal"
        component = "core_functionality"
        data = {
            "medication_crud": {
                "success_rate": 0.99
            }
        }
        
        # Collect evidence
        result = await evidence_collector.collect_validation_evidence(
            phase,
            component,
            data
        )
        
        # Assert
        assert result["success"] == True
        assert "validation_id" in result
        assert "evidence" in result
        assert os.path.exists(os.path.join(
            settings.BETA_EVIDENCE_PATH,
            f"evidence_{result['validation_id']}.json"
        ))
        
    @pytest.mark.asyncio
    async def test_evidence_chain_verification(self, evidence_collector):
        """Test evidence chain verification"""
        # Setup test evidence
        phase = "internal"
        components = ["core_functionality", "safety_checks"]
        
        for component in components:
            await evidence_collector.collect_validation_evidence(
                phase,
                component,
                {"test": "data"}
            )
            
        # Verify chain
        result = await evidence_collector.verify_evidence_chain(phase)
        
        # Assert
        assert result["valid"] == True
        assert "verifications" in result
        assert len(result["verifications"]) == len(components)
        
    @pytest.mark.asyncio
    async def test_evidence_report_generation(self, evidence_collector):
        """Test evidence report generation"""
        # Setup test evidence
        phase = "internal"
        components = ["core_functionality", "safety_checks"]
        
        for component in components:
            await evidence_collector.collect_validation_evidence(
                phase,
                component,
                {"test": "data"}
            )
            
        # Generate report
        result = await evidence_collector.generate_evidence_report(phase)
        
        # Assert
        assert result["success"] == True
        assert "report" in result
        assert "report_path" in result
        assert os.path.exists(result["report_path"])
        
        # Verify report content
        with open(result["report_path"], 'r') as f:
            report = json.load(f)
            assert report["phase"] == phase
            assert "requirements" in report
            assert "validations" in report
            assert "summary" in report
            
    @pytest.mark.asyncio
    async def test_critical_path_monitoring(self, critical_path):
        """Test critical path monitoring"""
        # Test data
        user_id = "test_user"
        
        # Monitor critical path
        result = await critical_path.monitor_critical_path(user_id)
        
        # Assert
        assert "user_id" in result
        assert "phase" in result
        assert "completed_validations" in result
        assert "missing_validations" in result
        assert "validation_status" in result
        
    @pytest.mark.asyncio
    async def test_graduation_criteria(self, critical_path):
        """Test graduation criteria validation"""
        # Test data
        user_id = "test_user"
        
        # Validate graduation criteria
        result = await critical_path.validate_graduation_criteria(user_id)
        
        # Assert
        assert "status" in result
        assert "metrics" in result
        assert "timestamp" in result
