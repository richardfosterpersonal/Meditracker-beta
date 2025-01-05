from enum import Enum
from typing import List, Dict, Optional
from datetime import datetime
from ..core.logging import beta_logger
from ..core.exceptions import EmergencyProtocolError

class EmergencyProtocolType(Enum):
    INTERACTION_DETECTED = "interaction_detected"
    DOSAGE_ERROR = "dosage_error"
    VALIDATION_FAILURE = "validation_failure"
    SYSTEM_CRITICAL = "system_critical"

class EmergencyAction(Enum):
    SUSPEND_MEDICATION = "suspend_medication"
    NOTIFY_HEALTHCARE = "notify_healthcare"
    ACTIVATE_BACKUP = "activate_backup"
    LOCKDOWN_SYSTEM = "lockdown_system"

class EmergencyProtocol:
    def __init__(
        self,
        protocol_type: EmergencyProtocolType,
        validation_code: str,
        affected_medications: List[str],
        severity_level: int,
        context: Optional[Dict] = None
    ):
        self.protocol_type = protocol_type
        self.validation_code = validation_code
        self.affected_medications = affected_medications
        self.severity_level = severity_level
        self.context = context or {}
        self.timestamp = datetime.utcnow()
        self.actions_taken: List[EmergencyAction] = []
        self.resolved = False
        
    @property
    def requires_healthcare_notification(self) -> bool:
        return (
            self.protocol_type in {
                EmergencyProtocolType.INTERACTION_DETECTED,
                EmergencyProtocolType.DOSAGE_ERROR
            } or
            self.severity_level >= 8
        )

class EmergencyProtocolService:
    def __init__(self):
        self.logger = beta_logger
        self.active_protocols: Dict[str, EmergencyProtocol] = {}
    
    async def initiate_protocol(
        self,
        protocol_type: EmergencyProtocolType,
        validation_code: str,
        affected_medications: List[str],
        severity_level: int,
        context: Optional[Dict] = None
    ) -> EmergencyProtocol:
        """Initiate an emergency protocol based on validation failure"""
        try:
            protocol = EmergencyProtocol(
                protocol_type,
                validation_code,
                affected_medications,
                severity_level,
                context
            )
            
            # Log protocol initiation
            self.logger.critical(
                "emergency_protocol_initiated",
                protocol_type=protocol_type.value,
                validation_code=validation_code,
                severity_level=severity_level,
                affected_medications=affected_medications
            )
            
            # Execute immediate actions
            await self._execute_immediate_actions(protocol)
            
            # Store active protocol
            self.active_protocols[validation_code] = protocol
            
            return protocol
            
        except Exception as e:
            raise EmergencyProtocolError(
                f"Failed to initiate emergency protocol: {str(e)}"
            )
    
    async def _execute_immediate_actions(self, protocol: EmergencyProtocol) -> None:
        """Execute immediate actions based on protocol type"""
        try:
            # Suspend affected medications
            if protocol.protocol_type in {
                EmergencyProtocolType.INTERACTION_DETECTED,
                EmergencyProtocolType.DOSAGE_ERROR
            }:
                await self._suspend_medications(protocol.affected_medications)
                protocol.actions_taken.append(EmergencyAction.SUSPEND_MEDICATION)
            
            # Notify healthcare providers if needed
            if protocol.requires_healthcare_notification:
                await self._notify_healthcare_providers(protocol)
                protocol.actions_taken.append(EmergencyAction.NOTIFY_HEALTHCARE)
            
            # Activate backup systems for validation failures
            if protocol.protocol_type == EmergencyProtocolType.VALIDATION_FAILURE:
                await self._activate_backup_validation(protocol.validation_code)
                protocol.actions_taken.append(EmergencyAction.ACTIVATE_BACKUP)
            
            # Handle system critical failures
            if protocol.protocol_type == EmergencyProtocolType.SYSTEM_CRITICAL:
                await self._initiate_system_lockdown(protocol)
                protocol.actions_taken.append(EmergencyAction.LOCKDOWN_SYSTEM)
            
        except Exception as e:
            self.logger.error(
                "emergency_action_failed",
                protocol_type=protocol.protocol_type.value,
                error=str(e)
            )
            raise EmergencyProtocolError(
                f"Failed to execute emergency actions: {str(e)}"
            )
    
    async def _suspend_medications(self, medications: List[str]) -> None:
        """Suspend dispensing of affected medications"""
        self.logger.warning(
            "suspending_medications",
            medications=medications
        )
        # Implementation would:
        # 1. Mark medications as suspended in the database
        # 2. Prevent new prescriptions/doses
        # 3. Flag existing prescriptions for review
    
    async def _notify_healthcare_providers(self, protocol: EmergencyProtocol) -> None:
        """Notify relevant healthcare providers of the emergency"""
        self.logger.critical(
            "notifying_healthcare_providers",
            protocol_type=protocol.protocol_type.value,
            severity_level=protocol.severity_level
        )
        # Implementation would:
        # 1. Send immediate notifications to healthcare providers
        # 2. Create urgent case records
        # 3. Initiate emergency contact procedures
    
    async def _activate_backup_validation(self, validation_code: str) -> None:
        """Activate backup validation systems"""
        self.logger.warning(
            "activating_backup_validation",
            validation_code=validation_code
        )
        # Implementation would:
        # 1. Switch to backup validation service
        # 2. Enable additional validation checks
        # 3. Monitor validation performance
    
    async def _initiate_system_lockdown(self, protocol: EmergencyProtocol) -> None:
        """Initiate system lockdown for critical failures"""
        self.logger.critical(
            "initiating_system_lockdown",
            validation_code=protocol.validation_code
        )
        # Implementation would:
        # 1. Restrict system access to emergency operations
        # 2. Enable emergency-only mode
        # 3. Preserve system state for investigation
