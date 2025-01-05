"""Test health check endpoint functionality."""
import pytest
from fastapi.testclient import TestClient
from app.main import app


@pytest.fixture
def client():
    """Create test client."""
    return TestClient(app)


def test_health_check(client):
    """Test health check endpoint returns correct response."""
    response = client.get("/health")
    assert response.status_code == 200
    assert response.json() == {"status": "healthy"}


def test_health_check_headers(client):
    """Test health check endpoint headers."""
    response = client.get("/health")
    assert "application/json" in response.headers["content-type"]


def test_health_check_no_auth_required(client):
    """Test health check endpoint doesn't require authentication."""
    response = client.get("/health")
    assert response.status_code == 200
    
    # Try with invalid auth header
    response = client.get("/health", headers={"Authorization": "Bearer invalid"})
    assert response.status_code == 200
