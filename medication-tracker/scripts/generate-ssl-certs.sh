#!/bin/bash

# Create SSL directory if it doesn't exist
mkdir -p nginx/ssl

# Generate DHParam
openssl dhparam -out nginx/ssl/dhparam.pem 2048

# Generate private key
openssl genrsa -out nginx/ssl/medicationtracker.com.key 2048

# Generate CSR
openssl req -new -key nginx/ssl/medicationtracker.com.key -out nginx/ssl/medicationtracker.com.csr -subj "/C=US/ST=California/L=San Francisco/O=Medication Tracker/OU=Development/CN=medicationtracker.com"

# Generate self-signed certificate for development
openssl x509 -req -days 365 -in nginx/ssl/medicationtracker.com.csr -signkey nginx/ssl/medicationtracker.com.key -out nginx/ssl/medicationtracker.com.crt

echo "SSL certificates generated successfully!"
