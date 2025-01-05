"""
Hostinger WSGI Configuration
Last Updated: 2025-01-02T14:05:41+01:00
"""

import os
import sys

# Add application directory to path
INTERP = os.path.expanduser("/usr/local/bin/python3.9")
if sys.executable != INTERP:
    os.execl(INTERP, INTERP, *sys.argv)

# Add your application directory to the Python path
sys.path.append(os.path.dirname(__file__))

# Import FastAPI app
from app.main import app
from app.core.unified_validation_framework import UnifiedValidationFramework

# Initialize validation framework
validation = UnifiedValidationFramework()

# Create WSGI application
from fastapi.middleware.wsgi import WSGIMiddleware
application = WSGIMiddleware(app)
