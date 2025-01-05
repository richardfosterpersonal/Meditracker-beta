@echo off
setlocal enabledelayedexpansion

:: Default values
set "ENV=development"
set "CLEAN=false"
set "REBUILD=false"

:: Parse command line arguments
:parse_args
if "%~1"=="" goto :main
if /i "%~1"=="-e" (
    set "ENV=%~2"
    shift
    shift
    goto :parse_args
)
if /i "%~1"=="--env" (
    set "ENV=%~2"
    shift
    shift
    goto :parse_args
)
if /i "%~1"=="-c" (
    set "CLEAN=true"
    shift
    goto :parse_args
)
if /i "%~1"=="--clean" (
    set "CLEAN=true"
    shift
    goto :parse_args
)
if /i "%~1"=="-r" (
    set "REBUILD=true"
    shift
    goto :parse_args
)
if /i "%~1"=="--rebuild" (
    set "REBUILD=true"
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
echo Usage: dev-start.bat [options]
echo Options:
echo   -e, --env ENV      Set environment (development^|production) [default: development]
echo   -c, --clean        Clean all containers and volumes before starting
echo   -r, --rebuild      Rebuild images before starting
echo   -h, --help         Show this help message
exit /b 0

:main
:: Set environment variables
set "NODE_ENV=%ENV%"
set "DOCKERFILE=Dockerfile.dev"
if "%ENV%"=="production" set "DOCKERFILE=Dockerfile"

:: Clean if requested
if "%CLEAN%"=="true" (
    echo 🧹 Cleaning up containers and volumes...
    docker-compose down -v
    docker system prune -f
)

:: Build if requested or if images don't exist
docker images | findstr "medication-tracker-app" >nul
if "%REBUILD%"=="true" (
    echo 🏗️ Building Docker images...
    docker-compose build --no-cache
) else if errorlevel 1 (
    echo 🏗️ Building Docker images for the first time...
    docker-compose build --no-cache
)

:: Start services
echo 🚀 Starting services in %ENV% mode...
if "%ENV%"=="development" (
    docker-compose up --remove-orphans
) else (
    docker-compose -f docker-compose.yml up -d
)

endlocal
