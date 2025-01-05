"""
Application Initialization
Critical Path: APP-INIT
Last Updated: 2025-01-02T16:08:17+01:00
"""

import logging
from pathlib import Path

from flask import Flask
from flask_sqlalchemy import SQLAlchemy

from .core.config import config

# Set up logging
logging.basicConfig(level=config.get_str("features.validation.log_level"))
logger = logging.getLogger(__name__)

# Set version
__version__ = config.version

# Create the SQLAlchemy instance
db = SQLAlchemy()

def create_app():
    """Create Flask application"""
    app = Flask(__name__)
    
    # Configure the app
    app.config["SQLALCHEMY_DATABASE_URI"] = "sqlite:///./app.db"
    app.config["SQLALCHEMY_TRACK_MODIFICATIONS"] = False
    
    # Initialize SQLAlchemy
    db.init_app(app)
    
    # Initialize routes
    from .routes import medication_routes, notification_routes
    app.register_blueprint(medication_routes)
    app.register_blueprint(notification_routes)
    
    # Initialize middleware
    from .middleware.validation_middleware import validate_request
    
    logger.info(f"Application v{__version__} initialized")
    return app

__all__ = [
    "create_app",
    "db",
    "__version__"
]