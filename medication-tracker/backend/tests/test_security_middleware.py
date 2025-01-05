import pytest
from fastapi.testclient import TestClient
from datetime import datetime, timedelta
import jwt
import redis.asyncio as redis
from app.core.config import settings
from app.middleware.rate_limiter import RateLimiter
from app.middleware.validation import ValidationMiddleware

# Test client setup
client = TestClient(app)

# Mock Redis for rate limiting tests
class MockRedis:
    def __init__(self):
        self.store = {}
        
    async def incr(self, key):
        if key not in self.store:
            self.store[key] = 0
        self.store[key] += 1
        return self.store[key]
        
    async def expire(self, key, seconds):
        pass
        
    async def get(self, key):
        return self.store.get(key, 0)

    async def ttl(self, key):
        return 55

@pytest.fixture
def mock_redis():
    return MockRedis()

# Authentication Tests
class TestAuthentication:
    def test_valid_token(self, test_client, test_headers):
        """Test that valid JWT tokens are accepted."""
        response = test_client.get("/api/auth/me", headers=test_headers)
        assert response.status_code == 200
        assert "email" in response.json()

    def test_invalid_token(self, test_client):
        """Test that invalid tokens are rejected."""
        headers = {"Authorization": "Bearer invalid-token"}
        response = test_client.get("/api/auth/me", headers=headers)
        assert response.status_code == 401
        assert "Invalid authentication credentials" in response.json()["detail"]

    def test_expired_token(self, test_client):
        """Test that expired tokens are rejected."""
        expired_token = jwt.encode(
            {
                "sub": "test@example.com",
                "exp": datetime.utcnow() - timedelta(minutes=30)
            },
            settings.JWT_SECRET_KEY,
            algorithm=settings.ALGORITHM
        )
        headers = {"Authorization": f"Bearer {expired_token}"}
        response = test_client.get("/api/auth/me", headers=headers)
        assert response.status_code == 401
        assert "Invalid authentication credentials" in response.json()["detail"]

    def test_missing_token(self, test_client):
        """Test that requests without tokens are rejected."""
        response = test_client.get("/api/auth/me")
        assert response.status_code == 401
        assert "Not authenticated" in response.json()["detail"]

# Rate Limiting Tests
@pytest.mark.asyncio
class TestRateLimiter:
    async def test_rate_limit_exceeded(self, test_client, test_headers, mock_redis):
        """Test that requests are blocked when rate limit is exceeded."""
        limiter = RateLimiter(mock_redis)
        
        # Make requests up to the limit
        for _ in range(settings.RATE_LIMIT_DEFAULT_REQUESTS):
            mock_redis.incr.return_value = _ + 1
            response = test_client.get("/api/auth/me", headers=test_headers)
            assert response.status_code != 429

        # Next request should be rate limited
        mock_redis.incr.return_value = settings.RATE_LIMIT_DEFAULT_REQUESTS + 1
        response = test_client.get("/api/auth/me", headers=test_headers)
        assert response.status_code == 429
        assert "Rate limit exceeded" in response.json()["detail"]

    async def test_burst_limit(self, test_client, test_headers, mock_redis):
        """Test burst limit functionality."""
        limiter = RateLimiter(mock_redis)
        
        # Exceed normal rate limit
        mock_redis.get.return_value = str(settings.RATE_LIMIT_DEFAULT_REQUESTS + 1)
        
        # Test burst requests
        for i in range(20):  # Try some burst requests
            mock_redis.get.side_effect = [
                str(settings.RATE_LIMIT_DEFAULT_REQUESTS + 1),  # Normal limit
                str(i)  # Burst count
            ]
            response = test_client.get("/api/auth/me", headers=test_headers)
            if i < settings.RATE_LIMIT_DEFAULT_BURST - settings.RATE_LIMIT_DEFAULT_REQUESTS:
                assert response.status_code != 429
            else:
                assert response.status_code == 429
                break

    async def test_ip_based_rate_limit(self, test_client, test_headers, mock_redis):
        """Test IP-based rate limiting."""
        limiter = RateLimiter(mock_redis)
        
        # Test normal IP rate limit
        mock_redis.get.return_value = "900"  # Below hourly limit
        response = test_client.get("/api/auth/me", headers=test_headers)
        assert response.status_code != 429

        # Test exceeded IP rate limit
        mock_redis.get.return_value = "1001"  # Above hourly limit
        mock_redis.get.side_effect = ["1001", "201"]  # IP limit, burst count
        response = test_client.get("/api/auth/me", headers=test_headers)
        assert response.status_code == 429

    async def test_whitelist_blacklist(self, test_client, test_headers, mock_redis):
        """Test whitelist and blacklist functionality."""
        limiter = RateLimiter(mock_redis)
        
        # Test whitelisted IP
        limiter.add_to_whitelist("127.0.0.1")
        response = test_client.get("/api/auth/me", headers=test_headers)
        assert response.status_code != 429

        # Test blacklisted IP
        limiter.add_to_blacklist("127.0.0.1")
        response = test_client.get("/api/auth/me", headers=test_headers)
        assert response.status_code == 403
        assert "IP address blocked" in response.json()["detail"]

    async def test_rate_limit_headers(self, test_client, test_headers, mock_redis):
        """Test rate limit headers in response."""
        limiter = RateLimiter(mock_redis)
        
        mock_redis.get.return_value = "5"  # 5 requests made
        mock_redis.ttl.return_value = 55  # 55 seconds remaining
        
        response = test_client.get("/api/auth/me", headers=test_headers)
        assert response.status_code == 200
        
        # Check headers
        assert "X-RateLimit-Limit" in response.headers
        assert "X-RateLimit-Remaining" in response.headers
        assert "X-RateLimit-Reset" in response.headers
        assert "X-RateLimit-Burst-Remaining" in response.headers
        
        # Verify header values
        assert int(response.headers["X-RateLimit-Remaining"]) == settings.RATE_LIMIT_DEFAULT_REQUESTS - 5
        assert int(response.headers["X-RateLimit-Reset"]) == 55

    async def test_rate_limit_window_reset(self, test_client, test_headers, mock_redis):
        """Test that rate limits reset after the window expires."""
        limiter = RateLimiter(mock_redis)
        
        # Simulate window expiration
        mock_redis.get.return_value = None
        mock_redis.incr.return_value = 1
        
        response = test_client.get("/api/auth/me", headers=test_headers)
        assert response.status_code != 429

