"""
Migration environment configuration
Last Updated: 2025-01-01T20:17:42+01:00
"""

import asyncio
from logging.config import fileConfig
import os
import sys
from pathlib import Path

from alembic import context
from sqlalchemy import engine_from_config
from sqlalchemy import pool

# Add parent directory to path so we can import our app
parent_dir = str(Path(__file__).resolve().parents[4])
if parent_dir not in sys.path:
    sys.path.append(parent_dir)

from app.core.validation_enforcer import requires_migration_validation, validation_context
from app.core.migration_validator import MigrationValidator
from app.models import Base
from app.settings import Settings
from app.exceptions import ValidationError

# this is the Alembic Config object
config = context.config

# Interpret the config file for Python logging.
# This line sets up loggers basically.
if config.config_file_name is not None:
    fileConfig(config.config_file_name)

target_metadata = Base.metadata

def get_database_url():
    """Get database URL from settings"""
    return Settings.DATABASE_URL

@requires_migration_validation
async def run_migrations():
    """Run migrations with validation"""
    configuration = config.get_section(config.config_ini_section)
    configuration["sqlalchemy.url"] = get_database_url()
    
    # Create engine
    connectable = engine_from_config(
        configuration,
        prefix="sqlalchemy.",
        poolclass=pool.NullPool,
    )
    
    # Run migrations within validation context
    with validation_context(MigrationValidator, "validate_migration_environment"):
        with connectable.connect() as connection:
            context.configure(
                connection=connection,
                target_metadata=target_metadata
            )
            
            with context.begin_transaction():
                context.run_migrations()

def run_migrations_offline():
    """Run migrations in 'offline' mode"""
    # Validate environment first
    validator = MigrationValidator()
    validation_result = asyncio.run(validator.validate_migration_environment())
    if not validation_result.get("valid", False):
        raise ValidationError(
            f"Migration environment validation failed: {validation_result.get('error')}",
            details=validation_result.get("details")
        )
        
    url = get_database_url()
    context.configure(
        url=url,
        target_metadata=target_metadata,
        literal_binds=True,
        dialect_opts={"paramstyle": "named"},
    )
    
    with context.begin_transaction():
        context.run_migrations()

if context.is_offline_mode():
    run_migrations_offline()
else:
    asyncio.run(run_migrations())
