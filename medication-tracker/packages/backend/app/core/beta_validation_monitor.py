"""
Beta Validation Monitor
Automated monitoring system for beta validation
Last Updated: 2024-12-30T22:01:16+01:00
"""

from typing import Dict, List, Optional
from datetime import datetime
import asyncio
from collections import defaultdict
import logging
import json
import os
from pathlib import Path

from .beta_validation_evidence import BetaValidationEvidence
from .beta_requirements_validator import BetaRequirementsValidator
from .beta_critical_path import BetaCriticalPath
from .settings import settings

class BetaValidationMonitor:
    """
    Automated monitoring system for beta validation
    Ensures continuous validation compliance and evidence maintenance
    """
    
    def __init__(self):
        self.evidence_collector = BetaValidationEvidence()
        self.validator = BetaRequirementsValidator()
        self.critical_path = BetaCriticalPath()
        self.logger = logging.getLogger(__name__)
        self.monitor_interval = 300  # 5 minutes
        self._monitor_tasks = {}
        self._alert_buffer = defaultdict(list)
        self._buffer_lock = asyncio.Lock()
        
    async def start_monitoring(self, phase: str) -> Dict:
        """Start automated monitoring for a phase"""
        try:
            if phase in self._monitor_tasks:
                return {
                    "success": False,
                    "error": f"Monitoring already active for phase: {phase}"
                }
                
            # Create monitoring task
            task = asyncio.create_task(
                self._monitor_phase(phase),
                name=f"beta_monitor_{phase}"
            )
            self._monitor_tasks[phase] = task
            
            self.logger.info(f"Started monitoring for phase: {phase}")
            
            return {
                "success": True,
                "phase": phase,
                "task_id": id(task)
            }
            
        except Exception as e:
            self.logger.error(f"Failed to start monitoring: {str(e)}")
            return {
                "success": False,
                "error": "Failed to start monitoring",
                "details": str(e)
            }
            
    async def stop_monitoring(self, phase: str) -> Dict:
        """Stop automated monitoring for a phase"""
        try:
            if phase not in self._monitor_tasks:
                return {
                    "success": False,
                    "error": f"No active monitoring for phase: {phase}"
                }
                
            # Cancel monitoring task
            task = self._monitor_tasks[phase]
            task.cancel()
            
            try:
                await task
            except asyncio.CancelledError:
                pass
                
            del self._monitor_tasks[phase]
            
            self.logger.info(f"Stopped monitoring for phase: {phase}")
            
            return {
                "success": True,
                "phase": phase
            }
            
        except Exception as e:
            self.logger.error(f"Failed to stop monitoring: {str(e)}")
            return {
                "success": False,
                "error": "Failed to stop monitoring",
                "details": str(e)
            }
            
    async def get_monitoring_status(self, phase: str) -> Dict:
        """Get current monitoring status for a phase"""
        try:
            if phase not in self._monitor_tasks:
                return {
                    "active": False,
                    "phase": phase
                }
                
            task = self._monitor_tasks[phase]
            
            return {
                "active": True,
                "phase": phase,
                "task_id": id(task),
                "running": not task.done()
            }
            
        except Exception as e:
            self.logger.error(f"Failed to get monitoring status: {str(e)}")
            return {
                "error": "Failed to get monitoring status",
                "details": str(e)
            }
            
    async def _monitor_phase(self, phase: str) -> None:
        """Monitor a beta phase"""
        while True:
            try:
                # Check phase requirements
                requirements = settings.BETA_PHASES[phase]["required_validations"]
                
                # Collect current metrics
                metrics = await self._collect_phase_metrics(phase)
                
                # Validate requirements
                validation_results = await self._validate_requirements(
                    phase,
                    requirements,
                    metrics
                )
                
                # Check critical path
                critical_path_status = await self.critical_path.monitor_critical_path(phase)
                
                # Generate evidence
                await self.evidence_collector.collect_validation_evidence(
                    phase,
                    "monitoring",
                    {
                        "metrics": metrics,
                        "validations": validation_results,
                        "critical_path": critical_path_status
                    }
                )
                
                # Check for issues
                issues = await self._check_for_issues(
                    phase,
                    validation_results,
                    critical_path_status
                )
                
                if issues:
                    await self._handle_issues(phase, issues)
                    
                # Generate monitoring report
                await self._generate_monitoring_report(
                    phase,
                    metrics,
                    validation_results,
                    critical_path_status,
                    issues
                )
                
            except asyncio.CancelledError:
                self.logger.info(f"Monitoring cancelled for phase: {phase}")
                break
                
            except Exception as e:
                self.logger.error(f"Monitoring error for phase {phase}: {str(e)}")
                await self._handle_monitoring_error(phase, e)
                
            await asyncio.sleep(self.monitor_interval)
            
    async def _collect_phase_metrics(self, phase: str) -> Dict:
        """Collect metrics for a phase"""
        try:
            metrics = {
                "timestamp": datetime.utcnow().isoformat(),
                "phase": phase
            }
            
            # Collect validation metrics
            validation_metrics = await self.validator.collect_validation_metrics(phase)
            metrics["validation"] = validation_metrics
            
            # Collect evidence metrics
            evidence_metrics = await self.evidence_collector.collect_evidence_metrics(phase)
            metrics["evidence"] = evidence_metrics
            
            # Collect critical path metrics
            critical_path_metrics = await self.critical_path.collect_critical_path_metrics(phase)
            metrics["critical_path"] = critical_path_metrics
            
            return metrics
            
        except Exception as e:
            self.logger.error(f"Failed to collect metrics: {str(e)}")
            raise
            
    async def _validate_requirements(
        self,
        phase: str,
        requirements: List[str],
        metrics: Dict
    ) -> Dict:
        """Validate phase requirements"""
        try:
            results = {}
            
            for req in requirements:
                validation = await self.validator._validate_component(
                    phase,
                    req,
                    metrics
                )
                results[req] = validation
                
            return results
            
        except Exception as e:
            self.logger.error(f"Failed to validate requirements: {str(e)}")
            raise
            
    async def _check_for_issues(
        self,
        phase: str,
        validation_results: Dict,
        critical_path_status: Dict
    ) -> List[Dict]:
        """Check for validation issues"""
        issues = []
        
        # Check validation results
        for component, result in validation_results.items():
            if not result["valid"]:
                issues.append({
                    "type": "validation_failure",
                    "component": component,
                    "details": result
                })
                
        # Check critical path
        if not critical_path_status["validation_status"]:
            issues.append({
                "type": "critical_path_failure",
                "details": critical_path_status
            })
            
        # Check evidence chain
        evidence_chain = await self.evidence_collector.verify_evidence_chain(phase)
        if not evidence_chain["valid"]:
            issues.append({
                "type": "evidence_chain_failure",
                "details": evidence_chain
            })
            
        return issues
        
    async def _handle_issues(self, phase: str, issues: List[Dict]) -> None:
        """Handle validation issues"""
        try:
            # Log issues
            for issue in issues:
                self.logger.error(
                    f"Validation issue in phase {phase}: "
                    f"{issue['type']} - {json.dumps(issue['details'])}"
                )
                
            # Buffer alerts
            async with self._buffer_lock:
                self._alert_buffer[phase].extend(issues)
                
            # Generate issue report
            report_path = os.path.join(
                settings.BETA_EVIDENCE_PATH,
                f"issues_{phase}_{datetime.utcnow().isoformat()}.json"
            )
            
            with open(report_path, 'w') as f:
                json.dump({
                    "timestamp": datetime.utcnow().isoformat(),
                    "phase": phase,
                    "issues": issues
                }, f, indent=2)
                
        except Exception as e:
            self.logger.error(f"Failed to handle issues: {str(e)}")
            raise
            
    async def _handle_monitoring_error(self, phase: str, error: Exception) -> None:
        """Handle monitoring errors"""
        try:
            # Log error
            self.logger.error(
                f"Monitoring error in phase {phase}: {str(error)}",
                exc_info=True
            )
            
            # Generate error report
            report_path = os.path.join(
                settings.BETA_EVIDENCE_PATH,
                f"monitoring_error_{phase}_{datetime.utcnow().isoformat()}.json"
            )
            
            with open(report_path, 'w') as f:
                json.dump({
                    "timestamp": datetime.utcnow().isoformat(),
                    "phase": phase,
                    "error": str(error),
                    "type": error.__class__.__name__
                }, f, indent=2)
                
        except Exception as e:
            self.logger.error(f"Failed to handle monitoring error: {str(e)}")
            
    async def _generate_monitoring_report(
        self,
        phase: str,
        metrics: Dict,
        validation_results: Dict,
        critical_path_status: Dict,
        issues: List[Dict]
    ) -> None:
        """Generate monitoring report"""
        try:
            report = {
                "timestamp": datetime.utcnow().isoformat(),
                "phase": phase,
                "metrics": metrics,
                "validation_results": validation_results,
                "critical_path_status": critical_path_status,
                "issues": issues,
                "summary": {
                    "total_validations": len(validation_results),
                    "failed_validations": len([
                        r for r in validation_results.values()
                        if not r["valid"]
                    ]),
                    "critical_path_valid": critical_path_status["validation_status"],
                    "total_issues": len(issues)
                }
            }
            
            # Save report
            report_path = os.path.join(
                settings.BETA_EVIDENCE_PATH,
                f"monitoring_{phase}_{datetime.utcnow().isoformat()}.json"
            )
            
            with open(report_path, 'w') as f:
                json.dump(report, f, indent=2)
                
        except Exception as e:
            self.logger.error(f"Failed to generate monitoring report: {str(e)}")
            raise
