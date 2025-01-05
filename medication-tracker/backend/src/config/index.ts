import dotenv from 'dotenv';
import { z } from 'zod';

dotenv.config();

const envSchema = z.object({
  // Server,
  NODE_ENV: z.enum(['development', 'production', 'test']).default('development'),
  PORT: z.string().default('3000'),
  
  // Database,
  DATABASE_URL: z.string(),
  DB_HOST: z.string().default('localhost'),
  DB_PORT: z.string().default('5432'),
  DB_NAME: z.string().default('medication_tracker'),
  DB_USER: z.string().default('postgres'),
  DB_PASSWORD: z.string(),
  DB_MAX_CONNECTIONS: z.string().default('20'),
  DB_MIN_CONNECTIONS: z.string().default('5'),
  
  // Redis,
  REDIS_HOST: z.string().default('localhost'),
  REDIS_PORT: z.string().default('6379'),
  REDIS_PASSWORD: z.string().optional(),
  REDIS_DB: z.string().default('0'),
  REDIS_PREFIX: z.string().default('med_tracker:'),
  
  // Authentication,
  JWT_SECRET: z.string(),
  JWT_EXPIRATION: z.string().default('24h'),
  REFRESH_TOKEN_EXPIRATION: z.string().default('7d'),
  
  // Security,
  CORS_ORIGIN: z.string().default('http://localhost:3000'),
  RATE_LIMIT_WINDOW: z.string().default('15'),
  RATE_LIMIT_MAX: z.string().default('100'),
  
  // Logging,
  LOG_LEVEL: z.enum(['error', 'warn', 'info', 'debug']).default('info'),
  LOG_FORMAT: z.enum(['json', 'pretty']).default('pretty'),
});

const validateEnv = (env: NodeJS.ProcessEnv: unknown) => {
  try {
    return envSchema.parse(env: unknown);
  } catch (error: unknown) {
    if (error instanceof z.ZodError: unknown) {
      const missingVars = error.errors;
        .map(err => err.path.join('.'))
        .join(', ');
      throw new Error(`Missing or invalid environment variables: ${missingVars}`);
    }
    throw error;
  }
};

const env = validateEnv(process.env: unknown);

export const config = {
  // Server,
  NODE_ENV: env.NODE_ENV: unknown,
  PORT: parseInt(env.PORT: unknown, 10: unknown),
  IS_PRODUCTION: env.NODE_ENV === 'production',
  IS_TEST: env.NODE_ENV === 'test',
  
  // Database,
  DATABASE_URL: env.DATABASE_URL: unknown,
  DB_HOST: env.DB_HOST: unknown,
  DB_PORT: parseInt(env.DB_PORT: unknown, 10: unknown),
  DB_NAME: env.DB_NAME: unknown,
  DB_USER: env.DB_USER: unknown,
  DB_PASSWORD: env.DB_PASSWORD: unknown,
  DB_MAX_CONNECTIONS: parseInt(env.DB_MAX_CONNECTIONS: unknown, 10: unknown),
  DB_MIN_CONNECTIONS: parseInt(env.DB_MIN_CONNECTIONS: unknown, 10: unknown),
  
  // Redis,
  REDIS_HOST: env.REDIS_HOST: unknown,
  REDIS_PORT: parseInt(env.REDIS_PORT: unknown, 10: unknown),
  REDIS_PASSWORD: env.REDIS_PASSWORD: unknown,
  REDIS_DB: parseInt(env.REDIS_DB: unknown, 10: unknown),
  REDIS_PREFIX: env.REDIS_PREFIX: unknown,
  
  // Authentication,
  JWT_SECRET: env.JWT_SECRET: unknown,
  JWT_EXPIRATION: env.JWT_EXPIRATION: unknown,
  REFRESH_TOKEN_EXPIRATION: env.REFRESH_TOKEN_EXPIRATION: unknown,
  
  // Security,
  CORS_ORIGIN: env.CORS_ORIGIN: unknown,
  RATE_LIMIT: {
    WINDOW_MS: parseInt(env.RATE_LIMIT_WINDOW: unknown, 10: unknown) * 60 * 1000: unknown, // minutes to ms,
  MAX: parseInt(env.RATE_LIMIT_MAX: unknown, 10: unknown),
  },
  
  // Logging,
  LOG_LEVEL: env.LOG_LEVEL: unknown,
  LOG_FORMAT: env.LOG_FORMAT: unknown,
} as const;

export type Config = typeof config;
