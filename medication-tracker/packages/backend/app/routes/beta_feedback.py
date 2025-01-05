"""
Beta Feedback Routes
API endpoints for beta tester feedback
Last Updated: 2024-12-30T22:27:43+01:00
"""

from fastapi import APIRouter, HTTPException
from typing import Dict, Optional
from pydantic import BaseModel

from ..core.beta_feedback_collector import (
    BetaFeedbackCollector,
    FeedbackType,
    FeedbackPriority
)

router = APIRouter(prefix="/api/beta/feedback", tags=["beta"])
collector = BetaFeedbackCollector()

class FeedbackSubmission(BaseModel):
    tester_id: str
    feedback_type: str
    description: str
    priority: str = "medium"
    metadata: Optional[Dict] = None

class FeedbackUpdate(BaseModel):
    status: str
    resolution: Optional[str] = None

@router.post("/submit")
async def submit_feedback(feedback: FeedbackSubmission) -> Dict:
    """Submit new feedback from a beta tester"""
    try:
        # Validate feedback type
        try:
            fb_type = FeedbackType(feedback.feedback_type)
        except ValueError:
            raise HTTPException(
                status_code=400,
                detail=f"Invalid feedback type: {feedback.feedback_type}"
            )
            
        # Validate priority
        try:
            priority = FeedbackPriority(feedback.priority)
        except ValueError:
            raise HTTPException(
                status_code=400,
                detail=f"Invalid priority: {feedback.priority}"
            )
            
        result = await collector.submit_feedback(
            feedback.tester_id,
            fb_type,
            feedback.description,
            priority,
            feedback.metadata
        )
        
        if not result["success"]:
            raise HTTPException(
                status_code=500,
                detail=result["error"]
            )
            
        return result
        
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(
            status_code=500,
            detail=f"Failed to submit feedback: {str(e)}"
        )
        
@router.get("/summary")
async def get_feedback_summary(phase: Optional[str] = None) -> Dict:
    """Get summary of beta tester feedback"""
    result = await collector.get_feedback_summary(phase)
    if not result["success"]:
        raise HTTPException(
            status_code=500,
            detail=result["error"]
        )
    return result
    
@router.get("/critical")
async def get_critical_feedback() -> Dict:
    """Get high-priority feedback that needs attention"""
    result = await collector.get_critical_feedback()
    if not result["success"]:
        raise HTTPException(
            status_code=500,
            detail=result["error"]
        )
    return result
    
@router.put("/{feedback_id}/status")
async def update_feedback_status(
    feedback_id: str,
    update: FeedbackUpdate
) -> Dict:
    """Update status of feedback item"""
    result = await collector.update_feedback_status(
        feedback_id,
        update.status,
        update.resolution
    )
    
    if not result["success"]:
        raise HTTPException(
            status_code=404 if result["error"] == "Feedback not found" else 500,
            detail=result["error"]
        )
        
    return result
