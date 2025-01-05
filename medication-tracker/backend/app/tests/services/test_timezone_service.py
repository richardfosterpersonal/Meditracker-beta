import pytest
from datetime import datetime
import pytz
from app.services.timezone.timezone_service import TimezoneService

@pytest.fixture
def timezone_service():
    return TimezoneService()

def test_valid_timezones(timezone_service):
    """Test timezone validation"""
    assert timezone_service.is_valid_timezone('America/New_York')
    assert timezone_service.is_valid_timezone('Europe/London')
    assert timezone_service.is_valid_timezone('Asia/Tokyo')
    assert not timezone_service.is_valid_timezone('Invalid/Timezone')

def test_utc_to_local(timezone_service):
    """Test UTC to local conversion"""
    utc_time = datetime(2024, 12, 12, 11, 55, 21)  # 11:55:21 UTC
    ny_time = timezone_service.utc_to_local(utc_time, 'America/New_York')
    assert ny_time.hour == 6  # 6:55:21 EST
    assert ny_time.minute == 55
    assert ny_time.second == 21

def test_local_to_utc(timezone_service):
    """Test local to UTC conversion"""
    ny_time = datetime(2024, 12, 12, 6, 55, 21)  # 6:55:21 EST
    utc_time = timezone_service.local_to_utc(ny_time, 'America/New_York')
    assert utc_time.hour == 11  # 11:55:21 UTC
    assert utc_time.minute == 55
    assert utc_time.second == 21

def test_dst_check(timezone_service):
    """Test DST detection"""
    # Test summer time (DST)
    summer = datetime(2024, 7, 1, 12, 0, 0)
    assert timezone_service.is_dst('America/New_York', summer)
    
    # Test winter time (non-DST)
    winter = datetime(2024, 12, 12, 12, 0, 0)
    assert not timezone_service.is_dst('America/New_York', winter)

def test_format_time(timezone_service):
    """Test time formatting"""
    test_time = datetime(2024, 12, 12, 11, 55, 21)  # UTC
    formatted = timezone_service.format_time(test_time, 'America/New_York', '%I:%M %p %Z')
    assert formatted == '06:55 AM EST'

def test_current_offset(timezone_service):
    """Test UTC offset calculation"""
    # Test winter offset for NY (EST: UTC-5)
    winter_time = datetime(2024, 12, 12, 12, 0, 0)
    offset = timezone_service.get_current_offset('America/New_York')
    assert abs(offset + 5) < 0.1  # Should be close to -5

def test_times_within_interval(timezone_service):
    """Test interval checking between times"""
    time1 = datetime(2024, 12, 12, 11, 55, 21)  # UTC
    time2 = datetime(2024, 12, 12, 11, 55, 51)  # 30 seconds later
    
    # Times are within 1 minute
    assert timezone_service.are_times_within_interval(
        time1, time2, 'America/New_York', 1
    )
    
    # Times are not within 20 seconds
    assert not timezone_service.are_times_within_interval(
        time1, time2, 'America/New_York', 0.33
    )

def test_quiet_hours(timezone_service):
    """Test quiet hours checking"""
    # Test time: 11:55:21 UTC (06:55:21 EST)
    test_time = datetime(2024, 12, 12, 11, 55, 21)
    
    # Quiet hours: 22:00 - 08:00
    assert timezone_service.is_quiet_hours(
        test_time,
        'America/New_York',
        '22:00',
        '08:00'
    )
    
    # Quiet hours: 09:00 - 17:00
    assert not timezone_service.is_quiet_hours(
        test_time,
        'America/New_York',
        '09:00',
        '17:00'
    )

def test_invalid_inputs(timezone_service):
    """Test error handling for invalid inputs"""
    with pytest.raises(ValueError):
        timezone_service.utc_to_local('not a datetime', 'America/New_York')
    
    with pytest.raises(ValueError):
        timezone_service.local_to_utc(datetime.now(), 'Invalid/Timezone')
    
    with pytest.raises(ValueError):
        timezone_service.format_time('not a datetime', 'America/New_York')
    
    with pytest.raises(ValueError):
        timezone_service.get_current_offset('Invalid/Timezone')

def test_dst_transition(timezone_service):
    """Test DST transition detection"""
    # Get next transition
    transition = timezone_service.get_next_dst_transition('America/New_York')
    
    # Should return a transition
    assert transition is not None
    assert 'timestamp' in transition
    assert 'is_dst' in transition
    assert 'offset' in transition
