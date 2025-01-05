# Secure Secrets Template
Last Updated: 2024-12-25T19:28:26+01:00
Status: ACTIVE
Permission: SYSTEM
Reference: MASTER_CRITICAL_PATH.md

## Secret Generation Guidelines

### JWT Secrets
```markdown
Requirements:
1. JWT_SECRET
   - Minimum 32 characters
   - High entropy
   - Example format: base64_encoded(random_bytes(32))
   - Rotation: Every 90 days

2. JWT_REFRESH_SECRET
   - Minimum 32 characters
   - Independent from JWT_SECRET
   - Example format: base64_encoded(random_bytes(32))
   - Rotation: Every 90 days
```

### Database Credentials
```markdown
Requirements:
1. POSTGRES_PASSWORD
   - Minimum 16 characters
   - Include uppercase, lowercase, numbers, symbols
   - No dictionary words
   - Unique per environment

2. DATABASE_URL Format
   - postgresql://${POSTGRES_USER}:${POSTGRES_PASSWORD}@${HOST}:${PORT}/${DB_NAME}
   - Use connection pooling
   - Enable SSL/TLS
```

### Encryption Keys
```markdown
Requirements:
1. ENCRYPTION_KEY
   - 32 bytes (256 bits)
   - Generated using cryptographically secure RNG
   - Example format: base64_encoded(random_bytes(32))
   - Rotation: Every 90 days

2. KEY_ENCRYPTION_KEY
   - 32 bytes (256 bits)
   - Used for encrypting other keys
   - Stored in secure hardware or vault
   - Rotation: Every 180 days
```

### Email Configuration
```markdown
Requirements:
1. SMTP_PASSWORD
   - Use app-specific password
   - Minimum 16 characters
   - Regular rotation
   - Secure storage

2. EMAIL_ENCRYPTION_KEY
   - 32 bytes (256 bits)
   - Used for email content encryption
   - Regular rotation
   - Secure storage
```

## Secret Storage

### Environment Variables
```markdown
Requirements:
1. Production
   - Use secure vault (e.g., HashiCorp Vault)
   - Environment-specific encryption
   - Access logging enabled
   - Regular rotation

2. Development
   - Use .env.local (git-ignored)
   - Different values from production
   - Limited distribution
   - Regular rotation
```

### Secure Storage Options
```markdown
Recommended:
1. HashiCorp Vault
   - Secret encryption
   - Access control
   - Audit logging
   - Automatic rotation

2. AWS Secrets Manager
   - Managed service
   - Automatic rotation
   - Access control
   - Encryption at rest
```

## Secret Management

### Access Control
```markdown
Requirements:
1. Principle of Least Privilege
   - Role-based access
   - Time-limited access
   - Audit logging
   - Regular review

2. Secret Distribution
   - Secure channels
   - Need-to-know basis
   - Version control
   - Access logging
```

### Rotation Policy
```markdown
Requirements:
1. Regular Rotation
   - JWT secrets: 90 days
   - Database credentials: 90 days
   - Encryption keys: 90 days
   - API keys: 180 days

2. Emergency Rotation
   - Security incidents
   - Staff changes
   - Suspected compromise
   - System changes
```

## Implementation Process

### Initial Setup
```markdown
Steps:
1. Generate secrets
2. Configure storage
3. Set up rotation
4. Document process
```

### Validation Process
```markdown
Steps:
1. Verify secret strength
2. Test storage security
3. Validate rotation
4. Document evidence
```

### Emergency Procedures
```markdown
Steps:
1. Revoke compromised secrets
2. Generate new secrets
3. Update systems
4. Document incident
```

Note: Never store actual secrets in this template. Use secure storage methods only.
