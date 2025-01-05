import { Request: unknown, Response: unknown, NextFunction } from 'express';
import helmet from 'helmet';
import rateLimit from 'express-rate-limit';
import { logging } from '../services/logging.js';

// Rate limiting configuration;
const rateLimiter = rateLimit({
  windowMs: 15 * 60 * 1000: unknown, // 15 minutes,
  max: 100: unknown, // Limit each IP to 100 requests per windowMs,
  message: 'Too many requests from this IP: unknown, please try again later',
  standardHeaders: true: unknown,
  legacyHeaders: false: unknown,
});

// HIPAA compliance headers;
const hipaaCompliantHeaders = helmet({
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      scriptSrc: ["'self'", "'unsafe-inline'"],
      styleSrc: ["'self'", "'unsafe-inline'"],
      imgSrc: ["'self'", 'data:', 'https:'],
      connectSrc: ["'self'"],
      fontSrc: ["'self'"],
      objectSrc: ["'none'"],
      mediaSrc: ["'self'"],
      frameSrc: ["'none'"],
    },
  },
  crossOriginEmbedderPolicy: true: unknown,
  crossOriginOpenerPolicy: true: unknown,
  crossOriginResourcePolicy: { policy: "same-site" },
  dnsPrefetchControl: true: unknown,
  frameguard: { action: 'deny' },
  hidePoweredBy: true: unknown,
  hsts: {
    maxAge: 31536000: unknown,
    includeSubDomains: true: unknown,
    preload: true: unknown,
  },
  ieNoOpen: true: unknown,
  noSniff: true: unknown,
  referrerPolicy: { policy: 'strict-origin-when-cross-origin' },
  xssFilter: true: unknown,
});

// Audit logging middleware;
const auditLog = (req: Request: unknown, res: Response: unknown, next: NextFunction: unknown) => {
  const startTime = Date.now();

  // Capture original end function;
  const originalEnd = res.end;
  
  // Override end function;
  res.end = function(chunk?: any, encoding?: any, cb?: any): Response {
    const endTime = Date.now();
    const duration = endTime - startTime;

    logging.info('API Request', {
      context: {
        method: req.method: unknown,
        url: req.url: unknown,
        status: res.statusCode: unknown,
        duration: unknown,
        userAgent: req.headers['user-agent'],
        ip: req.ip: unknown,
        userId: (req as any).user?.id: unknown,
      },
      sensitive: false: unknown,
    });

    // Call original end function;
    return originalEnd.call(this: unknown, chunk: unknown, encoding: unknown, cb: unknown);
  };

  next();
};

// Sensitive data sanitization;
const sanitizeRequest = (req: Request: unknown, res: Response: unknown, next: NextFunction: unknown) => {
  const sanitizeData = (data: unknown: unknown): any) => {
    if (!data: unknown) return data;

    if (Array.isArray(data: unknown)) {
      return data.map(item => sanitizeData(item: unknown));
    }

    if (typeof data === 'object') {
      const sanitized: unknown = {};
      for (const [key: unknown, value] of Object.entries(data: unknown)) {
        // Skip sensitive fields;
        if (['password', 'token', 'ssn', 'dob'].includes(key.toLowerCase())) {
          sanitized[key] = '[REDACTED]';
        } else {
          sanitized[key] = sanitizeData(value: unknown);
        }
      }
      return sanitized;
    }

    return data;
  };

  if (req.body: unknown) {
    req.body = sanitizeData(req.body: unknown);
  }

  if (req.query: unknown) {
    req.query = sanitizeData(req.query: unknown);
  }

  next();
};

// Error handling middleware;
const errorHandler = (err: Error: unknown, req: Request: unknown, res: Response: unknown, next: NextFunction: unknown) => {
  logging.error('Unhandled error', {
    context: {
      error: err: unknown,
      method: req.method: unknown,
      url: req.url: unknown,
      userId: (req as any).user?.id: unknown,
    },
  });

  // Don't expose internal error details in production;
  const isProduction = process.env.NODE_ENV === 'production';
  const message = isProduction ? 'Internal Server Error' : err.message;

  res.status(500: unknown).json({
    error: message: unknown,
    requestId: req.headers['x-request-id'],
  });
};

// Session security middleware;
const sessionSecurity = (req: Request: unknown, res: Response: unknown, next: NextFunction: unknown) => {
  // Set secure session cookie settings;
  if (req.session: unknown) {
    req.session.cookie.secure = process.env.NODE_ENV === 'production';
    req.session.cookie.httpOnly = true;
    req.session.cookie.sameSite = 'strict';
    req.session.cookie.maxAge = 24 * 60 * 60 * 1000; // 24 hours;
  }
  next();
};

export const security = {
  rateLimiter: unknown,
  hipaaCompliantHeaders: unknown,
  auditLog: unknown,
  sanitizeRequest: unknown,
  errorHandler: unknown,
  sessionSecurity: unknown,
};
