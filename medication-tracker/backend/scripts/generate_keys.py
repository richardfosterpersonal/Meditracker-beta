import secrets
import base64
import os

def generate_secret_key(length=32):
    """Generate a secure random key."""
    return base64.b64encode(secrets.token_bytes(length)).decode('utf-8')

def generate_env_files():
    """Generate development and production .env files with secure keys."""
    # Generate secure keys
    keys = {
        'SECRET_KEY': generate_secret_key(),
        'JWT_SECRET_KEY': generate_secret_key(),
        'SESSION_SECRET': generate_secret_key(),
        'COOKIE_SECRET': generate_secret_key(),
        'DATA_ENCRYPTION_KEY': generate_secret_key(32),  # 256-bit key
    }

    # Common settings
    common_settings = f"""# Email Settings
MAIL_SERVER=smtp.gmail.com
MAIL_PORT=465
MAIL_USERNAME=smartmedtracker@gmail.com
MAIL_PASSWORD=dwki onvx bmai tasn
MAIL_DEFAULT_SENDER=smartmedtracker@gmail.com
MAIL_USE_SSL=True

# Web Push Configuration
VAPID_PUBLIC_KEY=BA9Ep9Ujm1to8i3ypCHeQxJC4f2cJ0bgc2qbyjqpyohe20TCtLl8_L19E0JM5Lcxh3CQgwBmZFIVsJfT5ljRm60
VAPID_PRIVATE_KEY=MIGHAgEAMBMGByqGSM49AgEGCCqGSM49AwEHBG0wawIBAQQgNVRDUkQ+tj+D1TjoexO9iswKm9QOmeMxZt+ksgTdQA6hRANCAAQPRKfVI5tbaPIt8qQh3kMSQuH9nCdG4HNqm8o6qcqIXttEwrS5fPy9fRNCTOS3MYdwkIMAZmRSFbCX0+ZY0Zut

# Security Settings
PASSWORD_SALT_ROUNDS=12
RATE_LIMIT_WINDOW_MS=900000
RATE_LIMIT_MAX_REQUESTS=100

# HIPAA Compliance
AUDIT_LOG_RETENTION_DAYS=2555
PHI_ACCESS_LOG_ENABLED=true

# Database Configuration
DB_MAX_CONNECTIONS=20
DB_MIN_CONNECTIONS=5"""

    # Development environment
    dev_env = f"""FLASK_APP=app
FLASK_ENV=development
PORT=5000

# Security Keys
SECRET_KEY={keys['SECRET_KEY']}
JWT_SECRET_KEY={keys['JWT_SECRET_KEY']}
SESSION_SECRET={keys['SESSION_SECRET']}
COOKIE_SECRET={keys['COOKIE_SECRET']}
DATA_ENCRYPTION_KEY={keys['DATA_ENCRYPTION_KEY']}

# Database Configuration
DATABASE_URL=sqlite:///instance/medication_tracker.db

# Security Settings
CORS_ORIGIN=http://localhost:3001
LOG_LEVEL=debug
SECURITY_ALERT_EMAIL=smartmedtracker@gmail.com

# SSL/TLS Configuration
SSL_ENABLED=false
SSL_CERT_PATH=./certificates
SSL_KEY_PATH=./certificates

# Base URLs
BASE_URL=http://localhost:3001
API_URL=http://localhost:5000

{common_settings}"""

    # Production environment
    prod_env = f"""FLASK_APP=app
FLASK_ENV=production
PORT=5000

# Security Keys
SECRET_KEY={generate_secret_key()}
JWT_SECRET_KEY={generate_secret_key()}
SESSION_SECRET={generate_secret_key()}
COOKIE_SECRET={generate_secret_key()}
DATA_ENCRYPTION_KEY={generate_secret_key(32)}

# Database Configuration
DATABASE_URL=postgresql://user:password@localhost:5432/medication_tracker

# Security Settings
CORS_ORIGIN=https://app.medication-tracker.com
LOG_LEVEL=info
SECURITY_ALERT_EMAIL=smartmedtracker@gmail.com

# SSL/TLS Configuration
SSL_ENABLED=true
SSL_CERT_PATH=/etc/ssl/private/medication-tracker
SSL_KEY_PATH=/etc/ssl/private/medication-tracker

# Base URLs
BASE_URL=https://app.medication-tracker.com
API_URL=https://api.medication-tracker.com

{common_settings}"""

    # Write development environment file
    with open('../.env.development', 'w') as f:
        f.write(dev_env)

    # Write production environment file
    with open('../.env.production', 'w') as f:
        f.write(prod_env)

    # Copy development as current .env
    with open('../.env', 'w') as f:
        f.write(dev_env)

    print("Environment files generated successfully!")
    print("\nNOTE: Update the following in production:")
    print("1. DATABASE_URL with actual database credentials")
    print("2. CORS_ORIGIN with actual frontend domain")
    print("3. SSL certificate paths")
    print("4. Email settings")
    print("5. Base URLs")

if __name__ == '__main__':
    generate_env_files()
