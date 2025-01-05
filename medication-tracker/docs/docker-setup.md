# Docker Setup Guide

This guide explains how to use Docker with the Medication Tracker application in both development and production environments.

## Prerequisites

- Docker Engine 20.10.0 or later
- Docker Compose 2.0.0 or later
- Git (for development)
- Node.js 18+ (for local development without Docker)

## Quick Start

### Development Environment

```bash
# Windows
.\scripts\dev-start.bat -e development

# Unix/Linux/MacOS
./scripts/dev-start.sh -e development
```

### Production Environment

```bash
# Windows
.\scripts\dev-start.bat -e production

# Unix/Linux/MacOS
./scripts/dev-start.sh -e production
```

## Configuration Options

The startup scripts support the following options:

- `-e, --env`: Set environment (development|production)
- `-c, --clean`: Clean all containers and volumes before starting
- `-r, --rebuild`: Rebuild images before starting
- `-h, --help`: Show help message

Example:
```bash
.\scripts\dev-start.bat -e development -r -c
```

## Environment Files

- `.env.development`: Development environment variables
- `.env.production`: Production environment variables
- `.env.example`: Template for environment variables

Important variables:
- `NODE_ENV`: Application environment
- `PORT`: Application port
- `DATABASE_URL`: PostgreSQL connection string
- `REDIS_URL`: Redis connection string

## Docker Configuration

### Development Setup

The development environment uses:
- `Dockerfile.dev` for hot-reloading and development dependencies
- Volume mounts for live code editing
- Development-specific environment variables
- Exposed ports for debugging

### Production Setup

The production environment includes:
- Multi-stage builds for smaller images
- Security hardening (non-root user, minimal dependencies)
- Production optimizations
- Health checks
- Nginx reverse proxy

## Container Architecture

```
┌─────────────┐     ┌──────────┐
│    Nginx    │────▶│   App    │
└─────────────┘     └──────────┘
                         │
              ┌─────────┴─────────┐
              ▼                   ▼
        ┌─────────┐         ┌─────────┐
        │Postgres │         │  Redis  │
        └─────────┘         └─────────┘
```

- **Nginx**: Reverse proxy, handles SSL/TLS
- **App**: Node.js application (frontend + backend)
- **Postgres**: Main database
- **Redis**: Session storage and caching

## Volume Management

Persistent data is stored in Docker volumes:
- `postgres-data`: Database files
- `redis-data`: Redis data

## Networking

All services are connected through the `app-network` bridge network.

## Health Checks

Each service includes health checks:
- App: HTTP endpoint check
- Postgres: Database connection check
- Redis: PING command check
- Nginx: HTTP endpoint check

## Common Tasks

### View Logs
```bash
# All services
docker-compose logs -f

# Specific service
docker-compose logs -f app
```

### Access Database
```bash
# Connect to PostgreSQL
docker-compose exec db psql -U postgres medication_tracker
```

### Redis CLI
```bash
docker-compose exec redis redis-cli
```

### Container Shell
```bash
docker-compose exec app sh
```

## Troubleshooting

### Common Issues

1. **Port Conflicts**
   - Error: "port is already allocated"
   - Solution: Stop conflicting services or change ports in docker-compose.yml

2. **Database Connection Issues**
   - Check if PostgreSQL container is healthy
   - Verify DATABASE_URL environment variable
   - Ensure migrations have run

3. **Volume Permission Issues**
   - Run with clean option: `dev-start -c`
   - Check file permissions in mounted volumes

### Debug Mode

Add these environment variables for more verbose output:
```bash
export DEBUG=1
export COMPOSE_HTTP_TIMEOUT=300
```

## Security Notes

- Production builds run as non-root user
- Sensitive data stored in environment variables
- Regular security updates via apk upgrade
- CORS and rate limiting configured
- SSL/TLS termination at Nginx

## Performance Optimization

- Multi-stage builds reduce image size
- Production builds exclude development dependencies
- Redis caching enabled
- Nginx configured for static file serving
- Database connection pooling

## Backup and Recovery

Database backups:
```bash
# Backup
docker-compose exec db pg_dump -U postgres medication_tracker > backup.sql

# Restore
docker-compose exec -T db psql -U postgres medication_tracker < backup.sql
```
