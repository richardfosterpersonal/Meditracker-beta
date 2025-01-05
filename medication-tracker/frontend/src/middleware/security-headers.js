
const securityHeaders = {
  "Content-Security-Policy": {
    "default-src": [
      "'self'"
    ],
    "script-src": [
      "'self'",
      "'unsafe-inline'",
      "https://cdn.jsdelivr.net",
      "https://api.mixpanel.com"
    ],
    "style-src": [
      "'self'",
      "'unsafe-inline'",
      "https://fonts.googleapis.com"
    ],
    "img-src": [
      "'self'",
      "data:",
      "https:",
      "blob:"
    ],
    "font-src": [
      "'self'",
      "https://fonts.gstatic.com"
    ],
    "connect-src": [
      "'self'",
      "https://api.mixpanel.com",
      "https://your-api-domain.com",
      "wss://your-api-domain.com"
    ],
    "frame-src": [
      "'self'"
    ],
    "media-src": [
      "'self'"
    ],
    "object-src": [
      "'none'"
    ],
    "manifest-src": [
      "'self'"
    ],
    "worker-src": [
      "'self'",
      "blob:"
    ],
    "base-uri": [
      "'self'"
    ],
    "form-action": [
      "'self'"
    ],
    "frame-ancestors": [
      "'none'"
    ],
    "upgrade-insecure-requests": true
  },
  "Permissions-Policy": {
    "accelerometer": [],
    "camera": [],
    "geolocation": [],
    "gyroscope": [],
    "magnetometer": [],
    "microphone": [],
    "payment": [],
    "usb": []
  },
  "Strict-Transport-Security": "max-age=31536000; includeSubDomains; preload",
  "X-Content-Type-Options": "nosniff",
  "X-Frame-Options": "DENY",
  "X-XSS-Protection": "1; mode=block",
  "Referrer-Policy": "strict-origin-when-cross-origin"
};

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
                return `${key} ${values.join(' ')}`;
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
                return `${key}=()`;
              }
              return `${key}=(${values.join(' ')})`;
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
