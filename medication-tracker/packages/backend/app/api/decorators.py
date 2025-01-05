from functools import wraps
from typing import Callable, Type
from fastapi import HTTPException, status, Request
from app.application.exceptions import (
    ValidationError,
    NotFoundException,
    UnauthorizedError,
    ConflictError
)
from app.api.middleware import limiter

def handle_exceptions(func: Callable) -> Callable:
    """Decorator to handle common application exceptions"""
    @wraps(func)
    async def wrapper(*args, **kwargs):
        try:
            return await func(*args, **kwargs)
        except ValidationError as e:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=str(e)
            )
        except NotFoundException as e:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail=str(e)
            )
        except UnauthorizedError as e:
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail=str(e)
            )
        except ConflictError as e:
            raise HTTPException(
                status_code=status.HTTP_409_CONFLICT,
                detail=str(e)
            )
        except Exception as e:
            # Log unexpected exceptions here
            raise HTTPException(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                detail="An unexpected error occurred"
            )
    return wrapper

def rate_limit(limit: int, period: int = 60, by_user: bool = True):
    """
    Rate limiting decorator that limits the number of requests within a time period.
    
    Args:
        limit (int): Number of requests allowed
        period (int): Time period in seconds
        by_user (bool): Whether to limit by user or by IP
    """
    def decorator(func):
        @wraps(func)
        async def wrapper(*args, **kwargs):
            request = kwargs.get('request')
            if not request:
                for arg in args:
                    if isinstance(arg, Request):
                        request = arg
                        break
            
            if not request:
                raise ValueError("No request object found in arguments")

            # Get the key for rate limiting (user ID or IP)
            if by_user and hasattr(request, 'user'):
                key = str(request.user.id)
            else:
                key = request.client.host

            # Apply rate limit
            @limiter.limit(f"{limit}/{period}s", key_func=lambda: key)
            async def rate_limited_func():
                return await func(*args, **kwargs)

            return await rate_limited_func()
        return wrapper
    return decorator
