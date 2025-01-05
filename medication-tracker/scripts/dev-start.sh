#!/bin/bash

# Default values
ENV="development"
CLEAN=false
REBUILD=false

# Parse command line arguments
while [[ "$#" -gt 0 ]]; do
    case $1 in
        -e|--env) ENV="$2"; shift ;;
        -c|--clean) CLEAN=true ;;
        -r|--rebuild) REBUILD=true ;;
        -h|--help)
            echo "Usage: dev-start.sh [options]"
            echo "Options:"
            echo "  -e, --env ENV      Set environment (development|production) [default: development]"
            echo "  -c, --clean        Clean all containers and volumes before starting"
            echo "  -r, --rebuild      Rebuild images before starting"
            echo "  -h, --help         Show this help message"
            exit 0
            ;;
        *) echo "Unknown parameter: $1"; exit 1 ;;
    esac
    shift
done

# Set environment variables
export NODE_ENV=$ENV
export DOCKERFILE="Dockerfile.dev"
[[ "$ENV" == "production" ]] && export DOCKERFILE="Dockerfile"

# Clean if requested
if [ "$CLEAN" = true ]; then
    echo "🧹 Cleaning up containers and volumes..."
    docker-compose down -v
    docker system prune -f
fi

# Build if requested or if images don't exist
if [ "$REBUILD" = true ] || ! docker images | grep -q "medication-tracker-app"; then
    echo "🏗️ Building Docker images..."
    docker-compose build --no-cache
fi

# Start services
echo "🚀 Starting services in $ENV mode..."
if [ "$ENV" == "development" ]; then
    docker-compose up --remove-orphans
else
    docker-compose -f docker-compose.yml up -d
fi
