"""
Windows Service for Beta Validation Checker
Last Updated: 2024-12-25T23:17:41+01:00
Critical Path: Tools.Validation

Runs the validation checker as a Windows service.
"""

import sys
import os
import time
import logging
from pathlib import Path
import win32serviceutil
import win32service
import win32event
import servicemanager

# Add parent directory to path
sys.path.append(str(Path(__file__).parent.parent))
from scripts.hourly_validation_check import ValidationScheduler

class ValidationService(win32serviceutil.ServiceFramework):
    _svc_name_ = "BetaValidationService"
    _svc_display_name_ = "Beta Validation Checker Service"
    _svc_description_ = "Runs hourly validation checks for beta-critical components"
    
    def __init__(self, args):
        win32serviceutil.ServiceFramework.__init__(self, args)
        self.stop_event = win32event.CreateEvent(None, 0, 0, None)
        self.scheduler = ValidationScheduler()
        
    def SvcStop(self):
        """Stop the service"""
        self.ReportServiceStatus(win32service.SERVICE_STOP_PENDING)
        win32event.SetEvent(self.stop_event)
        
    def SvcDoRun(self):
        """Run the service"""
        try:
            # Configure logging for the service
            logging.basicConfig(
                level=logging.INFO,
                filename='logs/validation_service.log',
                format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
            )
            
            servicemanager.LogMsg(
                servicemanager.EVENTLOG_INFORMATION_TYPE,
                servicemanager.PYS_SERVICE_STARTED,
                (self._svc_name_, '')
            )
            
            # Run initial check
            self.scheduler.run_validation_check()
            
            # Schedule hourly checks
            import schedule
            schedule.every().hour.at(":00").do(
                self.scheduler.run_validation_check
            )
            
            while True:
                schedule.run_pending()
                # Check if service should stop
                if win32event.WaitForSingleObject(self.stop_event, 1000) == win32event.WAIT_OBJECT_0:
                    break
                time.sleep(1)
                
        except Exception as e:
            logging.error(f"Service error: {str(e)}")
            servicemanager.LogErrorMsg(f"Service error: {str(e)}")

def main():
    if len(sys.argv) == 1:
        servicemanager.Initialize()
        servicemanager.PrepareToHostSingle(ValidationService)
        servicemanager.StartServiceCtrlDispatcher()
    else:
        win32serviceutil.HandleCommandLine(ValidationService)

if __name__ == '__main__':
    if len(sys.argv) > 1:
        # Called with arguments (install, remove, start, stop)
        win32serviceutil.HandleCommandLine(ValidationService)
    else:
        # Called without arguments - run directly
        main()
