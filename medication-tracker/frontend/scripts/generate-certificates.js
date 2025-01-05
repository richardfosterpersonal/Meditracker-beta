const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');

const CERT_DIR = path.join(__dirname, '../certificates');

// Create certificates directory if it doesn't exist
if (!fs.existsSync(CERT_DIR)) {
  fs.mkdirSync(CERT_DIR);
}

// Generate self-signed certificates using OpenSSL
try {
  console.log('Generating development SSL certificates...');

  // Generate private key
  execSync(
    'openssl genpkey -algorithm RSA -out certificates/localhost-key.pem',
    { stdio: 'inherit', cwd: path.join(__dirname, '..') }
  );

  // Generate CSR
  execSync(
    'openssl req -new -key certificates/localhost-key.pem -out certificates/localhost.csr -subj "/CN=localhost"',
    { stdio: 'inherit', cwd: path.join(__dirname, '..') }
  );

  // Generate self-signed certificate
  execSync(
    'openssl x509 -req -days 365 -in certificates/localhost.csr -signkey certificates/localhost-key.pem -out certificates/localhost.pem',
    { stdio: 'inherit', cwd: path.join(__dirname, '..') }
  );

  // Clean up CSR
  fs.unlinkSync(path.join(CERT_DIR, 'localhost.csr'));

  console.log('SSL certificates generated successfully!');
} catch (error) {
  console.error('Failed to generate SSL certificates:', error);
  process.exit(1);
}
