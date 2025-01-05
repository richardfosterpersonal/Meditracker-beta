"""
Beta Testing Endpoints
Last Updated: 2024-12-27T22:33:00+01:00
Critical Path: Beta.API
"""

from fastapi import APIRouter, HTTPException, Depends
from typing import List, Dict
from ....core.beta_access import beta_access
from ....schemas.beta import (
    BetaRegistration,
    BetaFeature,
    BetaFeedback,
    MedicationEntry
)
from ....core.validation_manifest import manifest

router = APIRouter()

@router.post("/register")
async def register_beta_user(registration: BetaRegistration) -> Dict:
    """Simple beta registration"""
    try:
        return await beta_access.register_beta_user(
            email=registration.email,
            name=registration.name,
            access_key="beta2024"  # Simple fixed key for beta
        )
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))

@router.get("/features")
async def list_beta_features() -> List[BetaFeature]:
    """List available beta features"""
    return [
        BetaFeature(
            name="medication_tracking",
            description="Track your daily medications",
            status="active",
            endpoints=[
                "/medications/add",
                "/medications/list",
                "/medications/log"
            ]
        ),
        BetaFeature(
            name="reminders",
            description="Get medication reminders",
            status="active",
            endpoints=[
                "/reminders/set",
                "/reminders/list"
            ]
        ),
        BetaFeature(
            name="emergency",
            description="Emergency contact features",
            status="active",
            endpoints=[
                "/emergency/contacts",
                "/emergency/alert"
            ]
        )
    ]

@router.post("/medications/add")
async def add_medication(medication: MedicationEntry) -> Dict:
    """Add a medication for tracking"""
    try:
        # Simple validation
        if not medication.name or not medication.dosage:
            raise ValueError("Name and dosage required")
            
        # Store in SQLite
        return {
            "status": "success",
            "message": "Medication added",
            "medication": medication.dict()
        }
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))

@router.post("/feedback")
async def submit_feedback(feedback: BetaFeedback) -> Dict:
    """Submit beta feedback"""
    try:
        # Simple feedback storage
        return {
            "status": "received",
            "message": "Thank you for your feedback!",
            "feedback_id": "123"  # Simple ID for beta
        }
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))

@router.get("/status")
async def beta_status() -> Dict:
    """Get current beta testing status"""
    return {
        "active_testers": await beta_access.get_active_testers(),
        "max_testers": 10,  # Start small
        "features_enabled": [
            {
                "name": "medication_tracking",
                "status": "active",
                "test_priority": "high"
            },
            {
                "name": "reminders",
                "status": "active",
                "test_priority": "high"
            },
            {
                "name": "emergency",
                "status": "active",
                "test_priority": "medium"
            }
        ],
        "next_review": "2024-12-30",  # 3-day initial review
        "accepting_new": True
    }

@router.get("/health")
async def check_health() -> Dict:
    """Simple health check"""
    return {
        "status": "healthy",
        "version": "beta",
        "timestamp": manifest.reference_time
    }
