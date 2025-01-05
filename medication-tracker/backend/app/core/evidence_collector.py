"""
Evidence Collector Module
Maintains critical path alignment and validation chain
Last Updated: 2024-12-24T21:51:43+01:00
"""
from typing import Dict, Any, List, Optional
from datetime import datetime
import json
import hashlib
from enum import Enum
from pydantic import BaseModel, Field

class EvidenceCategory(str, Enum):
    """Evidence categories aligned with critical path"""
    MEDICATION_SAFETY = "medication_safety"
    DATA_SECURITY = "data_security"
    PERFORMANCE = "performance"
    VALIDATION = "validation"
    AUDIT = "audit"
    MONITORING = "monitoring"

class ValidationLevel(str, Enum):
    """Validation levels for evidence collection"""
    CRITICAL = "critical"
    HIGH = "high"
    MEDIUM = "medium"
    LOW = "low"

class Evidence(BaseModel):
    """Evidence data model with validation"""
    id: str = Field(..., description="Unique evidence ID")
    category: EvidenceCategory = Field(..., description="Evidence category")
    validation_level: ValidationLevel = Field(..., description="Validation importance")
    timestamp: datetime = Field(default_factory=datetime.utcnow)
    data: Dict[str, Any] = Field(..., description="Evidence data")
    source: str = Field(..., description="Evidence source")
    hash: str = Field(..., description="Evidence hash")
    metadata: Dict[str, Any] = Field(
        default_factory=dict,
        description="Additional metadata"
    )

    def generate_hash(self) -> str:
        """Generate cryptographic hash of evidence data"""
        data_str = json.dumps(self.data, sort_keys=True)
        return hashlib.sha256(
            f"{self.id}:{self.category}:{data_str}:{self.timestamp}".encode()
        ).hexdigest()

    def validate_critical_path(self) -> bool:
        """Validate evidence against critical path requirements"""
        if self.category == EvidenceCategory.MEDICATION_SAFETY:
            return self._validate_medication_safety()
        elif self.category == EvidenceCategory.DATA_SECURITY:
            return self._validate_data_security()
        return True

    def _validate_medication_safety(self) -> bool:
        """Validate medication safety evidence requirements"""
        required_fields = {
            "action",
            "medication_id",
            "safety_checks",
            "validation_chain"
        }
        return all(field in self.data for field in required_fields)

    def _validate_data_security(self) -> bool:
        """Validate data security evidence requirements"""
        required_fields = {
            "action",
            "user_id",
            "access_type",
            "hipaa_compliant"
        }
        return all(field in self.data for field in required_fields)

class EvidenceCollector:
    """Service for collecting and managing evidence"""

    def __init__(self):
        self._evidence_store: Dict[str, Evidence] = {}
        self._validation_chain: List[str] = []

    async def collect_evidence(
        self,
        category: EvidenceCategory,
        validation_level: ValidationLevel,
        data: Dict[str, Any],
        source: str,
        metadata: Optional[Dict[str, Any]] = None
    ) -> Evidence:
        """
        Collect and validate new evidence
        Critical Path: Evidence collection and validation
        """
        evidence_id = f"ev_{datetime.utcnow().strftime('%Y%m%d_%H%M%S')}_{len(self._evidence_store)}"
        
        evidence = Evidence(
            id=evidence_id,
            category=category,
            validation_level=validation_level,
            data=data,
            source=source,
            metadata=metadata or {},
            hash=""  # Temporary value
        )

        # Generate hash after initial creation
        evidence.hash = evidence.generate_hash()

        # Validate critical path requirements
        if not evidence.validate_critical_path():
            raise ValueError(
                f"Evidence does not meet critical path requirements for {category}"
            )

        # Store evidence
        self._evidence_store[evidence_id] = evidence
        self._validation_chain.append(evidence_id)

        return evidence

    async def get_evidence(
        self,
        evidence_id: str
    ) -> Optional[Evidence]:
        """
        Retrieve evidence by ID
        Critical Path: Data access and validation
        """
        return self._evidence_store.get(evidence_id)

    async def get_evidence_chain(
        self,
        category: Optional[EvidenceCategory] = None,
        start_time: Optional[datetime] = None,
        end_time: Optional[datetime] = None
    ) -> List[Evidence]:
        """
        Get evidence chain with optional filters
        Critical Path: Audit trail and validation
        """
        evidence_list = list(self._evidence_store.values())

        if category:
            evidence_list = [e for e in evidence_list if e.category == category]

        if start_time:
            evidence_list = [e for e in evidence_list if e.timestamp >= start_time]

        if end_time:
            evidence_list = [e for e in evidence_list if e.timestamp <= end_time]

        return sorted(evidence_list, key=lambda x: x.timestamp)

    async def validate_evidence_chain(
        self,
        category: Optional[EvidenceCategory] = None
    ) -> bool:
        """
        Validate entire evidence chain
        Critical Path: Chain integrity and validation
        """
        evidence_list = await self.get_evidence_chain(category=category)
        
        for evidence in evidence_list:
            # Verify hash integrity
            if evidence.hash != evidence.generate_hash():
                return False
            
            # Verify critical path requirements
            if not evidence.validate_critical_path():
                return False

        return True

    async def export_evidence(
        self,
        category: Optional[EvidenceCategory] = None,
        format: str = "json"
    ) -> str:
        """
        Export evidence for external validation
        Critical Path: Evidence portability
        """
        evidence_list = await self.get_evidence_chain(category=category)
        
        if format.lower() == "json":
            return json.dumps(
                [evidence.dict() for evidence in evidence_list],
                default=str,
                indent=2
            )
        
        raise ValueError(f"Unsupported export format: {format}")

    async def get_validation_summary(
        self,
        category: Optional[EvidenceCategory] = None
    ) -> Dict[str, Any]:
        """
        Get validation summary statistics
        Critical Path: Validation reporting
        """
        evidence_list = await self.get_evidence_chain(category=category)
        
        return {
            "total_evidence": len(evidence_list),
            "by_category": {
                cat: len([e for e in evidence_list if e.category == cat])
                for cat in EvidenceCategory
            },
            "by_validation_level": {
                level: len([e for e in evidence_list if e.validation_level == level])
                for level in ValidationLevel
            },
            "validation_status": await self.validate_evidence_chain(category),
            "last_validated": datetime.utcnow().isoformat()
        }
