# Medication Tracker Backend

The backend service for the Medication Tracker application, built with FastAPI and modern Python practices.

## Important Notice
⚠️ TypeScript Migration in Progress. See [Comprehensive Validation Report](../docs/validation/2024-12-24_comprehensive_validation.md) for:
- Current Migration Status (85%)
- Validation Requirements
- Critical Path Timeline
- Performance Metrics
- Compliance Status

## Validation Requirements
All changes must follow the validation protocol:

1. Run validation check:
   ```bash
   # Full validation suite
   python -m scripts.beta_launch --validate

   # Quick validation (development)
   python -m scripts.beta_launch --quick-validate
   ```

2. Complete validation evidence
   - Document all validation results
   - Update validation status in relevant docs

### Validation Layers
The application implements a multi-layer validation approach:

1. **Preflight Validation** (Critical Path: PreFlight)
   - Environment Variables
   - System Requirements
   - Dependencies
   - Must pass before any services start

2. **Runtime Validation** (Critical Path: Runtime)
   - Service Health
   - API Endpoints
   - Database Connectivity
   - Frontend Build

3. **Continuous Validation** (Critical Path: Monitoring)
   - Performance Metrics
   - Error Rates
   - Resource Usage

### Quick Overrides
For emergency changes:
```bash
# 5-minute override
.\scripts\validation-control quick

# 24-hour override
.\scripts\validation-control override
```

See [Validation Override Protocol](../docs/VALIDATION_OVERRIDE.md) for details.

## Core Features

### Security Implementation

#### ✅ Completed Features

1. **Rate Limiting**
   - Implemented using `slowapi`
   - Default limit of 100 requests per minute
   - Configurable per-endpoint limits
   - IP-based rate limiting

2. **Security Headers**
   - Content Security Policy (CSP)
   - X-Content-Type-Options
   - X-Frame-Options
   - X-XSS-Protection
   - Strict Transport Security (HSTS)

