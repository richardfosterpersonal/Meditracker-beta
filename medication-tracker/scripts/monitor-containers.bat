@echo off
setlocal enabledelayedexpansion

:: Default values
set "INTERVAL=30"
set "LOG_FILE=container_monitor.log"
set "ALERT_THRESHOLD=80"

:: Parse command line arguments
:parse_args
if "%~1"=="" goto :main
if /i "%~1"=="-i" (
    set "INTERVAL=%~2"
    shift
    shift
    goto :parse_args
)
if /i "%~1"=="--interval" (
    set "INTERVAL=%~2"
    shift
    shift
    goto :parse_args
)
if /i "%~1"=="-l" (
    set "LOG_FILE=%~2"
    shift
    shift
    goto :parse_args
)
if /i "%~1"=="--log" (
    set "LOG_FILE=%~2"
    shift
    shift
    goto :parse_args
)
if /i "%~1"=="-t" (
    set "ALERT_THRESHOLD=%~2"
    shift
    shift
    goto :parse_args
)
if /i "%~1"=="--threshold" (
    set "ALERT_THRESHOLD=%~2"
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
echo Usage: monitor-containers.bat [options]
echo Options:
echo   -i, --interval SEC    Check interval in seconds [default: 30]
echo   -l, --log FILE        Log file [default: container_monitor.log]
echo   -t, --threshold NUM   CPU/Memory alert threshold %% [default: 80]
echo   -h, --help           Show this help message
exit /b 0

:main
echo Starting container monitoring...
echo Logging to: %LOG_FILE%
echo Alert threshold: %ALERT_THRESHOLD%%%
echo.

:monitor_loop
:: Get timestamp
for /f "tokens=2 delims==" %%I in ('wmic os get localdatetime /value') do set datetime=%%I
set "TIMESTAMP=%datetime:~0,4%-%datetime:~4,2%-%datetime:~6,2% %datetime:~8,2%:%datetime:~10,2%:%datetime:~12,2%"

:: Monitor each container
echo [%TIMESTAMP%] Checking containers... | tee -a "%LOG_FILE%"
for /f "tokens=*" %%C in ('docker-compose ps --services') do (
    :: Get container stats
    for /f "tokens=*" %%S in ('docker stats --no-stream --format "{{.Container}},{{.CPUPerc}},{{.MemPerc}}" %%C') do (
        for /f "tokens=1-3 delims=," %%a in ("%%S") do (
            set "CONTAINER=%%a"
            set "CPU=%%b"
            set "MEM=%%c"
            
            :: Remove % from values
            set "CPU=!CPU:%%=!"
            set "MEM=!MEM:%%=!"
            
            :: Check thresholds
            set "ALERT="
            if !CPU! gtr %ALERT_THRESHOLD% set "ALERT=!ALERT! CPU"
            if !MEM! gtr %ALERT_THRESHOLD% set "ALERT=!ALERT! Memory"
            
            :: Log status
            if defined ALERT (
                echo [%TIMESTAMP%] WARNING: !CONTAINER! high usage -!ALERT! | tee -a "%LOG_FILE%"
                echo     CPU: !CPU!%%, Memory: !MEM!%% | tee -a "%LOG_FILE%"
            ) else (
                echo [%TIMESTAMP%] !CONTAINER! OK - CPU: !CPU!%%, Memory: !MEM!%% >> "%LOG_FILE%"
            )
        )
    )
)

echo. >> "%LOG_FILE%"
timeout /t %INTERVAL% /nobreak > nul
goto :monitor_loop

endlocal
