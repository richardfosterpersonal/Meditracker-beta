import { z } from 'zod';
import dotenv from 'dotenv';

// Load environment variables
dotenv.config();

// Environment schema
const envSchema = z.object({
  // App
  NODE_ENV: z.enum(['development', 'test', 'production']).default('development'),
  PORT: z.string().transform(Number).default('3000'),
  
  // Database
  DATABASE_URL: z.string(),
  
  // Security
  JWT_SECRET: z.string(),
  JWT_EXPIRES_IN: z.string().default('1d'),
  
  // Error Tracking
  SENTRY_DSN: z.string().optional(),
  SENTRY_ENVIRONMENT: z.string().optional(),
  
  // APIs
  FDA_API_KEY: z.string(),
  NCCIH_API_KEY: z.string().optional(),
  
  // Email
  SMTP_HOST: z.string(),
  SMTP_PORT: z.string().transform(Number),
  SMTP_USER: z.string(),
  SMTP_PASS: z.string(),
  
  // Health Check
  HEALTH_CHECK_INTERVAL: z.string().transform(Number).default('30000'),
  HEALTH_CHECK_TIMEOUT: z.string().transform(Number).default('5000'),
  
  // Monitoring
  MAX_NOTIFICATION_QUEUE_SIZE: z.string().transform(Number).default('1000'),
  MEMORY_THRESHOLD_PERCENT: z.string().transform(Number).default('85'),
});

// Parse and validate environment
const env = envSchema.parse(process.env);

// Export validated environment
export const ENVIRONMENT = env.NODE_ENV;
export const IS_PRODUCTION = env.NODE_ENV === 'production';
export const IS_TEST = env.NODE_ENV === 'test';
export const PORT = env.PORT;

export const DATABASE_URL = env.DATABASE_URL;

export const JWT_SECRET = env.JWT_SECRET;
export const JWT_EXPIRES_IN = env.JWT_EXPIRES_IN;

export const SENTRY_CONFIG = {
  dsn: env.SENTRY_DSN,
  environment: env.SENTRY_ENVIRONMENT || env.NODE_ENV,
};

export const API_KEYS = {
  fda: env.FDA_API_KEY,
  nccih: env.NCCIH_API_KEY,
};

export const EMAIL_CONFIG = {
  host: env.SMTP_HOST,
  port: env.SMTP_PORT,
  user: env.SMTP_USER,
  pass: env.SMTP_PASS,
};

export const HEALTH_CHECK = {
  interval: env.HEALTH_CHECK_INTERVAL,
  timeout: env.HEALTH_CHECK_TIMEOUT,
};

export const MONITORING = {
  maxNotificationQueueSize: env.MAX_NOTIFICATION_QUEUE_SIZE,
  memoryThresholdPercent: env.MEMORY_THRESHOLD_PERCENT,
};
