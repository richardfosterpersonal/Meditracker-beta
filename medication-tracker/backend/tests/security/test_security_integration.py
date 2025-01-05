"""Integration tests for security components."""

from unittest.mock import patch, Mock, AsyncMock
import pytest
import redis
from fastapi import FastAPI, Request, Response
from starlette.testclient import TestClient
from app.security.rate_limiter import RateLimiter
from app.security.audit_logger import AuditLogger
from app.security.sql_security import secure_query_wrapper as secure_query
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
def mock_settings():
    """Create mock settings."""
    settings = Mock()
    settings.AUDIT_LOG_PATH = "test_audit.log"
    settings.REDIS_HOST = "localhost"
    settings.REDIS_PORT = 6379
    settings.REDIS_PASSWORD = None
    settings.REDIS_SSL = False
    return settings

@pytest.fixture
def app(mock_redis, mock_settings):
    """Create a test FastAPI application with security middleware."""
    app = FastAPI()
    
    with patch("app.security.rate_limiter.redis.Redis", return_value=mock_redis), \
         patch("pathlib.Path.mkdir"), \
         patch("pathlib.Path.exists", return_value=True), \
         patch("app.core.config.get_settings", return_value=mock_settings):
        
        # Add rate limiting middleware
        app.add_middleware(RateLimiter)
        
        # Add test endpoints
        @app.get("/test")
        async def test_endpoint():
            return {"message": "success"}
        
        @app.get("/secure")
        @secure_query
        async def secure_endpoint():
            return {"message": "secure"}
        
        yield app

@pytest.fixture
def client(app):
    """Create a test client."""
    return TestClient(app)

def test_secure_endpoint_with_rate_limit(client, mock_redis):
    """Test secure endpoint with rate limiting."""
    # Test successful request
    response = client.get("/secure")
    assert response.status_code == 200
    
    # Test rate limited request
    mock_redis.get.return_value = "1001"  # Over limit
    response = client.get("/secure")
    assert response.status_code == 429

def test_security_headers(client):
    """Test security headers are set correctly."""
    response = client.get("/test")
    assert response.status_code == 200
    assert "X-Frame-Options" in response.headers
    assert "X-Content-Type-Options" in response.headers
    assert "X-XSS-Protection" in response.headers

def test_audit_logging_integration(client, mock_redis):
    """Test audit logging integration."""
    with patch("app.security.audit_logger.AuditLogger") as mock_logger:
        mock_logger_instance = mock_logger.return_value
        
        # Test successful request
        response = client.get("/test")
        assert response.status_code == 200
        mock_logger_instance.info.assert_called()
        
        # Test rate limited request
        mock_redis.get.return_value = "1001"  # Over limit
        response = client.get("/test")
        assert response.status_code == 429
        mock_logger_instance.warning.assert_called()

def test_sql_security_integration(client):
    """Test SQL security integration."""
    with patch("app.security.sql_security.secure_query") as mock_secure_query:
        response = client.get("/secure")
        assert response.status_code == 200
        mock_secure_query.assert_called()

def test_concurrent_security_components(client, mock_redis):
    """Test concurrent operation of security components."""
    with patch("app.security.audit_logger.AuditLogger") as mock_logger:
        mock_logger_instance = mock_logger.return_value
        
        # Multiple concurrent requests
        responses = []
        for _ in range(5):
            responses.append(client.get("/test"))
        
        assert all(r.status_code == 200 for r in responses)
        assert mock_logger_instance.info.call_count >= 5

def test_security_component_failure_handling(client, mock_redis):
    """Test handling of security component failures."""
    # Test Redis failure
    mock_redis.get.side_effect = redis.RedisError("Connection failed")
    response = client.get("/test")
    assert response.status_code == 200  # Fail open
    
    # Test audit logger failure
    with patch("app.security.audit_logger.AuditLogger.info", side_effect=Exception("Logger error")):
        response = client.get("/test")
        assert response.status_code == 200  # Continue despite logger failure

def test_security_audit_trail(client, mock_redis):
    """Test complete security audit trail."""
    with patch("app.security.audit_logger.AuditLogger") as mock_logger:
        mock_logger_instance = mock_logger.return_value
        
        # Test successful flow
        response = client.get("/secure")
        assert response.status_code == 200
        mock_logger_instance.info.assert_called()
        
        # Test security event
        mock_redis.get.return_value = "1001"  # Over limit
        response = client.get("/secure")
        assert response.status_code == 429
        mock_logger_instance.warning.assert_called()

def test_security_error_handling(client):
    """Test error handling in security components."""
    with patch("app.security.sql_security.secure_query", side_effect=Exception("Security error")):
        response = client.get("/secure")
        assert response.status_code in (400, 500)  # Should handle error gracefully

def test_rate_limit_by_endpoint(client, mock_redis):
    """Test different rate limits for different endpoints."""
    # Test default endpoint
    response = client.get("/test")
    assert response.status_code == 200
    
    # Test secure endpoint
    response = client.get("/secure")
    assert response.status_code == 200
    
    # Test rate limited
    mock_redis.get.return_value = "1001"  # Over limit
    response = client.get("/secure")
    assert response.status_code == 429
