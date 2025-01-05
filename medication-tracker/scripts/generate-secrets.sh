#!/bin/bash

# Script to generate production secrets for MedMinder Pro
# This script generates secure random values for all required secrets
# and creates a sealed secret for Kubernetes

set -e  # Exit on any error

# Configuration
NAMESPACE="production"
SECRET_NAME="medminder-secrets"
OUTPUT_DIR="./kubernetes/production/generated"

# Create output directory
mkdir -p "$OUTPUT_DIR"

# Generate secure random values
echo "Generating secure random values..."

# Database password (32 characters)
DB_PASSWORD=$(openssl rand -base64 24)

# Redis password (32 characters)
REDIS_PASSWORD=$(openssl rand -base64 24)

# JWT secret (64 characters)
JWT_SECRET=$(openssl rand -base64 48)

# Generate SMTP password (32 characters)
SMTP_PASSWORD=$(openssl rand -base64 24)

# Create a temporary file with the secret values
cat > "$OUTPUT_DIR/secrets.env" << EOF
# Database
DB_PASSWORD=$DB_PASSWORD

# Redis
REDIS_PASSWORD=$REDIS_PASSWORD

# JWT
JWT_SECRET=$JWT_SECRET

# Email
SMTP_PASSWORD=$SMTP_PASSWORD

# Instructions for manual values
# The following values need to be set manually:
# SENTRY_DSN=
# FDA_API_KEY=
# NCCIH_API_KEY=
# TWILIO_ACCOUNT_SID=
# TWILIO_AUTH_TOKEN=
# TWILIO_PHONE_NUMBER=
EOF

echo "Secret values have been generated and saved to $OUTPUT_DIR/secrets.env"
echo "Please manually add the following values to the secrets file:"
echo "- Sentry DSN"
echo "- FDA API Key"
echo "- NCCIH API Key"
echo "- Twilio credentials"

# Create instructions for applying secrets
cat > "$OUTPUT_DIR/README.md" << EOF
# Production Secrets Setup

## Steps to Apply Secrets

1. Fill in the missing values in \`secrets.env\`:
   - Add Sentry DSN from your Sentry dashboard
   - Add FDA API Key from FDA API portal
   - Add NCCIH API Key from NCCIH portal
   - Add Twilio credentials from Twilio console

2. Create the Kubernetes secret:
   \`\`\`bash
   kubectl create secret generic $SECRET_NAME \\
     --namespace=$NAMESPACE \\
     --from-env-file=secrets.env
   \`\`\`

3. Verify the secret:
   \`\`\`bash
   kubectl get secret $SECRET_NAME -n $NAMESPACE
   \`\`\`

## Security Notes

- Keep the \`secrets.env\` file secure and never commit it to version control
- Rotate these secrets periodically (recommended: every 90 days)
- Monitor secret usage through audit logs
- Use RBAC to restrict secret access to necessary services only
EOF

echo "Setup instructions have been written to $OUTPUT_DIR/README.md"
echo "Please follow the instructions to complete the secrets setup"
