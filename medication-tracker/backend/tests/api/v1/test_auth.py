import pytest
from fastapi import status

def test_register_user(client):
    """Test user registration"""
    response = client.post("/api/v1/auth/register", json={
        "email": "newuser@example.com",
        "password": "Password123!",
        "name": "New User"
    })
    assert response.status_code == status.HTTP_200_OK
    data = response.json()
    assert "access_token" in data
    assert "refresh_token" in data
    assert data["success"] is True

def test_register_duplicate_email(client, test_user):
    """Test registration with existing email"""
    response = client.post("/api/v1/auth/register", json={
        "email": test_user["email"],
        "password": "Password123!",
        "name": "Duplicate User"
    })
    assert response.status_code == status.HTTP_409_CONFLICT

def test_login_success(client, test_user):
    """Test successful login"""
    response = client.post("/api/v1/auth/login", json={
        "email": test_user["email"],
        "password": test_user["password"]
    })
    assert response.status_code == status.HTTP_200_OK
    data = response.json()
    assert "access_token" in data
    assert "refresh_token" in data

def test_login_invalid_credentials(client):
    """Test login with invalid credentials"""
    response = client.post("/api/v1/auth/login", json={
        "email": "wrong@example.com",
        "password": "wrongpassword"
    })
    assert response.status_code == status.HTTP_401_UNAUTHORIZED

def test_refresh_token(client, auth_headers):
    """Test token refresh"""
    response = client.post(
        "/api/v1/auth/refresh-token",
        headers=auth_headers
    )
    assert response.status_code == status.HTTP_200_OK
    data = response.json()
    assert "access_token" in data
    assert "refresh_token" in data

def test_refresh_token_invalid(client):
    """Test token refresh with invalid token"""
    response = client.post(
        "/api/v1/auth/refresh-token",
        headers={"Authorization": "Bearer invalid-token"}
    )
    assert response.status_code == status.HTTP_401_UNAUTHORIZED

def test_request_password_reset(client, test_user):
    """Test password reset request"""
    response = client.post("/api/v1/auth/request-password-reset", json={
        "email": test_user["email"]
    })
    assert response.status_code == status.HTTP_200_OK
    assert "message" in response.json()

def test_verify_email(client, auth_headers):
    """Test email verification"""
    response = client.post(
        "/api/v1/auth/verify-email",
        headers=auth_headers,
        json={"token": "test-verification-token"}
    )
    # Should fail because token is invalid, but endpoint is accessible
    assert response.status_code == status.HTTP_400_BAD_REQUEST

@pytest.mark.parametrize("endpoint", [
    "/api/v1/auth/register",
    "/api/v1/auth/login",
    "/api/v1/auth/request-password-reset"
])
def test_rate_limiting(client, endpoint):
    """Test rate limiting on authentication endpoints"""
    # Make 6 requests (limit is 5 per minute)
    for i in range(6):
        response = client.post(endpoint, json={
            "email": f"test{i}@example.com",
            "password": "testpass123"
        })
        if i < 5:
            assert response.status_code != status.HTTP_429_TOO_MANY_REQUESTS
        else:
            assert response.status_code == status.HTTP_429_TOO_MANY_REQUESTS
