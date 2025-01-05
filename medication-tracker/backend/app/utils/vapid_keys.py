from cryptography.hazmat.primitives import serialization
from cryptography.hazmat.primitives.asymmetric import ec
import base64
import json
import os
from pathlib import Path
from pywebpush import webpush, WebPushException

# Function to encode a vapid key for use with web push
def encode_vapid_key(key):
    """Encode a vapid key for use with web push"""
    if isinstance(key, bytes):
        key = key.decode('utf-8')
    return key.replace('+', '-').replace('/', '_').replace('=', '')

# Function to generate VAPID keys if they don't exist
def generate_vapid_keys():
    try:
        # Generate the private key
        private_key = ec.generate_private_key(ec.SECP256R1())
        
        # Get the public key
        public_key = private_key.public_key()
        
        # Serialize the private key
        private_bytes = private_key.private_bytes(
            encoding=serialization.Encoding.PEM,
            format=serialization.PrivateFormat.PKCS8,
            encryption_algorithm=serialization.NoEncryption()
        )
        
        # Serialize the public key
        public_bytes = public_key.public_bytes(
            encoding=serialization.Encoding.X962,
            format=serialization.PublicFormat.UncompressedPoint
        )
        
        # Encode keys for web push
        return {
            'private_key': private_bytes.decode('utf-8'),
            'public_key': encode_vapid_key(base64.urlsafe_b64encode(public_bytes))
        }
    except Exception as e:
        print(f"Error generating VAPID keys: {e}")
        return None

# Function to save VAPID keys to a file
def save_vapid_keys(keys, file_path):
    try:
        with open(file_path, 'a') as f:
            f.write("\n# VAPID Keys for Push Notifications\n")
            f.write(f"VAPID_PUBLIC_KEY={keys['public_key']}\n")
            f.write(f"VAPID_PRIVATE_KEY={keys['private_key']}\n")
        return True
    except Exception as e:
        print(f"Error saving VAPID keys: {e}")
        return False

# Function to load VAPID keys from environment or generate new ones
def get_vapid_keys():
    env_path = Path(__file__).parent.parent.parent / '.env'
    
    # Try to load existing keys from environment
    public_key = os.getenv('VAPID_PUBLIC_KEY')
    private_key = os.getenv('VAPID_PRIVATE_KEY')
    
    if public_key and private_key:
        return {
            'public_key': public_key,
            'private_key': private_key
        }
    
    # Generate new keys if they don't exist
    keys = generate_vapid_keys()
    if keys:
        # Save to .env file
        save_vapid_keys(keys, env_path)
        # Set environment variables
        os.environ['VAPID_PUBLIC_KEY'] = keys['public_key']
        os.environ['VAPID_PRIVATE_KEY'] = keys['private_key']
        return keys
    
    return None

# Function to send push notification
def send_push_notification(subscription_info, data, vapid_claims):
    try:
        response = webpush(
            subscription_info=subscription_info,
            data=json.dumps(data),
            vapid_private_key=os.getenv('VAPID_PRIVATE_KEY'),
            vapid_claims=vapid_claims
        )
        return True, response
    except WebPushException as e:
        print(f"Web Push failed: {e}")
        return False, str(e)
    except Exception as e:
        print(f"Error sending push notification: {e}")
        return False, str(e)
