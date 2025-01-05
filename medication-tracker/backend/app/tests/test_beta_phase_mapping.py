"""
Beta Phase Mapping Tests
Validates the mapping between critical path phases and beta phases
Last Updated: 2024-12-31T22:41:22+01:00
"""

import pytest
from datetime import datetime
import json
import os
import shutil
from pathlib import Path
from typing import Dict, List, Optional

from app.core.beta_critical_path_orchestrator import BetaCriticalPathOrchestrator
from app.core.beta_settings import BetaSettings
from app.core.beta_validation_evidence import BetaValidationEvidence

def validate_directory_structure(base_dir: Path, required_dirs: List[str]) -> Dict[str, bool]:
    """Validate directory structure exists and is accessible"""
    validation_results = {}
    
    # Check base directory
    if not base_dir.exists():
        validation_results["base_dir"] = False
        return validation_results
        
    # Check required subdirectories
    for dir_name in required_dirs:
        dir_path = base_dir / dir_name
        try:
            # Check directory exists and is writable
            validation_results[dir_name] = (
                dir_path.exists() and
                os.access(dir_path, os.W_OK)
            )
        except Exception:
            validation_results[dir_name] = False
            
    return validation_results

def validate_evidence_data(evidence_data: Dict) -> Dict[str, bool]:
    """Validate evidence data structure and required fields"""
    validation_results = {}
    
    required_fields = ["phase", "component", "status", "data"]
    required_phases = ["internal", "limited", "open"]
    required_statuses = ["verified"]
    
    for evidence_id, data in evidence_data.items():
        # Check required fields
        fields_valid = all(field in data for field in required_fields)
        
        # Check phase validity
        phase_valid = data.get("phase") in required_phases
        
        # Check status validity
        status_valid = data.get("status") in required_statuses
        
        # Check data field is dict
        data_valid = isinstance(data.get("data"), dict)
        
        validation_results[evidence_id] = {
            "fields_valid": fields_valid,
            "phase_valid": phase_valid,
            "status_valid": status_valid,
            "data_valid": data_valid,
            "valid": all([fields_valid, phase_valid, status_valid, data_valid])
        }
        
    return validation_results