# CORS Tests
class TestCORS:
    def test_cors_preflight(self, test_client, test_cors_origins):
        """Test CORS preflight requests."""
        headers = {
            "Origin": test_cors_origins[0],
            "Access-Control-Request-Method": "POST",
            "Access-Control-Request-Headers": "Content-Type",
        }
        response = test_client.options("/api/auth/login", headers=headers)
        assert response.status_code == 200
        assert response.headers["access-control-allow-origin"] == "*"
        assert "POST" in response.headers["access-control-allow-methods"]

    def test_cors_headers(self, test_client, test_cors_origins):
        """Test CORS headers in response."""
        headers = {"Origin": test_cors_origins[0]}
        response = test_client.get("/api/auth/me", headers=headers)
        assert "access-control-allow-origin" in response.headers

# Security Headers Tests
class TestSecurityHeaders:
    def test_security_headers_present(self, test_client, test_security_headers):
        """Test that security headers are present in responses."""
        response = test_client.get("/api/auth/me", headers=test_headers)
        headers = response.headers
        
        for header, value in test_security_headers.items():
            assert headers[header] == value

    def test_content_security_policy(self, test_client, test_security_headers):
        """Test Content Security Policy header."""
        response = test_client.get("/api/auth/me", headers=test_headers)
        assert response.headers["Content-Security-Policy"] == test_security_headers["Content-Security-Policy"]

# Integration Tests
@pytest.mark.asyncio
class TestSecurityIntegration:
    async def test_complete_security_chain(self, test_client, test_headers, mock_redis):
        """Test the complete security middleware chain."""
        limiter = RateLimiter(mock_redis)
        
        # Test with valid token and within rate limit
        mock_redis.incr.return_value = 1
        response = test_client.get("/api/auth/me", headers=test_headers)
        assert response.status_code == 200
        
        # Test with invalid token (should fail before rate limit check)
        invalid_headers = {
            "Authorization": "Bearer invalid-token",
            "Content-Type": "application/json"
        }
        response = test_client.get("/api/auth/me", headers=invalid_headers)
        assert response.status_code == 401  # Auth failure should come before rate limit

        # Test with valid token but exceeded rate limit
        mock_redis.incr.return_value = settings.RATE_LIMIT_DEFAULT_REQUESTS + 1
        response = test_client.get("/api/auth/me", headers=test_headers)
        assert response.status_code == 429
