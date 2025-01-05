from typing import Dict, Any, Tuple
from datetime import datetime
import re

def validate_schedule(schedule: Dict[str, Any]) -> Tuple[bool, str]:
    """
    Validate a medication schedule
    
    Args:
        schedule (Dict[str, Any]): Schedule configuration
        
    Returns:
        Tuple[bool, str]: (is_valid, error_message)
    """
    if not isinstance(schedule, dict):
        return False, "Schedule must be a dictionary"
        
    if "type" not in schedule:
        return False, "Schedule must have a type"
        
    schedule_type = schedule["type"]
    
    if schedule_type == "fixed_time":
        return _validate_fixed_time_schedule(schedule)
    elif schedule_type == "prn":
        return _validate_prn_schedule(schedule)
    elif schedule_type == "interval":
        return _validate_interval_schedule(schedule)
    else:
        return False, f"Invalid schedule type: {schedule_type}"

def _validate_fixed_time_schedule(schedule: Dict[str, Any]) -> Tuple[bool, str]:
    """Validate fixed-time schedule"""
    if "times" not in schedule:
        return False, "Fixed time schedule must have times"
        
    times = schedule["times"]
    if not isinstance(times, list):
        return False, "Times must be a list"
        
    time_pattern = re.compile(r"^([01]?[0-9]|2[0-3]):[0-5][0-9]$")
    for time in times:
        if not isinstance(time, str) or not time_pattern.match(time):
            return False, f"Invalid time format: {time}"
            
    return True, ""

def _validate_prn_schedule(schedule: Dict[str, Any]) -> Tuple[bool, str]:
    """Validate PRN (as needed) schedule"""
    if "max_daily_doses" not in schedule:
        return False, "PRN schedule must specify max_daily_doses"
        
    max_doses = schedule["max_daily_doses"]
    if not isinstance(max_doses, (int, float)) or max_doses <= 0:
        return False, "max_daily_doses must be a positive number"
        
    if "min_hours_between_doses" in schedule:
        min_hours = schedule["min_hours_between_doses"]
        if not isinstance(min_hours, (int, float)) or min_hours < 0:
            return False, "min_hours_between_doses must be a non-negative number"
            
    return True, ""

def _validate_interval_schedule(schedule: Dict[str, Any]) -> Tuple[bool, str]:
    """Validate interval-based schedule"""
    if "interval_hours" not in schedule:
        return False, "Interval schedule must specify interval_hours"
        
    interval = schedule["interval_hours"]
    if not isinstance(interval, (int, float)) or interval <= 0:
        return False, "interval_hours must be a positive number"
        
    if "start_time" in schedule:
        time_pattern = re.compile(r"^([01]?[0-9]|2[0-3]):[0-5][0-9]$")
        if not time_pattern.match(schedule["start_time"]):
            return False, f"Invalid start time format: {schedule['start_time']}"
            
    return True, ""

def validate_time_format(time_str: str) -> bool:
    """Validate time string format (HH:MM)"""
    time_pattern = re.compile(r"^([01]?[0-9]|2[0-3]):[0-5][0-9]$")
    return bool(time_pattern.match(time_str))

def validate_timezone(timezone: str) -> bool:
    """Validate timezone string"""
    try:
        import pytz
        return timezone in pytz.all_timezones
    except ImportError:
        # If pytz is not available, do basic format validation
        return bool(re.match(r"^[A-Za-z_]+/[A-Za-z_]+$", timezone))
