import sys
import os
from pathlib import Path

# Add the parent directory to Python path
sys.path.append(str(Path(__file__).parent.parent))

from app.utils.vapid_keys import get_vapid_keys

def init_vapid():
    print("Initializing VAPID keys...")
    
    # Generate or get existing VAPID keys
    keys = get_vapid_keys()
    
    if not keys:
        print("Failed to generate VAPID keys!")
        return False
    
    # Create .env file for backend
    backend_env_path = Path(__file__).parent.parent / '.env'
    frontend_env_path = Path(__file__).parent.parent.parent / 'frontend' / '.env'
    
    # Write backend .env file
    with open(backend_env_path, 'a') as f:
        f.write(f"\n# VAPID Keys for Push Notifications\n")
        f.write(f"VAPID_PUBLIC_KEY={keys['public_key']}\n")
        f.write(f"VAPID_PRIVATE_KEY={keys['private_key']}\n")
    
    # Write frontend .env file
    with open(frontend_env_path, 'a') as f:
        f.write(f"\n# VAPID Public Key for Push Notifications\n")
        f.write(f"REACT_APP_VAPID_PUBLIC_KEY={keys['public_key']}\n")
    
    print("VAPID keys have been generated and saved to environment files!")
    print(f"Backend .env file: {backend_env_path}")
    print(f"Frontend .env file: {frontend_env_path}")
    return True

if __name__ == "__main__":
    init_vapid()
