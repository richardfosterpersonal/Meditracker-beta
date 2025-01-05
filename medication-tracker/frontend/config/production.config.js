const path = require('path');

module.exports = {
  // Server configuration
  server: {
    port: process.env.PORT || 3000,
    host: process.env.HOST || '0.0.0.0',
    protocol: 'https',
  },

  // Database configuration
  database: {
    url: process.env.DATABASE_URL,
    poolSize: 20,
    ssl: true,
    connectionTimeoutMillis: 10000,
    idleTimeoutMillis: 30000,
    maxUses: 7500,
  },

  // Redis configuration (for caching and sessions)
  redis: {
    url: process.env.REDIS_URL,
    prefix: 'med-tracker:',
    ttl: 86400, // 24 hours
  },

  // CDN configuration
  cdn: {
    url: process.env.REACT_APP_CDN_URL,
    region: process.env.CDN_REGION || 'us-east-1',
    bucket: process.env.CDN_BUCKET,
  },

  // Email service configuration
  email: {
    provider: 'ses',
    region: process.env.EMAIL_REGION || 'us-east-1',
    from: 'noreply@medication-tracker.com',
    replyTo: 'support@medication-tracker.com',
  },

  // Logging configuration
  logging: {
    level: 'error',
    format: 'json',
    directory: path.join(__dirname, '../logs'),
    maxFiles: '14d', // Keep logs for 14 days
    maxSize: '100m', // 100MB max file size
  },

  // Performance monitoring
  performance: {
    sampling: 0.1, // Sample 10% of requests
    slowRequestThreshold: 1000, // 1 second
    errorThreshold: 0.01, // 1% error rate threshold
  },

  // Cache configuration
  cache: {
    static: {
      maxAge: '1y',
      immutable: true,
    },
    api: {
      maxAge: '5m',
      staleWhileRevalidate: '1h',
    },
  },

  // SSL configuration
  ssl: {
    key: process.env.SSL_KEY_PATH,
    cert: process.env.SSL_CERT_PATH,
    ca: process.env.SSL_CA_PATH,
  },

  // Analytics configuration
  analytics: {
    provider: 'mixpanel',
    token: process.env.REACT_APP_MIXPANEL_PROD_TOKEN,
    enabled: true,
  },

  // Error tracking
  errorTracking: {
    provider: 'sentry',
    dsn: process.env.REACT_APP_SENTRY_DSN,
    environment: 'production',
    tracesSampleRate: 0.1,
  },

  // API endpoints
  api: {
    baseUrl: process.env.REACT_APP_API_URL,
    timeout: 10000,
    retries: 3,
  },

  // Push notifications
  pushNotifications: {
    vapidPublicKey: process.env.REACT_APP_VAPID_PUBLIC_KEY,
    vapidPrivateKey: process.env.VAPID_PRIVATE_KEY,
    subject: 'mailto:support@medication-tracker.com',
  },

  // Feature flags
  features: {
    backup: true,
    notifications: true,
    analytics: true,
    errorTracking: true,
    performanceMonitoring: true,
  },
};
