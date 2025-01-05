import requests
import time
import json

BASE_URL = "http://localhost:5001/api"

def test_auth_flow():
    print("Starting authentication flow test...")
    
    # Test registration
    register_data = {
        "email": "test@example.com",
        "password": "Test123!",
        "name": "Test User"
    }
    
    try:
        # 1. Test Registration
        print("\n1. Testing Registration...")
        register_response = requests.post(f"{BASE_URL}/register", json=register_data)
        print(f"Registration Response: {register_response.status_code}")
        print(register_response.json())
        
        # 2. Test Login
        print("\n2. Testing Login...")
        login_data = {
            "email": "test@example.com",
            "password": "Test123!"
        }
        login_response = requests.post(f"{BASE_URL}/login", json=login_data)
        print(f"Login Response: {login_response.status_code}")
        login_result = login_response.json()
        print(login_result)
        
        # Save the access token
        access_token = login_result.get('access_token')
        headers = {'Authorization': f'Bearer {access_token}'}
        
        # 3. Test Token Validation
        print("\n3. Testing Token Validation...")
        validate_response = requests.post(f"{BASE_URL}/validate-token", headers=headers)
        print(f"Validation Response: {validate_response.status_code}")
        print(validate_response.json())
        
        # 4. Test Token Refresh
        print("\n4. Testing Token Refresh...")
        refresh_response = requests.post(f"{BASE_URL}/refresh-token", headers=headers)
        print(f"Refresh Response: {refresh_response.status_code}")
        print(refresh_response.json())
        
        # 5. Test Logout
        print("\n5. Testing Logout...")
        logout_response = requests.post(f"{BASE_URL}/logout", headers=headers)
        print(f"Logout Response: {logout_response.status_code}")
        print(logout_response.json() if logout_response.text else "No content")
        
    except requests.exceptions.RequestException as e:
        print(f"Error during test: {str(e)}")
    except json.JSONDecodeError as e:
        print(f"Error decoding JSON response: {str(e)}")
    
    print("\nAuth flow test completed!")

if __name__ == "__main__":
    # Wait a bit for servers to fully start
    time.sleep(2)
    test_auth_flow()
