"""
Validation and Context Enforcement Decorators
Critical Path: VALIDATION-CORE-*
Last Updated: 2025-01-01T21:04:02+01:00
"""

from functools import wraps
from typing import Any, Callable, Dict, Optional, Type, TypeVar, cast

from .context_types import ContextLevel
from .validation_chain import ValidationChain, ValidationComponent, ValidationType, ValidationPriority

T = TypeVar('T', bound=Callable[..., Any])

def requires_context(
    component: str,
    feature: Optional[str] = None,
    task: Optional[str] = None
):
    """
    Decorator that enforces context requirements
    Must be applied to ALL functions that implement business logic
    """
    def decorator(func: Callable):
        @wraps(func)
        async def wrapper(*args, **kwargs):
            validation_chain = ValidationChain()
            
            try:
                # Start validation
                validation_chain.start_validation(
                    "VALIDATION-CONTEXT",
                    ValidationComponent.CORE,
                    ValidationType.CHECK,
                    ValidationPriority.HIGHEST
                )
                
                # Build context
                new_context = {
                    ContextLevel.COMPONENT: component
                }
                if feature:
                    new_context[ContextLevel.FEATURE] = feature
                if task:
                    new_context[ContextLevel.TASK] = task
                    
                # Validate context
                if not validation_chain.validate_context_level(new_context):
                    raise ValueError(f"Invalid context for {func.__name__}")
                    
                # Execute function
                result = await func(*args, **kwargs)
                
                # Complete validation
                validation_chain.complete_validation()
                
                return result
                
            except Exception as e:
                validation_chain.fail_validation(str(e))
                raise
                
        return wrapper
    return decorator

def enforce_context(
    context_level: ContextLevel,
    validation_code: str,
    component: ValidationComponent,
    validation_type: ValidationType = ValidationType.CORE,
    priority: ValidationPriority = ValidationPriority.HIGHEST
) -> Callable[[T], T]:
    """Enforce context level for a function"""
    def decorator(func: T) -> T:
        @wraps(func)
        async def wrapper(*args: Any, **kwargs: Any) -> Any:
            validation_chain = ValidationChain()
            
            try:
                # Start validation
                validation_chain.start_validation(
                    validation_code,
                    component,
                    validation_type,
                    priority
                )
                
                # Check context level
                if not validation_chain.validate_context_level(context_level):
                    raise ValueError(f"Invalid context level for {func.__name__}")
                
                # Execute function
                result = await func(*args, **kwargs)
                
                # Complete validation
                validation_chain.complete_validation()
                
                return result
                
            except Exception as e:
                validation_chain.fail_validation(str(e))
                raise
                
        return cast(T, wrapper)
    return decorator

def enforces_requirements(*requirements: str):
    """
    Decorator that enforces specific requirements
    Must be applied to ALL functions that implement requirement-specific logic
    """
    def decorator(func: Callable):
        @wraps(func)
        async def wrapper(*args, **kwargs):
            # Enforce each requirement
            for req in requirements:
                result = await enforcer.enforce_requirement(req)
                if not result["valid"]:
                    raise RequirementError(
                        f"Requirement enforcement failed: {result['error']}",
                        details=result
                    )
                    
            return await func(*args, **kwargs)
        return wrapper
    return decorator

def validates_scope(component: str, feature: str):
    """
    Decorator that validates scope adherence
    Must be applied to ALL functions that implement feature-specific logic
    """
    def decorator(func: Callable):
        @wraps(func)
        async def wrapper(*args, **kwargs):
            # Validate scope
            result = await enforcer.enforce_scope(component, feature)
            if not result["valid"]:
                raise ScopeError(
                    f"Scope validation failed: {result['error']}",
                    details=result
                )
                
            return await func(*args, **kwargs)
        return wrapper
    return decorator

def maintains_critical_path(path_id: str):
    """
    Decorator that enforces critical path validation
    Must be applied to ALL functions in critical paths
    """
    def decorator(func: Callable):
        @wraps(func)
        async def wrapper(*args, **kwargs):
            # Validate critical path
            result = await validator.validate_critical_path(path_id)
            if not result["valid"]:
                raise ValidationError(
                    f"Critical path validation failed: {result['error']}",
                    details=result
                )
                
            return await func(*args, **kwargs)
        return wrapper
    return decorator

def syncs_documentation():
    """
    Decorator that enforces documentation synchronization
    Must be applied to ALL functions that modify code or configuration
    """
    def decorator(func: Callable):
        @wraps(func)
        async def wrapper(*args, **kwargs):
            # Get function metadata
            module = inspect.getmodule(func)
            module_path = module.__file__ if module else "unknown"
            
            # Validate documentation
            result = await validator.validate_documentation_sync()
            if not result["valid"]:
                raise DocumentationError(
                    f"Documentation sync failed: {result['error']}",
                    details=result
                )
                
            # Execute function
            result = await func(*args, **kwargs)
            
            # Record documentation update
            await validator.doc_validator._record_doc_update(
                module_path,
                datetime.utcnow().isoformat()
            )
            
            return result
        return wrapper
    return decorator

def enforce_requirements(
    requirements: Dict[str, Any],
    validation_code: str,
    component: ValidationComponent,
    validation_type: ValidationType = ValidationType.CORE,
    priority: ValidationPriority = ValidationPriority.HIGHEST
) -> Callable[[T], T]:
    """Enforce requirements for a function"""
    def decorator(func: T) -> T:
        @wraps(func)
        async def wrapper(*args: Any, **kwargs: Any) -> Any:
            validation_chain = ValidationChain()
            
            try:
                # Start validation
                validation_chain.start_validation(
                    validation_code,
                    component,
                    validation_type,
                    priority
                )
                
                # Validate requirements
                for key, value in requirements.items():
                    if not validation_chain.validate_requirement(key, value):
                        raise ValueError(f"Requirement {key} not met for {func.__name__}")
                
                # Execute function
                result = await func(*args, **kwargs)
                
                # Complete validation
                validation_chain.complete_validation()
                
                return result
                
            except Exception as e:
                validation_chain.fail_validation(str(e))
                raise
                
        return cast(T, wrapper)
    return decorator

def enforce_beta_validation(
    feature: str,
    component: ValidationComponent,
    validation_type: ValidationType = ValidationType.BETA,
    priority: ValidationPriority = ValidationPriority.HIGHEST
) -> Callable[[T], T]:
    """Enforce beta validation requirements"""
    def decorator(func: T) -> T:
        @wraps(func)
        async def wrapper(*args: Any, **kwargs: Any) -> Any:
            validation_chain = ValidationChain()
            
            try:
                # Start validation
                validation_chain.start_validation(
                    f"BETA-VALIDATION-{feature}",
                    component,
                    validation_type,
                    priority
                )
                
                # Validate beta readiness
                beta_validator = BetaValidator()
                if not await beta_validator.validate_beta_readiness():
                    raise ValueError(f"Beta validation failed for {func.__name__}")
                    
                # Execute function
                result = await func(*args, **kwargs)
                
                # Complete validation
                validation_chain.complete_validation()
                
                return result
                
            except Exception as e:
                validation_chain.fail_validation(str(e))
                raise
                
        return cast(T, wrapper)
    return decorator
