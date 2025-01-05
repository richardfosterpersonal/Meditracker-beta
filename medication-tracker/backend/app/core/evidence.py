"""
Evidence Collection and Chain Maintenance
Last Updated: 2024-12-31T11:23:17+01:00

Critical Path: Security.Evidence
"""
from typing import Dict, Any, List, Optional
from enum import Enum
from datetime import datetime
import json
import logging
from pathlib import Path

from .beta_settings import BetaSettings

class EvidenceCategory(str, Enum):
    """Evidence categories for validation chain"""
    SECURITY = "security"
    TEST = "test"
    STATE = "state"
    CHAIN = "chain"
    VALIDATION = "validation"

class ValidationLevel(str, Enum):
    """Validation levels for evidence collection"""
    HIGH = "high"
    MEDIUM = "medium"
    LOW = "low"

class EvidenceCollector:
    """
    Evidence collection and chain maintenance
    Critical Path: Security.Evidence
    """
    
    def __init__(self):
        """
        Initialize evidence collector
        Critical Path: Security.Initialization
        """
        self.settings = BetaSettings()
        self.logger = logging.getLogger(__name__)
        self.evidence_dir = self.settings.BETA_BASE_PATH / "evidence"
        self.evidence_dir.mkdir(parents=True, exist_ok=True)
        
    async def collect(
        self,
        category: EvidenceCategory,
        data: Dict[str, Any],
        validation_level: ValidationLevel = ValidationLevel.MEDIUM,
        metadata: Optional[Dict] = None
    ) -> Dict:
        """
        Collect evidence
        Critical Path: Security.Evidence
        """
        try:
            # Generate evidence ID
            evidence_id = f"EVIDENCE-{category}-{datetime.utcnow().timestamp()}"
            
            # Create evidence record
            evidence = {
                "evidence_id": evidence_id,
                "category": category,
                "data": data,
                "validation_level": validation_level,
                "metadata": metadata or {},
                "timestamp": datetime.utcnow().isoformat(),
                "status": "collected"
            }
            
            # Save evidence
            evidence_file = self.evidence_dir / f"{evidence_id}.json"
            with open(evidence_file, "w") as f:
                json.dump(evidence, f, indent=2)
                
            return {
                "success": True,
                "evidence_id": evidence_id,
                "timestamp": datetime.utcnow().isoformat()
            }
            
        except Exception as e:
            self.logger.error(f"Failed to collect evidence: {str(e)}")
            return {
                "success": False,
                "error": "Failed to collect evidence",
                "details": str(e)
            }
            
    async def get_evidence(self, evidence_id: str) -> Dict:
        """
        Get evidence by ID
        Critical Path: Security.Chain
        """
        try:
            evidence_file = self.evidence_dir / f"{evidence_id}.json"
            if not evidence_file.exists():
                return {
                    "success": False,
                    "error": f"Evidence not found: {evidence_id}"
                }
                
            with open(evidence_file, "r") as f:
                evidence = json.load(f)
                
            return {
                "success": True,
                "evidence": evidence
            }
            
        except Exception as e:
            self.logger.error(f"Failed to get evidence: {str(e)}")
            return {
                "success": False,
                "error": "Failed to get evidence",
                "details": str(e)
            }
            
    async def get_category_evidence(
        self,
        category: EvidenceCategory
    ) -> Dict:
        """
        Get all evidence for a category
        Critical Path: Security.Chain
        """
        try:
            # Find category evidence
            pattern = f"EVIDENCE-{category}-*"
            evidence_files = self.evidence_dir.glob(pattern)
            
            # Load evidence
            evidence_list = []
            for evidence_file in evidence_files:
                with open(evidence_file, "r") as f:
                    evidence = json.load(f)
                    evidence_list.append(evidence)
                    
            # Sort by timestamp
            evidence_list.sort(
                key=lambda e: e["timestamp"],
                reverse=True
            )
            
            return {
                "success": True,
                "evidence": evidence_list,
                "timestamp": datetime.utcnow().isoformat()
            }
            
        except Exception as e:
            self.logger.error(f"Failed to get category evidence: {str(e)}")
            return {
                "success": False,
                "error": "Failed to get category evidence",
                "details": str(e)
            }
            
    async def get_validation_level_evidence(
        self,
        validation_level: ValidationLevel
    ) -> Dict:
        """
        Get all evidence for a validation level
        Critical Path: Security.Chain
        """
        try:
            evidence_list = []
            
            # Load all evidence files
            for evidence_file in self.evidence_dir.glob("EVIDENCE-*"):
                with open(evidence_file, "r") as f:
                    evidence = json.load(f)
                    if evidence["validation_level"] == validation_level:
                        evidence_list.append(evidence)
                        
            # Sort by timestamp
            evidence_list.sort(
                key=lambda e: e["timestamp"],
                reverse=True
            )
            
            return {
                "success": True,
                "evidence": evidence_list,
                "timestamp": datetime.utcnow().isoformat()
            }
            
        except Exception as e:
            self.logger.error(
                f"Failed to get validation level evidence: {str(e)}"
            )
            return {
                "success": False,
                "error": "Failed to get validation level evidence",
                "details": str(e)
            }
