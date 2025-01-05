"""
Beta Deployment Script
Last Updated: 2025-01-04T00:01:03+01:00
"""

import asyncio
import logging
import os
from pathlib import Path

from app.infrastructure.validation.orchestrator import get_validator
from app.infrastructure.maintenance.contract_maintainer import get_maintainer
from app.core.architecture_contract import get_contract

async def deploy_beta():
    """Deploy beta to getmedminder domain"""
    logging.basicConfig(level=logging.INFO)
    logger = logging.getLogger("beta.deployment")
    
    try:
        # 1. Validate System
        logger.info("Validating system...")
        validator = get_validator()
        validation_results = await validator.validate_system()
        if not all(r.status for r in validation_results.values()):
            raise ValueError("System validation failed")
            
        # 2. Update Contract
        logger.info("Updating contract...")
        maintainer = get_maintainer(Path(__file__).parent.parent)
        await maintainer.update_contract()
        
        # 3. Configure Environment
        logger.info("Configuring environment...")
        if not await configure_environment():
            raise ValueError("Environment configuration failed")
        
        # 4. Build Application
        logger.info("Building application...")
        if not await build_application():
            raise ValueError("Application build failed")
        
        # 5. Deploy to Domain
        logger.info("Deploying to getmedminder...")
        await deploy_to_domain()
        
        # 6. Verify Deployment
        logger.info("Verifying deployment...")
        await verify_deployment()
        
        logger.info("Beta deployment completed successfully")
        
    except Exception as e:
        logger.error(f"Deployment failed: {e}")
        await rollback_deployment()
        raise

async def configure_environment():
    """Configure environment for beta deployment"""
    try:
        # Load beta environment config
        beta_env_path = Path(__file__).parent.parent / "config" / "beta.env"
        if not beta_env_path.exists():
            raise ValueError("Beta environment config not found")
            
        # Read and parse beta config
        with open(beta_env_path, "r", encoding="utf-8") as f:
            env_content = f.read()
            
        # Extract environment variables
        env_vars = {}
        for line in env_content.split("\n"):
            if line and not line.startswith("#"):
                if "=" in line:
                    key, value = line.split("=", 1)
                    env_vars[key.strip()] = value.strip()
                    
        # Set environment variables
        for key, value in env_vars.items():
            os.environ[key] = value
            
        # Verify critical variables
        required_vars = [
            "DATABASE_URL", "DB_USER", "DB_PASSWORD", "FIREBASE_CONFIG"
        ]
        missing_vars = [var for var in required_vars if not os.environ.get(var)]
        if missing_vars:
            raise ValueError(f"Missing required environment variables: {missing_vars}")
            
        return True
        
    except Exception as e:
        logger.error(f"Environment configuration failed: {str(e)}")
        return False

async def build_application():
    """Build the application"""
    try:
        # Build frontend
        logger.info("Building frontend...")
        frontend_path = Path(__file__).parent.parent / "frontend"
        
        # Install frontend dependencies
        os.chdir(frontend_path)
        os.system("npm install")
        
        # Build frontend
        build_result = os.system("npm run build")
        if build_result != 0:
            raise ValueError("Frontend build failed")
            
        # Build backend
        logger.info("Building backend...")
        backend_path = Path(__file__).parent.parent / "backend"
        
        # Install backend dependencies
        os.chdir(backend_path)
        os.system("pip install -r requirements.txt")
        
        # Run backend tests
        test_result = os.system("python -m pytest tests/")
        if test_result != 0:
            raise ValueError("Backend tests failed")
            
        return True
        
    except Exception as e:
        logger.error(f"Build failed: {str(e)}")
        return False

async def deploy_to_domain():
    """Deploy to getmedminder domain"""
    # For Windows deployment, we'll use Docker
    os.system("docker-compose -f docker-compose.beta.yml build")
    os.system("docker-compose -f docker-compose.beta.yml up -d")
    
    # Wait for containers
    await asyncio.sleep(10)

async def verify_deployment():
    """Verify deployment status"""
    # Check containers
    containers = os.popen("docker ps").read()
    if "medminder_frontend" not in containers or "medminder_backend" not in containers:
        raise ValueError("Container verification failed")
    
    # Check health
    health = os.popen("docker inspect -f '{{.State.Health.Status}}' medminder_backend").read().strip()
    if health != "healthy":
        raise ValueError("Health check failed")
    
    # Check logs
    logs = os.popen("docker logs --tail 50 medminder_backend").read()
    if "error" in logs.lower():
        raise ValueError("Log verification failed")

async def rollback_deployment():
    """Rollback deployment if needed"""
    # Stop containers
    os.system("docker-compose -f docker-compose.beta.yml down")
    
    # Remove images
    os.system("docker rmi medminder_frontend medminder_backend")
    
    # Start previous version
    os.system("docker-compose -f docker-compose.beta.yml up -d --build")

if __name__ == "__main__":
    asyncio.run(deploy_beta())
