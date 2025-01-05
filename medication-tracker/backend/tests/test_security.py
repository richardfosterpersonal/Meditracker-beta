import pytest
from fastapi.testclient import TestClient
from app.main import create_app

@pytest.fixture
def test_client():
    app = create_app()
    with TestClient(app) as test_client:
        yield test_client

def test_rate_limiting(test_client):
    """Test rate limiting middleware"""
    print("\nTesting rate limiting...")
    responses = []
    # Make 101 requests (above our 100 request limit)
    for _ in range(101):
        response = test_client.get('/api/health')
        responses.append(response.status_code)
    
    # Check if we got rate limited
    assert 429 in responses, "Rate limiting not working - no 429 status code found"
    print("✓ Rate limiting test passed")

def test_security_headers(test_client):
    """Test security headers are present"""
    print("\nTesting security headers...")
    response = test_client.get('/api/health')
    headers = response.headers
    
    required_headers = {
        'Content-Security-Policy': 'default-src',
        'X-Content-Type-Options': 'nosniff',
        'X-Frame-Options': 'DENY',
        'X-XSS-Protection': '1; mode=block',
        'Strict-Transport-Security': 'max-age=31536000'
    }
    
    for header, value in required_headers.items():
        assert header in headers, f"Missing security header: {header}"
        assert value in headers[header], f"Invalid value for {header}: {headers[header]}"
    print("✓ Security headers test passed")

def test_cors_headers(test_client):
    """Test CORS headers"""
    print("\nTesting CORS headers...")
    
    # Test preflight request
    headers = {
        "Origin": "http://localhost:3000",
        "Access-Control-Request-Method": "GET",
        "Access-Control-Request-Headers": "Content-Type",
    }
    response = test_client.options("/api/health", headers=headers)
    
    assert response.status_code == 200
    assert response.headers["access-control-allow-origin"] == "http://localhost:3000"
    assert "GET" in response.headers["access-control-allow-methods"]
    assert response.headers["access-control-allow-credentials"] == "true"
    
    # Test actual request
    headers = {"Origin": "http://localhost:3000"}
    response = test_client.get("/api/health", headers=headers)
    
    assert response.status_code == 200
    assert response.headers["access-control-allow-origin"] == "http://localhost:3000"
    assert response.headers["access-control-allow-credentials"] == "true"
    print("✓ CORS headers test passed")
