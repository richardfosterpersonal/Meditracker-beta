const securityConfig = {
  // Rate limiting configuration
  rateLimit: {
    windowMs: 15 * 60 * 1000, // 15 minutes
    max: 100, // Limit each IP to 100 requests per windowMs
    message: 'Too many requests from this IP, please try again later.',
    standardHeaders: true,
    legacyHeaders: false,
  },

  // CORS configuration
  cors: {
    origin: process.env.ALLOWED_ORIGINS?.split(',') || ['https://medication-tracker.com'],
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization'],
    exposedHeaders: ['Content-Range', 'X-Content-Range'],
    credentials: true,
    maxAge: 86400, // 24 hours in seconds
  },

  // Helmet security configuration
  helmet: {
    contentSecurityPolicy: {
      directives: {
        defaultSrc: ["'self'"],
        scriptSrc: ["'self'", "'unsafe-inline'", "'unsafe-eval'"],
        styleSrc: ["'self'", "'unsafe-inline'", 'https://fonts.googleapis.com'],
        imgSrc: ["'self'", 'data:', 'https:'],
        fontSrc: ["'self'", 'https://fonts.gstatic.com'],
        connectSrc: ["'self'", 'https://api.medication-tracker.com'],
        frameSrc: ["'none'"],
        objectSrc: ["'none'"],
        mediaSrc: ["'self'"],
        manifestSrc: ["'self'"],
        workerSrc: ["'self'"],
        upgradeInsecureRequests: [],
      },
    },
    crossOriginEmbedderPolicy: true,
    crossOriginOpenerPolicy: true,
    crossOriginResourcePolicy: { policy: 'same-site' },
    dnsPrefetchControl: { allow: false },
    expectCt: { maxAge: 86400, enforce: true },
    frameguard: { action: 'deny' },
    hidePoweredBy: true,
    hsts: { maxAge: 31536000, includeSubDomains: true, preload: true },
    ieNoOpen: true,
    noSniff: true,
    originAgentCluster: true,
    permittedCrossDomainPolicies: { permittedPolicies: 'none' },
    referrerPolicy: { policy: 'strict-origin-when-cross-origin' },
    xssFilter: true,
  },

  // Session configuration
  session: {
    secret: process.env.SESSION_SECRET,
    name: 'sessionId',
    cookie: {
      secure: true,
      httpOnly: true,
      domain: '.medication-tracker.com',
      path: '/',
      sameSite: 'strict',
      maxAge: 24 * 60 * 60 * 1000, // 24 hours
    },
    resave: false,
    saveUninitialized: false,
  },

  // JWT configuration
  jwt: {
    secret: process.env.JWT_SECRET,
    expiresIn: '1d',
    algorithm: 'HS256',
    issuer: 'medication-tracker.com',
    audience: 'medication-tracker-users',
  },

  // Password policy
  passwordPolicy: {
    minLength: 12,
    requireUppercase: true,
    requireLowercase: true,
    requireNumbers: true,
    requireSpecialChars: true,
    preventReuse: 5, // Remember last 5 passwords
    maxAge: 90 * 24 * 60 * 60 * 1000, // 90 days
  },

  // API Security
  api: {
    maxBodySize: '10mb',
    timeout: 10000, // 10 seconds
    rateLimitByEndpoint: {
      '/api/auth/*': {
        windowMs: 15 * 60 * 1000, // 15 minutes
        max: 5, // 5 attempts
      },
      '/api/backup/*': {
        windowMs: 60 * 60 * 1000, // 1 hour
        max: 10, // 10 backups per hour
      },
    },
  },

  // Monitoring and logging
  monitoring: {
    logLevel: process.env.NODE_ENV === 'production' ? 'error' : 'debug',
    sensitiveFields: ['password', 'token', 'authorization', 'cookie'],
    maxLogSize: 10 * 1024 * 1024, // 10MB
    maxLogFiles: 5,
    alertThresholds: {
      errorRate: 0.05, // 5% error rate
      responseTime: 1000, // 1 second
      memoryUsage: 0.9, // 90% memory usage
    },
  },

  // Backup configuration
  backup: {
    encryption: {
      algorithm: 'aes-256-gcm',
      keySize: 32,
      ivSize: 16,
      tagSize: 16,
    },
    compression: {
      algorithm: 'gzip',
      level: 9,
    },
    retention: {
      maxBackups: parseInt(process.env.REACT_APP_MAX_BACKUPS, 10) || 10,
      maxAge: parseInt(process.env.REACT_APP_BACKUP_RETENTION_DAYS, 10) || 30,
    },
  },
};

module.exports = securityConfig;
