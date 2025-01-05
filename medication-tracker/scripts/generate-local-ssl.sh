#!/bin/bash

# Create SSL directory
mkdir -p nginx/ssl

# Generate private key
openssl genrsa -out nginx/ssl/localhost.key 2048

# Generate CSR
openssl req -new -key nginx/ssl/localhost.key -out nginx/ssl/localhost.csr -subj "/CN=localhost/O=Medication Tracker Development/C=US"

# Generate self-signed certificate
openssl x509 -req -days 365 -in nginx/ssl/localhost.csr -signkey nginx/ssl/localhost.key -out nginx/ssl/localhost.crt

echo "Self-signed certificates generated successfully!"
