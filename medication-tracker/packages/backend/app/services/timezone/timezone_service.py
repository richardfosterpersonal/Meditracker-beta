from datetime import datetime
import pytz
from typing import Optional, List, Dict

class TimezoneService:
    """Service for handling timezone conversions and validations"""
    
    def __init__(self):
        self._timezones = pytz.all_timezones
    
    def get_valid_timezones(self) -> List[str]:
        """Get list of all valid timezone names"""
        return self._timezones
    
    def is_valid_timezone(self, timezone: str) -> bool:
        """Check if a timezone name is valid"""
        return timezone in self._timezones
    
    def utc_to_local(self, utc_dt: datetime, timezone: str) -> datetime:
        """Convert UTC datetime to local time"""
        if not isinstance(utc_dt, datetime):
            raise ValueError("Input must be a datetime object")
            
        if not self.is_valid_timezone(timezone):
            raise ValueError(f"Invalid timezone: {timezone}")
            
        tz = pytz.timezone(timezone)
        return utc_dt.replace(tzinfo=pytz.UTC).astimezone(tz)
    
    def local_to_utc(self, local_dt: datetime, timezone: str) -> datetime:
        """Convert local datetime to UTC"""
        if not isinstance(local_dt, datetime):
            raise ValueError("Input must be a datetime object")
            
        if not self.is_valid_timezone(timezone):
            raise ValueError(f"Invalid timezone: {timezone}")
            
        tz = pytz.timezone(timezone)
        return tz.localize(local_dt).astimezone(pytz.UTC)
    
    def is_dst(self, timezone: str, dt: Optional[datetime] = None) -> bool:
        """Check if a timezone is currently in DST"""
        if not self.is_valid_timezone(timezone):
            raise ValueError(f"Invalid timezone: {timezone}")
            
        tz = pytz.timezone(timezone)
        check_dt = dt if dt else datetime.now(tz)
        return check_dt.dst() != pytz.timedelta(0)
    
    def get_next_dst_transition(self, timezone: str) -> Optional[Dict]:
        """Get information about the next DST transition"""
        if not self.is_valid_timezone(timezone):
            raise ValueError(f"Invalid timezone: {timezone}")
            
        tz = pytz.timezone(timezone)
        now = datetime.now(tz)
        
        # Get transitions for the next year
        transitions = []
        for month in range(1, 13):
            try:
                transition = tz._utc_transition_times[tz._transition_info.index((month,))]
                if transition > now:
                    transitions.append(transition)
            except (ValueError, IndexError):
                continue
        
        if not transitions:
            return None
            
        next_transition = min(transitions)
        return {
            'timestamp': next_transition,
            'is_dst': self.is_dst(timezone, next_transition),
            'offset': tz.utcoffset(next_transition).total_seconds() / 3600
        }
    
    def format_time(self, dt: datetime, timezone: str, fmt: str = '%I:%M %p %Z') -> str:
        """Format a datetime in a specific timezone"""
        if not isinstance(dt, datetime):
            raise ValueError("Input must be a datetime object")
            
        if not self.is_valid_timezone(timezone):
            raise ValueError(f"Invalid timezone: {timezone}")
            
        tz = pytz.timezone(timezone)
        local_dt = dt.replace(tzinfo=pytz.UTC).astimezone(tz)
        return local_dt.strftime(fmt)
    
    def get_current_offset(self, timezone: str) -> float:
        """Get current UTC offset in hours for a timezone"""
        if not self.is_valid_timezone(timezone):
            raise ValueError(f"Invalid timezone: {timezone}")
            
        tz = pytz.timezone(timezone)
        now = datetime.now(tz)
        return tz.utcoffset(now).total_seconds() / 3600
    
    def are_times_within_interval(
        self,
        time1: datetime,
        time2: datetime,
        timezone: str,
        interval_minutes: int
    ) -> bool:
        """Check if two times are within a specified interval in a timezone"""
        if not all(isinstance(t, datetime) for t in [time1, time2]):
            raise ValueError("Both times must be datetime objects")
            
        if not self.is_valid_timezone(timezone):
            raise ValueError(f"Invalid timezone: {timezone}")
            
        tz = pytz.timezone(timezone)
        local1 = time1.replace(tzinfo=pytz.UTC).astimezone(tz)
        local2 = time2.replace(tzinfo=pytz.UTC).astimezone(tz)
        
        diff = abs((local1 - local2).total_seconds() / 60)
        return diff <= interval_minutes
    
    def is_quiet_hours(
        self,
        check_time: datetime,
        timezone: str,
        quiet_start: str,
        quiet_end: str
    ) -> bool:
        """Check if a time falls within quiet hours"""
        if not isinstance(check_time, datetime):
            raise ValueError("check_time must be a datetime object")
            
        if not self.is_valid_timezone(timezone):
            raise ValueError(f"Invalid timezone: {timezone}")
            
        tz = pytz.timezone(timezone)
        local_time = check_time.replace(tzinfo=pytz.UTC).astimezone(tz)
        
        # Parse quiet hours
        start_hour, start_minute = map(int, quiet_start.split(':'))
        end_hour, end_minute = map(int, quiet_end.split(':'))
        
        # Create datetime objects for quiet hours
        quiet_start = local_time.replace(
            hour=start_hour,
            minute=start_minute,
            second=0,
            microsecond=0
        )
        quiet_end = local_time.replace(
            hour=end_hour,
            minute=end_minute,
            second=0,
            microsecond=0
        )
        
        # Handle case where quiet hours span midnight
        if quiet_start <= quiet_end:
            return quiet_start <= local_time <= quiet_end
        else:
            return local_time >= quiet_start or local_time <= quiet_end
