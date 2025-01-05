@echo off
echo MedMinder Validation Control Panel
echo ===================================

if "%1"=="help" goto help
if "%1"=="enable" goto enable
if "%1"=="disable" goto disable
if "%1"=="quick" goto quick
if "%1"=="override" goto override

:help
echo Usage:
echo validation-control [command]
echo.
echo Commands:
echo   help     - Show this help
echo   enable   - Enable validation system
echo   disable  - Disable validation system
echo   quick    - Quick 5-minute override
echo   override - Create 24-hour override token
goto end

:enable
echo Enabling validation system...
npm run validate --enable
goto end

:disable
echo Disabling validation system...
npm run validate --disable --user="%USERNAME%" --reason="Manual disable"
goto end

:quick
echo Creating quick 5-minute override...
npm run validate --quick-override
goto end

:override
echo Creating 24-hour override token...
npm run validate --create-override --hours=24 --reason="Manual override"
goto end

:end
