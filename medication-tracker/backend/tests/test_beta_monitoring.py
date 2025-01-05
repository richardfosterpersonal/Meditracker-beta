"""
Beta Monitoring Test Suite
Tests for beta validation monitoring system
Last Updated: 2024-12-30T22:01:16+01:00
"""

import pytest
import os
import json
from datetime import datetime
import asyncio
from typing import Dict

from app.core.beta_validation_monitor import BetaValidationMonitor
from app.core.settings import settings

@pytest.fixture
async def monitor():
    """Beta validation monitor fixture"""
    return BetaValidationMonitor()

class TestBetaMonitoring:
    """Test beta validation monitoring system"""
    
    @pytest.mark.asyncio
    async def test_monitor_start_stop(self, monitor):
        """Test starting and stopping monitoring"""
        # Start monitoring
        phase = "internal"
        start_result = await monitor.start_monitoring(phase)
        
        # Assert start
        assert start_result["success"] == True
        assert "task_id" in start_result
        
        # Check status
        status = await monitor.get_monitoring_status(phase)
        assert status["active"] == True
        assert status["running"] == True
        
        # Stop monitoring
        stop_result = await monitor.stop_monitoring(phase)
        
        # Assert stop
        assert stop_result["success"] == True
        
        # Check status again
        status = await monitor.get_monitoring_status(phase)
        assert status["active"] == False
        
    @pytest.mark.asyncio
    async def test_metric_collection(self, monitor):
        """Test metric collection"""
        # Start monitoring
        phase = "internal"
        await monitor.start_monitoring(phase)
        
        # Wait for first metric collection
        await asyncio.sleep(1)
        
        # Stop monitoring
        await monitor.stop_monitoring(phase)
        
        # Check for metric files
        evidence_dir = settings.BETA_EVIDENCE_PATH
        metric_files = [
            f for f in os.listdir(evidence_dir)
            if f.startswith(f"monitoring_{phase}")
        ]
        
        assert len(metric_files) > 0
        
        # Check metric content
        with open(os.path.join(evidence_dir, metric_files[0]), 'r') as f:
            metrics = json.load(f)
            
        assert "timestamp" in metrics
        assert "phase" in metrics
        assert "metrics" in metrics
        assert "validation_results" in metrics
        assert "critical_path_status" in metrics
        
    @pytest.mark.asyncio
    async def test_issue_detection(self, monitor):
        """Test validation issue detection"""
        # Start monitoring
        phase = "internal"
        await monitor.start_monitoring(phase)
        
        # Inject test issue
        await monitor._handle_issues(phase, [{
            "type": "test_issue",
            "component": "test",
            "details": {"test": "data"}
        }])
        
        # Check for issue files
        evidence_dir = settings.BETA_EVIDENCE_PATH
        issue_files = [
            f for f in os.listdir(evidence_dir)
            if f.startswith(f"issues_{phase}")
        ]
        
        assert len(issue_files) > 0
        
        # Check issue content
        with open(os.path.join(evidence_dir, issue_files[0]), 'r') as f:
            issues = json.load(f)
            
        assert "timestamp" in issues
        assert "phase" in issues
        assert "issues" in issues
        assert len(issues["issues"]) > 0
        
        # Stop monitoring
        await monitor.stop_monitoring(phase)
        
    @pytest.mark.asyncio
    async def test_error_handling(self, monitor):
        """Test monitoring error handling"""
        # Start monitoring
        phase = "internal"
        await monitor.start_monitoring(phase)
        
        # Inject test error
        test_error = Exception("Test error")
        await monitor._handle_monitoring_error(phase, test_error)
        
        # Check for error files
        evidence_dir = settings.BETA_EVIDENCE_PATH
        error_files = [
            f for f in os.listdir(evidence_dir)
            if f.startswith(f"monitoring_error_{phase}")
        ]
        
        assert len(error_files) > 0
        
        # Check error content
        with open(os.path.join(evidence_dir, error_files[0]), 'r') as f:
            error = json.load(f)
            
        assert "timestamp" in error
        assert "phase" in error
        assert "error" in error
        assert "type" in error
        
        # Stop monitoring
        await monitor.stop_monitoring(phase)
        
    @pytest.mark.asyncio
    async def test_report_generation(self, monitor):
        """Test monitoring report generation"""
        # Test data
        phase = "internal"
        metrics = {"test": "metrics"}
        validation_results = {"test": {"valid": True}}
        critical_path_status = {"validation_status": True}
        issues = []
        
        # Generate report
        await monitor._generate_monitoring_report(
            phase,
            metrics,
            validation_results,
            critical_path_status,
            issues
        )
        
        # Check for report files
        evidence_dir = settings.BETA_EVIDENCE_PATH
        report_files = [
            f for f in os.listdir(evidence_dir)
            if f.startswith(f"monitoring_{phase}")
        ]
        
        assert len(report_files) > 0
        
        # Check report content
        with open(os.path.join(evidence_dir, report_files[0]), 'r') as f:
            report = json.load(f)
            
        assert "timestamp" in report
        assert "phase" in report
        assert "metrics" in report
        assert "validation_results" in report
        assert "critical_path_status" in report
        assert "issues" in report
        assert "summary" in report
        
    @pytest.mark.asyncio
    async def test_concurrent_monitoring(self, monitor):
        """Test concurrent phase monitoring"""
        # Start monitoring for multiple phases
        phases = ["internal", "limited", "open"]
        
        # Start all monitors
        start_results = await asyncio.gather(*[
            monitor.start_monitoring(phase)
            for phase in phases
        ])
        
        # Assert all started
        assert all(r["success"] for r in start_results)
        
        # Check all statuses
        statuses = await asyncio.gather(*[
            monitor.get_monitoring_status(phase)
            for phase in phases
        ])
        
        assert all(s["active"] for s in statuses)
        assert all(s["running"] for s in statuses)
        
        # Stop all monitors
        stop_results = await asyncio.gather(*[
            monitor.stop_monitoring(phase)
            for phase in phases
        ])
        
        # Assert all stopped
        assert all(r["success"] for r in stop_results)
        
        # Check all statuses again
        statuses = await asyncio.gather(*[
            monitor.get_monitoring_status(phase)
            for phase in phases
        ])
        
        assert all(not s["active"] for s in statuses)