3. **CORS Configuration**
   - Configured for frontend origin (http://localhost:3000)
   - Proper handling of preflight requests
   - Secure credential handling

4. **Request Logging**
   - Structured logging of all requests
   - Performance timing
   - Client IP tracking (when available)
   - Error logging with stack traces

5. **Health Check Endpoint**
   - `/api/health` endpoint for monitoring
   - Rate limited for security
   - Returns application status

#### 🎯 Planned Security Features

1. **Authentication System**
   - JWT-based authentication
   - Password policy enforcement
   - Session management
   - Account lockout protection

2. **Audit Logging**
   - Comprehensive audit trail
   - User action tracking
   - Security event logging
   - Data access logging

3. **Data Sanitization**
   - Input validation
   - Output encoding
   - SQL injection prevention
   - XSS prevention

4. **Session Security**
   - Secure session handling
   - Session timeout
   - Concurrent session control
   - Session fixation protection

### Medication Management

#### ✅ Completed Features

1. **Medication Scheduling**
   - Create, update, and delete medication schedules
   - Support for multiple daily doses
   - Flexible scheduling patterns

2. **Medication Interactions**
   - Drug-drug interaction checking using FDA data
   - Herb-drug interaction detection
   - Timing-based interaction analysis
   - Severity-based recommendations
   - Caching for improved performance

3. **Testing Framework**
   - Comprehensive test suite for medication features
   - Test fixtures for common scenarios
   - Integration tests for interaction checking

## Security Features

The application implements a comprehensive security framework to protect sensitive medical data and ensure HIPAA compliance:

### Data Protection
- PHI (Protected Health Information) encryption at rest using the `cryptography` library
- Secure key management system with key rotation capabilities
- Encrypted storage for medical history, allergies, and conditions

### Authentication & Authorization
- Strong password policy enforcement including:
  - Minimum length and complexity requirements
  - Password history tracking to prevent reuse
  - Password age limits with forced rotation
  - Protection against similar password variations
- Account lockout after multiple failed attempts
- Session management with secure token handling

### Audit & Compliance
- Comprehensive audit logging system tracking:
  - User authentication events
  - PHI access and modifications
  - Security-related events
  - System events
- Detailed audit trails for compliance reporting
- Structured logging format for easy analysis

### Security Rationale
The security implementation follows these key principles:
1. **Defense in Depth**: Multiple layers of security controls
2. **Principle of Least Privilege**: Limited access to sensitive data
3. **Complete Mediation**: All access attempts are logged and verified
4. **Fail-Safe Defaults**: Conservative security settings by default

For detailed security documentation, see [SECURITY.md](../SECURITY.md) in the root directory.

## Dependencies

### Validation Status
✅ Dependencies validated: [2024-12-23_backend_dependency_cleanup.md](../docs/validation/2024-12-23_backend_dependency_cleanup.md)

### Core Dependencies
- FastAPI: API framework
- uvicorn: ASGI server
- psycopg2-binary: PostgreSQL adapter
- redis: Caching service

### Development Dependencies
- pytest: Testing framework
- black: Code formatting
- flake8: Linting
- mypy: Type checking

For detailed dependency guidelines, see [DEPENDENCY_GUIDELINES.md](../docs/DEPENDENCY_GUIDELINES.md)

## Deployment Guidelines

### Production Setup

1. **Infrastructure Requirements**
   - Python 3.9+ production environment
   - PostgreSQL 13+ database server
   - Redis for caching (recommended)
   - Nginx as reverse proxy
   - SSL/TLS certificates

2. **Environment Configuration**
   ```env
   # Application
   APP_ENV=production
   DEBUG=False
   API_V1_PREFIX=/api/v1
   ALLOWED_HOSTS=getmedminder.com,medminderpro.com

   # Security
   CORS_ORIGINS=["https://getmedminder.com"]
   RATE_LIMIT_PER_MINUTE=100
   SESSION_COOKIE_SECURE=True
   CSRF_COOKIE_SECURE=True

   # Database
   DATABASE_URL=postgresql://user:password@localhost:5432/medminder_prod

   # Redis
   REDIS_URL=redis://localhost:6379/0

   # Email
   SMTP_HOST=smtp.provider.com
   SMTP_PORT=587
   SMTP_USER=notifications@getmedminder.com
   SMTP_PASSWORD=secure_password
   ```

3. **Production Deployment Steps**
   ```bash
   # 1. Clone repository
   git clone https://github.com/yourusername/medication-tracker.git
   cd medication-tracker/backend

   # 2. Create virtual environment
   python -m venv venv
   source venv/bin/activate

   # 3. Install production dependencies
   pip install -r requirements/production.txt

   # 4. Configure environment
   cp .env.example .env
   # Edit .env with production values

   # 5. Initialize database
   python manage.py migrate

   # 6. Collect static files
   python manage.py collectstatic

   # 7. Start Gunicorn
   gunicorn app.main:app --workers 4 --bind 0.0.0.0:8000
   ```

4. **Nginx Configuration**
   ```nginx
   server {
       listen 80;
       server_name getmedminder.com;
       return 301 https://$server_name$request_uri;
   }

   server {
       listen 443 ssl;
       server_name getmedminder.com;

       ssl_certificate /path/to/cert.pem;
       ssl_certificate_key /path/to/key.pem;

       location / {
           proxy_pass http://localhost:8000;
           proxy_set_header Host $host;
           proxy_set_header X-Real-IP $remote_addr;
       }
   }
   ```

### Monitoring & Maintenance

1. **Health Checks**
   - `/api/health` endpoint for uptime monitoring
   - Database connection status
   - Redis connection status
   - External service health

2. **Logging**
   - Application logs in `/var/log/medminder/`
   - Error reporting to Sentry
   - Access logs through Nginx
   - Security event logging

3. **Backup Strategy**
   - Daily database backups
   - Weekly full system backups
   - Encrypted backup storage
   - Regular backup testing

4. **Update Procedure**
   ```bash
   # 1. Backup database
   pg_dump medminder_prod > backup.sql

   # 2. Pull updates
   git pull origin main

   # 3. Install dependencies
   pip install -r requirements/production.txt

   # 4. Run migrations
   python manage.py migrate

   # 5. Restart services
   sudo systemctl restart medminder
   ```

### Security Checklist

1. **Pre-Deployment**
   - [ ] Security audit completed
   - [ ] Dependencies scanned
   - [ ] SSL/TLS configured
   - [ ] Firewall rules set
   - [ ] Rate limiting tested
   - [ ] API authentication verified
   - [ ] Data encryption validated

2. **Post-Deployment**
   - [ ] Health checks passing
   - [ ] Logs properly rotating
   - [ ] Backups automated
   - [ ] Monitoring active
   - [ ] Error reporting configured
   - [ ] Performance metrics collected
   - [ ] Security headers verified

## Getting Started

### Prerequisites

- Python 3.9+
- PostgreSQL
- Redis (optional)

### Installation

1. Clone the repository:
```bash
git clone https://github.com/yourusername/medication-tracker.git
cd medication-tracker/backend
```

2. Create and activate virtual environment:
```bash
python -m venv venv
source venv/bin/activate  # On Windows: venv\Scripts\activate
```

3. Install dependencies:
```bash
pip install -r requirements.txt
```

4. Create `.env` file:
```bash
cp .env.example .env
```

5. Run the application:
```bash
uvicorn app.main:app --reload
```

## Testing

Run the test suite:
```bash
pytest
```

Run security tests specifically:
```bash
pytest tests/test_security.py -v
```

## Environment Variables

```env
# Application
APP_ENV=development
DEBUG=True
API_V1_PREFIX=/api/v1

# Security
CORS_ORIGINS=["http://localhost:3000"]
RATE_LIMIT_PER_MINUTE=100

# Database
DATABASE_URL=postgresql://user:password@localhost:5432/medication_tracker

# Redis (Optional)
REDIS_URL=redis://localhost:6379/0
```

## API Documentation

When running locally, access the API documentation at:
- Swagger UI: http://localhost:8000/docs
- ReDoc: http://localhost:8000/redoc

## Security Best Practices

1. **Environment Variables**
   - Never commit `.env` files
   - Use secure secrets in production
   - Rotate secrets regularly

2. **Database Access**
   - Use parameterized queries
   - Implement connection pooling
   - Set appropriate timeouts

3. **Error Handling**
   - Never expose stack traces in production
   - Log errors securely
   - Return safe error messages to clients

4. **Deployment**
   - Use HTTPS in production
   - Keep dependencies updated
   - Regular security audits

## Contributing

1. Create a feature branch
2. Make your changes
3. Run tests
4. Update documentation
5. Create a Pull Request

## License

This project is licensed under the MIT License - see the LICENSE file for details.
