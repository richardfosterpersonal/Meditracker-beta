const fs = require('fs');
const path = require('path');

// Read security headers configuration
const securityHeaders = JSON.parse(
  fs.readFileSync(
    path.join(__dirname, '../public/security-headers.json'),
    'utf8'
  )
);

// Convert security headers to nginx format
function generateNginxConfig() {
  let config = '';

  // CSP Header
  const csp = securityHeaders['Content-Security-Policy'];
  let cspValue = Object.entries(csp)
    .map(([key, values]) => {
      if (key === 'upgrade-insecure-requests' && values === true) {
        return 'upgrade-insecure-requests';
      }
      if (Array.isArray(values)) {
        return `${key} ${values.join(' ')}`;
      }
      return '';
    })
    .filter(Boolean)
    .join('; ');

  config += `add_header Content-Security-Policy "${cspValue}";\n`;

  // Permissions Policy
  const pp = securityHeaders['Permissions-Policy'];
  const ppValue = Object.entries(pp)
    .map(([key, values]) => {
      if (values.length === 0) {
        return `${key}=()`;
      }
      return `${key}=(${values.join(' ')})`;
    })
    .join(', ');

  config += `add_header Permissions-Policy "${ppValue}";\n`;

  // Other Security Headers
  config += `add_header Strict-Transport-Security "${securityHeaders['Strict-Transport-Security']}";\n`;
  config += `add_header X-Content-Type-Options "${securityHeaders['X-Content-Type-Options']}";\n`;
  config += `add_header X-Frame-Options "${securityHeaders['X-Frame-Options']}";\n`;
  config += `add_header X-XSS-Protection "${securityHeaders['X-XSS-Protection']}";\n`;
  config += `add_header Referrer-Policy "${securityHeaders['Referrer-Policy']}";\n`;

  return config;
}

// Generate nginx configuration
const nginxConfig = generateNginxConfig();
fs.writeFileSync(
  path.join(__dirname, '../nginx/security-headers.conf'),
  nginxConfig
);

// Generate development server middleware
const devServerMiddleware = `
const securityHeaders = ${JSON.stringify(securityHeaders, null, 2)};

module.exports = function applySecurityHeaders(app) {
  app.use((req, res, next) => {
    // Apply all security headers
    Object.entries(securityHeaders).forEach(([header, value]) => {
      if (typeof value === 'object') {
        if (header === 'Content-Security-Policy') {
          const cspValue = Object.entries(value)
            .map(([key, values]) => {
              if (key === 'upgrade-insecure-requests' && values === true) {
                return 'upgrade-insecure-requests';
              }
              if (Array.isArray(values)) {
                return \`\${key} \${values.join(' ')}\`;
              }
              return '';
            })
            .filter(Boolean)
            .join('; ');
          res.setHeader(header, cspValue);
        } else if (header === 'Permissions-Policy') {
          const ppValue = Object.entries(value)
            .map(([key, values]) => {
              if (values.length === 0) {
                return \`\${key}=()\`;
              }
              return \`\${key}=(\${values.join(' ')})\`;
            })
            .join(', ');
          res.setHeader(header, ppValue);
        }
      } else {
        res.setHeader(header, value);
      }
    });
    next();
  });
};
`;

fs.writeFileSync(
  path.join(__dirname, '../src/middleware/security-headers.js'),
  devServerMiddleware
);

console.log('Security headers configuration generated successfully!');
