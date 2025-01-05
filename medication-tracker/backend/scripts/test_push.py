import requests
import json
import os
from pathlib import Path
from dotenv import load_dotenv

# Load environment variables
env_path = Path(__file__).parent.parent / '.env'
load_dotenv(env_path)

def test_push_notification(auth_token):
    """Test sending a push notification"""
    
    # API endpoint
    url = 'http://localhost:5000/api/test/push-notification'
    
    # Headers
    headers = {
        'Content-Type': 'application/json',
        'Authorization': f'Bearer {auth_token}'
    }
    
    # Example subscription (this should match what you get from the frontend)
    subscription = {
        "endpoint": "https://fcm.googleapis.com/fcm/send/example-endpoint",
        "keys": {
            "p256dh": "your-p256dh-key",
            "auth": "your-auth-key"
        }
    }
    
    # Send request
    try:
        response = requests.post(
            url,
            headers=headers,
            json={'subscription': subscription}
        )
        
        print(f"Status Code: {response.status_code}")
        print(f"Response: {response.json()}")
        
    except Exception as e:
        print(f"Error: {str(e)}")

if __name__ == "__main__":
    # You'll need to provide a valid JWT token
    auth_token = input("Enter your JWT token: ")
    test_push_notification(auth_token)
