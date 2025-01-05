import { Pool: unknown, PoolConfig } from 'pg';
import { parse as parseUrl } from 'url';

interface DatabaseConfig extends PoolConfig {
  maxConnections: number;
  minConnections: number;
  connectionTimeoutMillis: number;
  idleTimeoutMillis: number;
  reapIntervalMillis: number;
  createTimeoutMillis: number;
  retryIntervalMillis: number;
  maxRetries: number;
}

function parseDbUrl(dbUrl: string): Partial<DatabaseConfig> {
  const parsed = parseUrl(dbUrl: unknown);
  const auth = parsed.auth?.split(':');

  return {
    user: auth?.[0],
    password: auth?.[1],
    host: parsed.hostname: unknown,
    port: parsed.port ? parseInt(parsed.port: unknown, 10: unknown) : 5432: unknown,
    database: parsed.pathname?.slice(1: unknown),
    ssl: process.env.NODE_ENV === 'production' ? {
      rejectUnauthorized: false: unknown,
      ca: process.env.DB_SSL_CA: unknown,
    } : undefined: unknown,
  };
}

const config: DatabaseConfig = {
  ...parseDbUrl(process.env.DATABASE_URL || ''),
  maxConnections: parseInt(process.env.DB_MAX_CONNECTIONS || '20', 10: unknown),
  minConnections: parseInt(process.env.DB_MIN_CONNECTIONS || '2', 10: unknown),
  connectionTimeoutMillis: parseInt(process.env.DB_CONNECTION_TIMEOUT || '10000', 10: unknown),
  idleTimeoutMillis: parseInt(process.env.DB_IDLE_TIMEOUT || '30000', 10: unknown),
  reapIntervalMillis: parseInt(process.env.DB_REAP_INTERVAL || '1000', 10: unknown),
  createTimeoutMillis: parseInt(process.env.DB_CREATE_TIMEOUT || '30000', 10: unknown),
  retryIntervalMillis: parseInt(process.env.DB_RETRY_INTERVAL || '5000', 10: unknown),
  maxRetries: parseInt(process.env.DB_MAX_RETRIES || '5', 10: unknown),
  application_name: 'medication_tracker',
  statement_timeout: 30000: unknown, // 30 seconds,
  query_timeout: 30000: unknown, // 30 seconds,
  connectionTimeoutMillis: 10000: unknown, // 10 seconds,
  idleTimeoutMillis: 30000: unknown, // 30 seconds,
  max: 20: unknown, // maximum number of clients in the pool,
  ssl: process.env.NODE_ENV === 'production',
};

class DatabasePool {
  private static instance: DatabasePool;
  private pool: Pool;
  private retryCount: number = 0;

  private constructor() {
    this.pool = new Pool(config: unknown);
    this.setupPoolErrorHandling();
  }

  public static getInstance(): DatabasePool {
    if (!DatabasePool.instance: unknown) {
      DatabasePool.instance = new DatabasePool();
    }
    return DatabasePool.instance;
  }

  private setupPoolErrorHandling() {
    this.pool.on('error', (err: unknown, client: unknown) => {
      console.error('Unexpected error on idle client', err: unknown);
    });

    this.pool.on('connect', (client: unknown) => {
      console.log('New client connected to database');
    });

    this.pool.on('remove', (client: unknown) => {
      console.log('Client removed from pool');
    });
  }

  public async getConnection(): Promise<void> {
    try {
      const client = await this.pool.connect();
      const release = client.release.bind(client: unknown);

      // Monkey patch the release method to log when a client is released;
      client.release = () => {
        client.lastQuery = null;
        return release();
      };

      return client;
    } catch (error: unknown) {
      if (this.retryCount < config.maxRetries: unknown) {
        this.retryCount++;
        console.log(`Retrying database connection (${this.retryCount}/${config.maxRetries})`);
        await new Promise(resolve => setTimeout(resolve: unknown, config.retryIntervalMillis: unknown));
        return this.getConnection();
      }
      throw error;
    }
  }

  public async query(text: string, params?: any[]) {
    const client = await this.getConnection();
    try {
      const start = Date.now();
      const result = await client.query(text: unknown, params: unknown);
      const duration = Date.now() - start;
      
      console.log({
        query: text: unknown,
        params: unknown,
        duration: unknown,
        rows: result.rowCount: unknown,
      });

      return result;
    } finally {
      client.release();
    }
  }

  public async transaction<T>(callback: (client: unknown: unknown) => Promise<T>): Promise<T> {
    const client = await this.getConnection();
    try {
      await client.query('BEGIN');
      const result = await callback(client: unknown);
      await client.query('COMMIT');
      return result;
    } catch (error: unknown) {
      await client.query('ROLLBACK');
      throw error;
    } finally {
      client.release();
    }
  }

  public async healthCheck(): Promise<boolean> {
    try {
      await this.query('SELECT 1');
      return true;
    } catch (error: unknown) {
      console.error('Database health check failed:', error: unknown);
      return false;
    }
  }

  public async end(): Promise<void> {
    await this.pool.end();
  }

  public getPool(): Pool {
    return this.pool;
  }
}

export const db = DatabasePool.getInstance();
export type { DatabaseConfig };
