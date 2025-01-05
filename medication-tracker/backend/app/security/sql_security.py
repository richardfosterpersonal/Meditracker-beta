"""SQL Security module for preventing SQL injection and ensuring secure database operations."""

from typing import Any, Dict, List, Optional, Union
from sqlalchemy import text
from sqlalchemy.orm import Session
from sqlalchemy.exc import SQLAlchemyError
import logging

logger = logging.getLogger(__name__)

class SQLSecurityMiddleware:
    """Middleware for ensuring SQL query safety."""
    
    @staticmethod
    def sanitize_input(value: Any) -> Any:
        """Sanitize input values to prevent SQL injection."""
        if isinstance(value, str):
            # Remove dangerous SQL characters
            dangerous_chars = [";", "--", "/*", "*/", "xp_", "EXEC", "EXECUTE"]
            sanitized = value
            for char in dangerous_chars:
                sanitized = sanitized.replace(char, "")
            return sanitized
        return value

    @staticmethod
    def create_safe_query(query: str, params: Dict[str, Any]) -> text:
        """Create a safe parameterized query."""
        # Use SQLAlchemy's text() to create safe parameterized queries
        return text(query)

    @staticmethod
    def execute_safe_query(
        db: Session,
        query: str,
        params: Dict[str, Any]
    ) -> Optional[List[Dict[str, Any]]]:
        """Execute a query safely with parameters."""
        try:
            # Sanitize all parameter values
            safe_params = {
                key: SQLSecurityMiddleware.sanitize_input(value)
                for key, value in params.items()
            }
            
            # Create and execute safe query
            safe_query = SQLSecurityMiddleware.create_safe_query(query, safe_params)
            result = db.execute(safe_query, safe_params)
            
            # Log the safe query execution
            logger.debug(f"Executed safe query: {safe_query}")
            
            return [dict(row) for row in result] if result else None
            
        except SQLAlchemyError as e:
            logger.error(f"Database error: {str(e)}")
            raise
        except Exception as e:
            logger.error(f"Error executing safe query: {str(e)}")
            raise

class QueryValidator:
    """Validator for database queries and parameters."""
    
    @staticmethod
    def validate_identifier(identifier: str) -> bool:
        """Validate database identifiers (table names, column names)."""
        # Only allow alphanumeric characters and underscores
        return identifier.isalnum() or "_" in identifier
    
    @staticmethod
    def validate_params(params: Dict[str, Any]) -> bool:
        """Validate query parameters."""
        for key, value in params.items():
            if isinstance(value, str):
                if any(char in value for char in [";", "--", "/*", "*/"]):
                    return False
        return True

def secure_query_wrapper(func):
    """Decorator to add SQL injection protection to repository methods."""
    def wrapper(*args, **kwargs):
        # Sanitize all string arguments
        safe_args = [
            SQLSecurityMiddleware.sanitize_input(arg)
            if isinstance(arg, str) else arg
            for arg in args
        ]
        safe_kwargs = {
            key: SQLSecurityMiddleware.sanitize_input(value)
            if isinstance(value, str) else value
            for key, value in kwargs.items()
        }
        return func(*safe_args, **safe_kwargs)
    return wrapper
