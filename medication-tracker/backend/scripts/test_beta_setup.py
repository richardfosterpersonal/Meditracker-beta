"""
Test Beta Setup
Critical Path: Beta.Testing
"""

import json
import sys
from pathlib import Path

# Add parent directory to path
sys.path.append(str(Path(__file__).parent.parent))

from scripts.beta_test_setup import BetaTestSetup
from app.core.feature_flags import FeatureFlags
from app.core.beta_onboarding import BetaOnboarding
from app.core.beta_feedback import BetaMetrics

def main():
    # Initialize setup
    project_root = Path(__file__).parent.parent.parent
    setup = BetaTestSetup(project_root)
    
    print("1. Running Beta Environment Setup...")
    results = setup.setup_beta_environment()
    print(f"Status: {results['status']}")
    print("\nValidations:")
    print(json.dumps(results['validations'], indent=2))
    
    print("\n2. Testing Feature Flags...")
    flags = setup.feature_flags
    flags.enable_feature('family_sharing', ['test_user_1'], 10)
    flags.enable_feature('emergency_contacts', ['test_user_1'], 20)
    enabled = flags.get_enabled_features('test_user_1')
    print(f"Enabled features for test_user_1: {enabled}")
    
    print("\n3. Testing Beta Onboarding...")
    onboarding = setup.onboarding
    user = onboarding.onboard_user(
        'test@example.com',
        'Test User',
        ['family_sharing', 'emergency_contacts']
    )
    print(f"Onboarded user: {json.dumps(user, indent=2)}")
    
    print("\n4. Testing Beta Metrics...")
    metrics = BetaMetrics(project_root)
    
    # Track some usage
    metrics.track_feature_usage('family_sharing', user['id'])
    metrics.track_feature_usage('family_sharing', user['id'])
    metrics.track_feature_usage('emergency_contacts', user['id'])
    
    # Submit feedback
    metrics.submit_feedback(
        user['id'],
        'family_sharing',
        'Would be great to have notification settings'
    )
    
    # Log an error
    metrics.log_error(
        'family_sharing',
        'Failed to send notification',
        user['id']
    )
    
    # Get metrics
    print("\nBeta Metrics:")
    print(json.dumps(metrics.get_metrics(), indent=2))

if __name__ == '__main__':
    main()
