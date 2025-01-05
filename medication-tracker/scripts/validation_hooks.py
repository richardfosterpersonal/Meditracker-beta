#!/usr/bin/env python3
"""
Validation Hooks
Critical Path: VALIDATION-HOOKS
Last Updated: 2025-01-02T14:10:32+01:00

This module is deprecated. Use UnifiedValidationFramework instead.
"""

import os
import sys
import json
from datetime import datetime
from typing import Dict, List, Optional

# Add backend to path
sys.path.append(os.path.dirname(os.path.dirname(__file__)))

from backend.app.core.unified_validation_framework import UnifiedValidationFramework

def main():
    """Main entry point"""
    validator = UnifiedValidationFramework()
    validator.validate_all()

if __name__ == "__main__":
    main()
