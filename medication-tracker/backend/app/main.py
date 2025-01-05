"""
Main Application Entry Point
Critical Path: APP-MAIN
Last Updated: 2025-01-02T20:15:35+01:00
"""

import os
import logging
from typing import Dict, Any
from pathlib import Path
from datetime import datetime, timezone

from flask import Flask, jsonify
from dotenv import load_dotenv

from .core.validation.manager import ValidationManager
from .core.beta_launch import beta_launch_manager
from .core.beta_config import BetaConfig
from .middleware.validation_middleware import register_validation_middleware
from .routes import register_routes
from .database import init_db
from .core.logging import setup_logging
from .core.monitoring import setup_monitoring

# Initialize Flask application
app = Flask(__name__)

@app.before_first_request
async def initialize_app():
    """Initialize application before first request"""
    try:
        # Load environment variables
        load_dotenv()
        
        # Set up logging
        setup_logging()
        
        # Initialize database
        await init_db()
        
        # Set up monitoring
        setup_monitoring()
        
        # Prepare beta launch if in beta mode
        if os.getenv("BETA_MODE", "false").lower() == "true":
            app.logger.info("Preparing beta launch...")
            launch_success = await beta_launch_manager.prepare_launch()
            
            if not launch_success:
                app.logger.error("Beta launch preparation failed")
                raise Exception("Beta launch preparation failed")
                
            app.logger.info("Beta launch preparation completed successfully")
            
        # Register middleware
        register_validation_middleware(app)
        
        # Register routes
        register_routes(app)
        
    except Exception as e:
        app.logger.error(f"Application initialization failed: {str(e)}")
        raise
        
@app.route("/health")
async def health_check():
    """Health check endpoint"""
    try:
        # Get validation manager status
        validation_status = ValidationManager()._validation_state
        
        # Get beta status if in beta mode
        beta_status = None
        if os.getenv("BETA_MODE", "false").lower() == "true":
            beta_status = beta_launch_manager.get_launch_status()
            
        return jsonify({
            "status": "healthy",
            "timestamp": datetime.now(timezone.utc).isoformat(),
            "version": os.getenv("API_VERSION", "v1"),
            "validation_status": validation_status,
            "beta_status": beta_status
        })
        
    except Exception as e:
        app.logger.error(f"Health check failed: {str(e)}")
        return jsonify({
            "status": "unhealthy",
            "error": str(e),
            "timestamp": datetime.now(timezone.utc).isoformat()
        }), 500
        
@app.route("/beta/status")
async def beta_status():
    """Beta testing status endpoint"""
    if os.getenv("BETA_MODE", "false").lower() != "true":
        return jsonify({
            "error": "Not in beta mode",
            "timestamp": datetime.now(timezone.utc).isoformat()
        }), 404
        
    try:
        status = beta_launch_manager.get_launch_status()
        return jsonify({
            "status": "active" if status["ready_for_launch"] else "initializing",
            "details": status,
            "features": BetaConfig.FEATURES,
            "monitoring": BetaConfig.MONITORING,
            "timestamp": datetime.now(timezone.utc).isoformat()
        })
        
    except Exception as e:
        app.logger.error(f"Beta status check failed: {str(e)}")
        return jsonify({
            "status": "error",
            "error": str(e),
            "timestamp": datetime.now(timezone.utc).isoformat()
        }), 500

if __name__ == "__main__":
    app.run(debug=os.getenv("FLASK_DEBUG", "false").lower() == "true")
