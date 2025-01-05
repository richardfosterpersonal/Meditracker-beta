"""
Validation Hook Tests
Last Updated: 2024-12-25T21:09:13+01:00
Status: CRITICAL
Reference: ../../../docs/validation/decisions/CRITICAL_PATH_ANALYSIS.md
"""

import pytest
from datetime import datetime
from pathlib import Path
from app.validation.hooks import (
    ValidationHook,
    GapAnalysisHook,
    CriticalPathHook,
    ImplementationHook,
    validate_feature_proposal
)

@pytest.fixture
def sample_medication_data():
    """Sample medication data for testing"""
    return {
        'name': 'TestMed',
        'dosage': '10mg',
        'schedule': '1x daily',
        'timestamp': datetime.utcnow().isoformat()
    }

@pytest.fixture
def sample_feature_proposal(sample_medication_data):
    """Sample feature proposal for testing"""
    return {
        'type': 'medication_safety',
        'data': sample_medication_data,
        'timestamp': datetime.utcnow().isoformat()
    }

class TestGapAnalysisHook:
    """Test gap analysis hook"""

    def test_existing_implementation(self, sample_feature_proposal):
        """Test existing implementation check"""
        hook = GapAnalysisHook()
        result = hook._check_existing_implementation(sample_feature_proposal)
        assert isinstance(result, dict)
        assert 'is_valid' in result

    def test_documentation_check(self, sample_feature_proposal):
        """Test documentation check"""
        hook = GapAnalysisHook()
        result = hook._check_documentation(sample_feature_proposal)
        assert isinstance(result, dict)
        assert 'is_valid' in result

    def test_reference_check(self, sample_feature_proposal):
        """Test reference check"""
        hook = GapAnalysisHook()
        result = hook._check_references(sample_feature_proposal)
        assert isinstance(result, dict)
        assert 'is_valid' in result

    def test_complete_analysis(self, sample_feature_proposal):
        """Test complete gap analysis"""
        hook = GapAnalysisHook()
        result = hook.analyze(sample_feature_proposal)
        assert isinstance(result, dict)
        assert 'is_valid' in result
        assert 'errors' in result
        assert 'warnings' in result

class TestCriticalPathHook:
    """Test critical path hook"""

    def test_critical_path_alignment(self, sample_feature_proposal):
        """Test critical path alignment check"""
        hook = CriticalPathHook()
        result = hook._check_critical_path_alignment(sample_feature_proposal)
        assert isinstance(result, dict)
        assert 'is_valid' in result

    def test_safety_impact(self, sample_feature_proposal):
        """Test safety impact check"""
        hook = CriticalPathHook()
        result = hook._check_safety_impact(sample_feature_proposal)
        assert isinstance(result, dict)
        assert 'is_valid' in result

    def test_documentation_consistency(self, sample_feature_proposal):
        """Test documentation consistency check"""
        hook = CriticalPathHook()
        result = hook._check_documentation_consistency(sample_feature_proposal)
        assert isinstance(result, dict)
        assert 'is_valid' in result

    def test_complete_verification(self, sample_feature_proposal):
        """Test complete critical path verification"""
        hook = CriticalPathHook()
        result = hook.verify(sample_feature_proposal)
        assert isinstance(result, dict)
        assert 'is_valid' in result
        assert 'errors' in result
        assert 'warnings' in result

class TestImplementationHook:
    """Test implementation hook"""

    def test_code_analysis(self, sample_feature_proposal):
        """Test code analysis"""
        hook = ImplementationHook()
        result = hook._analyze_code(sample_feature_proposal)
        assert isinstance(result, dict)
        assert 'is_valid' in result

    def test_documentation_review(self, sample_feature_proposal):
        """Test documentation review"""
        hook = ImplementationHook()
        result = hook._review_documentation(sample_feature_proposal)
        assert isinstance(result, dict)
        assert 'is_valid' in result

    def test_safety_verification(self, sample_feature_proposal):
        """Test safety verification"""
        hook = ImplementationHook()
        result = hook._verify_safety(sample_feature_proposal)
        assert isinstance(result, dict)
        assert 'is_valid' in result

    def test_complete_verification(self, sample_feature_proposal):
        """Test complete implementation verification"""
        hook = ImplementationHook()
        result = hook.verify(sample_feature_proposal)
        assert isinstance(result, dict)
        assert 'is_valid' in result
        assert 'errors' in result
        assert 'warnings' in result

def test_validate_feature_proposal(sample_feature_proposal):
    """Test complete feature proposal validation"""
    result = validate_feature_proposal(sample_feature_proposal)
    assert isinstance(result, dict)
    assert 'is_valid' in result
    assert 'errors' in result
    assert 'warnings' in result
    assert 'gap_analysis' in result
    assert 'critical_path' in result
    assert 'implementation' in result
