"""
Scope Cleanup Script
Last Updated: 2024-12-25T22:50:11+01:00
Critical Path: Tools.Cleanup
"""

import os
import shutil
from pathlib import Path

# Files and directories to remove (non-critical features)
REMOVE_PATHS = [
    # Advanced features
    'app/core/advanced_analytics_orchestrator.py',
    'app/core/advanced_monitoring_orchestrator.py',
    'app/core/advanced_automation_orchestrator.py',
    'app/core/beta_deployment_orchestrator.py',
    'app/core/dashboard_config.py',
    'app/core/dashboard_integration.py',
    
    # Cache and Redis
    'app/infrastructure/queue/redis_manager.py',
    'app/infrastructure/queue/worker.py',
    
    # Notifications
    'app/api/v1/notifications.py',
    'app/schemas/notification.py',
    'app/models/notification.py',
    'app/models/notification_preferences.py',
    'app/services/notification_service.py',
    'app/services/notification_scheduler.py',
    'app/domain/notification',
    
    # WebSocket
    'app/api/v1/websocket.py',
    'app/infrastructure/websocket',
]

def remove_file_or_dir(path: str):
    """Safely remove a file or directory"""
    full_path = Path(path)
    if full_path.exists():
        if full_path.is_file():
            full_path.unlink()
            print(f"Removed file: {path}")
        elif full_path.is_dir():
            shutil.rmtree(full_path)
            print(f"Removed directory: {path}")

def main():
    """Main cleanup function"""
    # Get the absolute path to the backend directory
    backend_dir = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
    
    # Remove non-critical files and directories
    for path in REMOVE_PATHS:
        full_path = os.path.join(backend_dir, path)
        remove_file_or_dir(full_path)
    
    print("\nScope cleanup completed. Run sonar-scope-check.py to verify.")

if __name__ == '__main__':
    main()
