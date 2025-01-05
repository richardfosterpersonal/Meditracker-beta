@echo off
setlocal enabledelayedexpansion

:: Default values
set "BACKUP_DIR=backups"
set "COMPRESS=false"
set "MAX_BACKUPS=7"

:: Parse command line arguments
:parse_args
if "%~1"=="" goto :main
if /i "%~1"=="-d" (
    set "BACKUP_DIR=%~2"
    shift
    shift
    goto :parse_args
)
if /i "%~1"=="--dir" (
    set "BACKUP_DIR=%~2"
    shift
    shift
    goto :parse_args
)
if /i "%~1"=="-z" (
    set "COMPRESS=true"
    shift
    goto :parse_args
)
if /i "%~1"=="--compress" (
    set "COMPRESS=true"
    shift
    goto :parse_args
)
if /i "%~1"=="-m" (
    set "MAX_BACKUPS=%~2"
    shift
    shift
    goto :parse_args
)
if /i "%~1"=="--max" (
    set "MAX_BACKUPS=%~2"
    shift
    shift
    goto :parse_args
)
if /i "%~1"=="-h" (
    goto :show_help
)
if /i "%~1"=="--help" (
    goto :show_help
)
echo Unknown parameter: %~1
exit /b 1

:show_help
echo Usage: db-backup.bat [options]
echo Options:
echo   -d, --dir DIR      Backup directory [default: backups]
echo   -z, --compress     Compress backup using gzip
echo   -m, --max NUM      Maximum number of backups to keep [default: 7]
echo   -h, --help         Show this help message
exit /b 0

:main
:: Create backup directory if it doesn't exist
if not exist "%BACKUP_DIR%" mkdir "%BACKUP_DIR%"

:: Generate timestamp for backup file
for /f "tokens=2-4 delims=/ " %%a in ('date /t') do (
    set "DATE=%%c-%%a-%%b"
)
for /f "tokens=1-2 delims=: " %%a in ('time /t') do (
    set "TIME=%%a%%b"
)
set "TIMESTAMP=%DATE%_%TIME%"

:: Create backup
echo Creating database backup...
set "BACKUP_FILE=%BACKUP_DIR%\backup_%TIMESTAMP%.sql"
docker-compose exec -T db pg_dump -U postgres medication_tracker > "%BACKUP_FILE%"

:: Compress if requested
if "%COMPRESS%"=="true" (
    echo Compressing backup...
    tar -czf "%BACKUP_FILE%.tar.gz" "%BACKUP_FILE%"
    del "%BACKUP_FILE%"
    set "BACKUP_FILE=%BACKUP_FILE%.tar.gz"
)

:: Clean old backups
echo Cleaning old backups...
set "count=0"
for /f "tokens=*" %%F in ('dir /b /o-d "%BACKUP_DIR%\backup_*"') do (
    set /a "count+=1"
    if !count! gtr %MAX_BACKUPS% (
        del "%BACKUP_DIR%\%%F"
    )
)

echo Backup completed: %BACKUP_FILE%
echo Keeping last %MAX_BACKUPS% backups

endlocal
