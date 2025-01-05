"""
Validation Hook System
Last Updated: 2025-01-02T14:10:32+01:00
Status: CRITICAL
Reference: ../../docs/validation/critical_path/MASTER_CRITICAL_PATH.md

This package is deprecated. Use UnifiedValidationFramework instead.
"""

import sys
import os

# Add backend to path
sys.path.append(os.path.dirname(os.path.dirname(os.path.dirname(__file__))))

from backend.app.core.unified_validation_framework import UnifiedValidationFramework

ValidationHook = UnifiedValidationFramework

__all__ = ['ValidationHook']
