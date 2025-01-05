"""
Beta Data Management System
Critical Path: BETA-DATA-MANAGER-*
Last Updated: 2025-01-02T12:43:13+01:00

Manages beta test data collection and storage.
"""

import logging
from typing import Dict, List, Optional, Any
from datetime import datetime
import json
from pathlib import Path
import asyncio

from backend.app.exceptions import BetaDataError
from .validation_types import ValidationResult

logger = logging.getLogger(__name__)

class BetaDataManager:
    """Manages beta test data collection and storage"""
    
    def __init__(self):
        """Initialize beta data manager"""
        self.data: Dict[str, Any] = {}
        self._lock = asyncio.Lock()
        self.data_path = Path("data/beta")
        self.data_path.mkdir(parents=True, exist_ok=True)
        
    async def record_event(self, event_type: str, data: Dict[str, Any]):
        """Record a beta test event"""
        async with self._lock:
            timestamp = datetime.utcnow().isoformat()
            event = {
                "type": event_type,
                "timestamp": timestamp,
                "data": data
            }
            
            # Store event in appropriate file
            event_file = self.data_path / f"{event_type}_{timestamp[:10]}.json"
            try:
                if event_file.exists():
                    with open(event_file) as f:
                        events = json.load(f)
                else:
                    events = []
                    
                events.append(event)
                
                with open(event_file, 'w') as f:
                    json.dump(events, f, indent=2)
                    
                logger.info(f"Recorded {event_type} event")
                
            except Exception as e:
                logger.error(f"Failed to record event: {str(e)}")
                raise BetaDataError("Failed to record event") from e
                
    def get_events(self, event_type: str, start_date: Optional[str] = None, end_date: Optional[str] = None) -> List[Dict]:
        """Get events of a specific type within date range"""
        events = []
        
        try:
            # List all event files for the type
            event_files = list(self.data_path.glob(f"{event_type}_*.json"))
            
            for file in event_files:
                # Check if file is within date range
                file_date = file.stem.split('_')[1]
                if start_date and file_date < start_date:
                    continue
                if end_date and file_date > end_date:
                    continue
                    
                with open(file) as f:
                    file_events = json.load(f)
                events.extend(file_events)
                
            return events
            
        except Exception as e:
            logger.error(f"Failed to get events: {str(e)}")
            raise BetaDataError("Failed to get events") from e
            
    def clear_events(self, event_type: str):
        """Clear all events of a specific type"""
        try:
            event_files = list(self.data_path.glob(f"{event_type}_*.json"))
            for file in event_files:
                file.unlink()
            logger.info(f"Cleared all {event_type} events")
        except Exception as e:
            logger.error(f"Failed to clear events: {str(e)}")
            raise BetaDataError("Failed to clear events") from e
