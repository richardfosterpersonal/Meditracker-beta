"""
Deployment configuration for external access
Last Updated: 2024-12-27T18:44:02+01:00
Critical Path: Deployment
"""

import os
from typing import Optional, ClassVar
from pydantic import BaseModel
from fastapi import HTTPException, Security
from fastapi.security import APIKeyHeader
from .settings import settings

class DeploymentConfig(BaseModel):
    """Deployment configuration with beta access control"""
    
    is_beta: bool = False
    external_url: Optional[str] = None
    api_key_header: ClassVar[APIKeyHeader] = APIKeyHeader(
        name="X-Beta-Key",
        auto_error=False
    )

    @classmethod
    def get_deployment_type(cls) -> str:
        """Get the current deployment type"""
        if settings.EXTERNAL_URL:
            return "external"
        return "local"

    @classmethod
    def get_base_url(cls) -> str:
        """Get the base URL for the current deployment"""
        if settings.EXTERNAL_URL:
            return str(settings.EXTERNAL_URL)
        return "http://localhost:8000"

    @classmethod
    async def validate_beta_access(
        cls,
        api_key: str = Security(api_key_header)
    ) -> bool:
        """Validate beta access key"""
        if not settings.BETA_ACCESS_KEY:
            return True
            
        if not api_key:
            raise HTTPException(
                status_code=401,
                detail="Beta access key required"
            )
            
        if api_key != settings.BETA_ACCESS_KEY:
            raise HTTPException(
                status_code=403,
                detail="Invalid beta access key"
            )
            
        return True

    class Config:
        arbitrary_types_allowed = True

deployment_config = DeploymentConfig(
    is_beta=bool(os.getenv("BETA_MODE", False)),
    external_url=settings.EXTERNAL_URL
)
