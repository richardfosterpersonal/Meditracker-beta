"""
Create Test Database
Last Updated: 2024-12-25T22:28:24+01:00
Critical Path: Database.Setup
"""

import sqlalchemy as sa
from sqlalchemy_utils import database_exists, create_database

# Test database URL
TEST_DB_URL = "postgresql://postgres:development_password@localhost/test_medication_tracker"

def create_test_database():
    """Create test database if it doesn't exist"""
    if not database_exists(TEST_DB_URL):
        create_database(TEST_DB_URL)
        print(f"Created test database at {TEST_DB_URL}")
    else:
        print(f"Test database already exists at {TEST_DB_URL}")

if __name__ == "__main__":
    create_test_database()
