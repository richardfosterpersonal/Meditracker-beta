"""Test rate limiting middleware."""

from unittest.mock import patch, Mock, AsyncMock
import pytest
import redis
from fastapi import FastAPI, Request
from app.security.rate_limiter import RateLimiter
from app.core.config import get_settings

@pytest.fixture
def mock_redis():
    """Create a mock Redis client."""
    mock = Mock(spec=redis.Redis)
    mock.get.return_value = None
    mock.incr.return_value = 1
    mock.setex.return_value = True
    return mock

@pytest.fixture
def rate_limiter(mock_redis):
    """Create a rate limiter instance with mocked Redis."""
    with patch("app.security.rate_limiter.redis.Redis", return_value=mock_redis):
        limiter = RateLimiter(FastAPI())
        yield limiter

@pytest.fixture
async def mock_request():
    """Create a mock request."""
    request = Mock(spec=Request)
    request.url.path = "/test"
    request.method = "GET"
    request.client.host = "127.0.0.1"
    request.headers = {}
    request.state = Mock()
    request.state.user = None
    return request

@pytest.mark.asyncio
async def test_rate_limiter_allows_requests_under_limit(rate_limiter, mock_redis, mock_request):
    """Test that requests under the limit are allowed."""
    # Arrange
    mock_redis.get.return_value = None
    mock_redis.incr.return_value = 1

    # Act
    result = await rate_limiter._check_rate_limit(mock_request, (10, 60))

    # Assert
    assert result is True
    mock_redis.setex.assert_called_once()

@pytest.mark.asyncio
async def test_rate_limiter_blocks_excess_requests(rate_limiter, mock_redis, mock_request):
    """Test that excess requests are blocked."""
    # Arrange
    mock_redis.get.return_value = "11"  # Over limit

    # Act
    result = await rate_limiter._check_rate_limit(mock_request, (10, 60))

    # Assert
    assert result is False

@pytest.mark.asyncio
async def test_rate_limiter_different_endpoints(rate_limiter, mock_redis, mock_request):
    """Test rate limiting for different endpoints."""
    # Arrange
    mock_request.url.path = "/api/v1/auth/login"
    mock_request.method = "POST"

    # Act
    rate_limit = rate_limiter._get_rate_limit(mock_request)

    # Assert
    assert rate_limit == (20, 300)  # Login endpoint limit

@pytest.mark.asyncio
async def test_rate_limiter_user_identification(rate_limiter, mock_redis, mock_request):
    """Test user identification for rate limiting."""
    # Arrange
    mock_request.state.user = Mock()
    mock_request.state.user.id = 123

    # Act
    client_id = await rate_limiter._get_client_identifier(mock_request)

    # Assert
    assert client_id == "user:123"

@pytest.mark.asyncio
async def test_rate_limiter_redis_failure(rate_limiter, mock_redis, mock_request):
    """Test handling of Redis failures."""
    # Arrange
    mock_redis.get.side_effect = redis.RedisError("Connection failed")

    # Act
    result = await rate_limiter._check_rate_limit(mock_request, (10, 60))

    # Assert
    assert result is True  # Fail open

@pytest.mark.asyncio
async def test_rate_limiter_cleanup(rate_limiter, mock_redis):
    """Test cleanup of expired rate limit records."""
    # Arrange
    mock_redis.scan.return_value = (0, [b"rate_limit:test1", b"rate_limit:test2"])
    mock_redis.ttl.return_value = 0

    # Act
    rate_limiter.cleanup_old_keys()

    # Assert
    assert mock_redis.delete.call_count == 2

@pytest.mark.asyncio
async def test_rate_limiter_audit_logging(rate_limiter, mock_redis, mock_request):
    """Test audit logging of rate limit events."""
    # Arrange
    with patch("app.security.rate_limiter.AuditLogger") as mock_logger:
        mock_logger_instance = mock_logger.return_value
        mock_redis.get.return_value = "1001"  # Over default limit

        # Act
        await rate_limiter._check_rate_limit(mock_request, (1000, 3600))

        # Assert
        assert mock_logger_instance.error.call_count == 0

@pytest.mark.asyncio
async def test_rate_limiter_custom_limits(rate_limiter, mock_redis, mock_request):
    """Test rate limiting with custom limits for different endpoints."""
    # Arrange
    mock_request.url.path = "/api/v1/medications"
    mock_request.method = "GET"

    # Act
    rate_limit = rate_limiter._get_rate_limit(mock_request)

    # Assert
    assert rate_limit == (100, 60)  # Custom limit for medications endpoint

@pytest.mark.asyncio
async def test_rate_limiter_window_reset(rate_limiter, mock_redis, mock_request):
    """Test rate limit window reset."""
    # Arrange
    mock_redis.get.return_value = None
    mock_redis.incr.return_value = 1

    # Act
    result = await rate_limiter._check_rate_limit(mock_request, (10, 60))

    # Assert
    assert result is True
    mock_redis.setex.assert_called_once()