class TestBetaPhaseMapping:
    """Test suite for beta phase mapping validation"""
    
    @pytest.fixture(autouse=True)
    def setup_test_directory(self):
        """Set up and validate test directory structure"""
        # Define test directory structure
        test_dir = Path("backend/data/beta")
        required_dirs = ["evidence", "feedback", "logs", "db"]
        
        # Clean up any existing test directory
        if test_dir.exists():
            shutil.rmtree(test_dir)
            
        # Create directory structure
        test_dir.mkdir(parents=True, exist_ok=True)
        for dir_name in required_dirs:
            (test_dir / dir_name).mkdir(exist_ok=True)
            
        # Validate directory structure
        validation_results = validate_directory_structure(test_dir, required_dirs)
        assert all(validation_results.values()), (
            f"Failed to create test directory structure: {validation_results}"
        )
        
        yield
        
        # Clean up after test
        if test_dir.exists():
            shutil.rmtree(test_dir)
    
    @pytest.fixture
    def orchestrator(self):
        """Create and validate test orchestrator"""
        orchestrator = BetaCriticalPathOrchestrator()
        
        # Validate phase mapping
        required_phases = ["ONBOARDING", "CORE_FEATURES", "DATA_SAFETY", "USER_EXPERIENCE"]
        valid_beta_phases = ["internal", "limited", "open"]
        
        for phase in required_phases:
            beta_phase = orchestrator.phase_mapping.get(phase)
            assert beta_phase is not None, f"Missing beta phase mapping for {phase}"
            assert beta_phase in valid_beta_phases, f"Invalid beta phase {beta_phase} for {phase}"
            
        return orchestrator
        
    @pytest.fixture
    def settings(self):
        """Create and validate test settings"""
        settings = BetaSettings()
        
        # Validate settings paths
        assert settings.BETA_BASE_PATH.exists(), "Beta base path does not exist"
        assert settings.EVIDENCE_PATH.exists(), "Evidence path does not exist"
        
        # Validate phase configurations
        for phase in ["internal", "limited", "open"]:
            config = settings.get_phase_config(phase)
            assert config is not None, f"Missing configuration for phase {phase}"
            assert "validation_rules" in config, f"Missing validation rules for phase {phase}"
            
        return settings
        
    @pytest.fixture
    async def evidence_files(self, settings):
        """Create and validate test evidence files"""
        # Create evidence directory
        evidence_path = settings.EVIDENCE_PATH
        evidence_path.mkdir(parents=True, exist_ok=True)
        
        # Test evidence data
        evidence_data = {
            "coverage_report": {
                "phase": "internal",
                "component": "code_coverage",
                "status": "verified",
                "data": {
                    "coverage": 85,
                    "checks": ["unit", "integration"]
                }
            },
            "performance_metrics": {
                "phase": "internal",
                "component": "performance",
                "status": "verified",
                "data": {
                    "latency": 150,
                    "checks": ["load_test", "stress_test"]
                }
            },
            "security_report": {
                "phase": "internal",
                "component": "security",
                "status": "verified",
                "data": {
                    "checks": ["vulnerability_scan", "penetration_test"]
                }
            },
            "feedback_analysis": {
                "phase": "limited",
                "component": "user_feedback",
                "status": "verified",
                "data": {
                    "responses": 60,
                    "satisfaction": 0.85
                }
            },
            "stability_metrics": {
                "phase": "open",
                "component": "stability",
                "status": "verified",
                "data": {
                    "uptime": 0.998,
                    "mttr": 1.5
                }
            }
        }
        
        # Validate evidence data structure
        validation_results = validate_evidence_data(evidence_data)
        invalid_evidence = {
            k: v for k, v in validation_results.items() 
            if not v["valid"]
        }
        assert not invalid_evidence, f"Invalid evidence data: {invalid_evidence}"
        
        # Create evidence files
        for evidence_id, data in evidence_data.items():
            evidence_file = evidence_path / f"{evidence_id}.json"
            with open(evidence_file, "w") as f:
                json.dump({
                    "validation_id": f"TEST-{evidence_id}",
                    "timestamp": datetime.utcnow().isoformat(),
                    **data
                }, f, indent=2)
                
            # Verify file was created and is readable
            assert evidence_file.exists(), f"Failed to create evidence file: {evidence_id}"
            assert os.access(evidence_file, os.R_OK), f"Evidence file not readable: {evidence_id}"
                
        return evidence_data
        
    @pytest.mark.validation
    async def test_phase_mapping_validity(self, orchestrator):
        """Validate phase mappings are correct"""
        # Verify all critical path phases have valid beta phase mappings
        for phase in ["ONBOARDING", "CORE_FEATURES", "DATA_SAFETY", "USER_EXPERIENCE"]:
            beta_phase = orchestrator.phase_mapping.get(phase)
            assert beta_phase is not None, f"Missing beta phase mapping for {phase}"
            assert beta_phase in ["internal", "limited", "open"], f"Invalid beta phase {beta_phase} for {phase}"
            
    @pytest.mark.validation
    async def test_phase_sequence(self, orchestrator, evidence_files):
        """Validate phase sequence is enforced"""
        # Start with ONBOARDING
        result = await orchestrator.start_phase("ONBOARDING")
        assert result["success"], f"Failed to start ONBOARDING phase: {result.get('error')}"
        assert result["beta_phase"] == "internal"
        
        # Try to skip to DATA_SAFETY (should fail)
        result = await orchestrator.start_phase("DATA_SAFETY")
        assert not result["success"], "Should not allow skipping phases"
        
        # Complete ONBOARDING and move to CORE_FEATURES
        complete_result = await orchestrator.complete_phase("ONBOARDING")
        assert complete_result["success"], f"Failed to complete ONBOARDING phase: {complete_result.get('error')}"
        
        result = await orchestrator.start_phase("CORE_FEATURES")
        assert result["success"], f"Failed to start CORE_FEATURES phase: {result.get('error')}"
        assert result["beta_phase"] == "internal"
        
    @pytest.mark.validation
    async def test_phase_requirements(self, orchestrator, settings, evidence_files):
        """Validate phase requirements are enforced"""
        # Start ONBOARDING phase
        result = await orchestrator.start_phase("ONBOARDING")
        assert result["success"], f"Failed to start ONBOARDING phase: {result.get('error')}"
        
        # Verify requirements for internal phase
        phase_config = settings.get_phase_config("internal")
        assert phase_config is not None
        assert "validation_rules" in phase_config
        
        # Verify evidence requirements
        requirements = await orchestrator._verify_phase_requirements("ONBOARDING")
        assert requirements is not None
        for component, result in requirements.items():
            assert "evidence_id" in result.details, f"Missing evidence ID for {component}"
            
    @pytest.mark.validation
    async def test_evidence_validation(self, orchestrator, evidence_files):
        """Validate evidence requirements are enforced"""
        # Start with ONBOARDING
        result = await orchestrator.start_phase("ONBOARDING")
        assert result["success"], f"Failed to start ONBOARDING phase: {result.get('error')}"
        
        # Verify evidence chain
        evidence = BetaValidationEvidence()
        result = await evidence.verify_evidence_chain("internal", "coverage_report")
        assert "valid" in result, "Missing validation result"
        assert "data" in result, "Missing evidence data"
        assert result["valid"], f"Invalid evidence: {result.get('issues', [])}"
        
        # Verify all required evidence types
        required_evidence = {
            "internal": ["coverage_report", "performance_metrics", "security_report"],
            "limited": ["security_report", "feedback_analysis"],
            "open": ["performance_metrics", "security_report", "stability_metrics"]
        }
        
        for beta_phase, evidence_types in required_evidence.items():
            for evidence_id in evidence_types:
                result = await evidence.verify_evidence_chain(beta_phase, evidence_id)
                assert "valid" in result, f"Missing validation result for {evidence_id} in {beta_phase}"
                assert result["valid"], f"Invalid evidence for {evidence_id} in {beta_phase}: {result.get('issues', [])}"
