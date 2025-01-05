import pytest
from fastapi import status

def test_get_current_user_profile(client, auth_headers, test_user):
    """Test getting current user profile"""
    response = client.get("/api/v1/users/me", headers=auth_headers)
    assert response.status_code == status.HTTP_200_OK
    data = response.json()
    assert data["email"] == test_user["email"]
    assert "password" not in data

def test_update_user_profile(client, auth_headers):
    """Test updating user profile"""
    new_name = "Updated Name"
    response = client.put(
        "/api/v1/users/me",
        headers=auth_headers,
        json={"name": new_name}
    )
    assert response.status_code == status.HTTP_200_OK
    assert response.json()["name"] == new_name

def test_change_password(client, auth_headers, test_user):
    """Test password change"""
    response = client.post(
        "/api/v1/users/me/change-password",
        headers=auth_headers,
        json={
            "current_password": test_user["password"],
            "new_password": "NewPassword123!"
        }
    )
    assert response.status_code == status.HTTP_200_OK
    
    # Verify can login with new password
    response = client.post("/api/v1/auth/login", json={
        "email": test_user["email"],
        "password": "NewPassword123!"
    })
    assert response.status_code == status.HTTP_200_OK

def test_get_user_stats(client, auth_headers):
    """Test getting user statistics"""
    response = client.get(
        "/api/v1/users/me/stats",
        headers=auth_headers
    )
    assert response.status_code == status.HTTP_200_OK
    data = response.json()
    assert "total_medications" in data
    assert "compliance_rate" in data
    assert "upcoming_doses" in data

def test_become_carer(client, auth_headers):
    """Test becoming a carer"""
    response = client.post(
        "/api/v1/users/me/carer",
        headers=auth_headers,
        json={
            "type": "family",
            "qualifications": {"relation": "spouse"}
        }
    )
    assert response.status_code == status.HTTP_200_OK
    data = response.json()
    assert data["type"] == "family"
    assert data["verified"] is False

def test_assign_carer(client, auth_headers):
    """Test assigning a carer"""
    # First create a carer
    carer_response = client.post(
        "/api/v1/users/me/carer",
        headers=auth_headers,
        json={
            "type": "family",
            "qualifications": {"relation": "spouse"}
        }
    )
    carer_id = carer_response.json()["id"]
    
    # Then assign the carer to the user
    response = client.post(
        "/api/v1/users/me/carers",
        headers=auth_headers,
        json={
            "carer_id": carer_id,
            "permissions": {
                "view_medications": True,
                "view_compliance": True,
                "receive_alerts": True
            }
        }
    )
    assert response.status_code == status.HTTP_200_OK
    data = response.json()
    assert data["carer_id"] == carer_id
    assert data["active"] is True

def test_get_my_carers(client, auth_headers):
    """Test getting user's carers"""
    response = client.get(
        "/api/v1/users/me/carers",
        headers=auth_headers
    )
    assert response.status_code == status.HTTP_200_OK
    assert isinstance(response.json(), list)

def test_get_my_patients(client, auth_headers):
    """Test getting carer's patients"""
    # First become a carer
    client.post(
        "/api/v1/users/me/carer",
        headers=auth_headers,
        json={
            "type": "family",
            "qualifications": {"relation": "spouse"}
        }
    )
    
    response = client.get(
        "/api/v1/users/me/patients",
        headers=auth_headers
    )
    assert response.status_code == status.HTTP_200_OK
    assert isinstance(response.json(), list)

def test_unauthorized_access(client):
    """Test accessing protected endpoints without authentication"""
    protected_endpoints = [
        ("GET", "/api/v1/users/me"),
        ("PUT", "/api/v1/users/me"),
        ("GET", "/api/v1/users/me/stats"),
        ("POST", "/api/v1/users/me/carer"),
        ("GET", "/api/v1/users/me/carers"),
        ("GET", "/api/v1/users/me/patients")
    ]
    
    for method, endpoint in protected_endpoints:
        response = client.request(method, endpoint)
        assert response.status_code == status.HTTP_401_UNAUTHORIZED

def test_rate_limiting_change_password(client, auth_headers):
    """Test rate limiting on password change"""
    # Make 4 requests (limit is 3 per minute)
    for i in range(4):
        response = client.post(
            "/api/v1/users/me/change-password",
            headers=auth_headers,
            json={
                "current_password": "wrong-password",
                "new_password": f"NewPass{i}!"
            }
        )
        if i < 3:
            assert response.status_code != status.HTTP_429_TOO_MANY_REQUESTS
        else:
            assert response.status_code == status.HTTP_429_TOO_MANY_REQUESTS
