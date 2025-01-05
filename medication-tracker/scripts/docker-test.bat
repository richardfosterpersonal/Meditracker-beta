@echo off
setlocal enabledelayedexpansion

echo 🔍 Running Docker configuration tests...

:: Check if Docker Desktop is running
echo.
echo 1️⃣ Checking Docker Desktop status...
docker info >nul 2>&1
if errorlevel 1 (
    echo ❌ Docker Desktop is not running. Please start Docker Desktop and try again.
    exit /b 1
) else (
    echo ✅ Docker Desktop is running
)

:: Check Docker installation
echo.
echo 2️⃣ Checking Docker installation...
docker --version
if errorlevel 1 (
    echo ❌ Docker is not installed
    exit /b 1
) else (
    echo ✅ Docker is installed and running
)

:: Check Docker Compose
echo.
echo 3️⃣ Checking Docker Compose...
docker-compose --version
if errorlevel 1 (
    echo ❌ Docker Compose is not installed
    exit /b 1
) else (
    echo ✅ Docker Compose is installed
)

:: Check environment files
echo.
echo 4️⃣ Checking environment files...
if exist ".env.development" (
    echo ✅ Development environment file exists
) else (
    echo ❌ Missing .env.development file
    exit /b 1
)

if exist ".env.production" (
    echo ✅ Production environment file exists
) else (
    echo ❌ Missing .env.production file
    exit /b 1
)

:: Copy development environment for testing
echo.
echo 5️⃣ Preparing test environment...
copy .env.development .env >nul
if errorlevel 1 (
    echo ❌ Failed to prepare test environment
    exit /b 1
) else (
    echo ✅ Test environment prepared
)

:: Test development build
echo.
echo 6️⃣ Testing development build...
docker-compose build --no-cache
if errorlevel 1 (
    echo ❌ Development build failed
    exit /b 1
) else (
    echo ✅ Development build successful
)

:: Start development stack
echo.
echo 7️⃣ Starting development stack...
docker-compose up -d
if errorlevel 1 (
    echo ❌ Failed to start development stack
    exit /b 1
) else (
    echo ✅ Development stack started
)

:: Wait for services to be healthy
echo.
echo 8️⃣ Waiting for services to be healthy...
echo This may take a few moments...
timeout /t 30 /nobreak > nul

:: Check service health
echo.
echo 9️⃣ Checking service health...
for %%s in (app db redis nginx) do (
    docker-compose ps %%s | findstr "(healthy)" > nul
    if errorlevel 1 (
        echo ❌ Service %%s is not healthy
    ) else (
        echo ✅ Service %%s is healthy
    )
)

:: Test API endpoint
echo.
echo 🔟 Testing API endpoint...
curl -s -o nul -w "%%{http_code}" http://localhost:5000/health
if errorlevel 1 (
    echo ❌ API health check failed
) else (
    echo ✅ API is responding
)

:: Clean up
echo.
echo 1️⃣1️⃣ Cleaning up...
docker-compose down --volumes --remove-orphans
if errorlevel 1 (
    echo ❌ Cleanup failed
) else (
    echo ✅ Cleanup successful
)

echo.
echo 🏁 Test complete!

endlocal
