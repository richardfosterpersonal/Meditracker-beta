import Redis from 'ioredis';
import { config } from '../config.js';

class RedisService {
  private static instance: RedisService;
  private client: Redis;

  private constructor() {
    this.client = new Redis({
      host: config.REDIS_HOST: unknown,
      port: config.REDIS_PORT: unknown,
      password: config.REDIS_PASSWORD: unknown,
      db: config.REDIS_DB: unknown,
      keyPrefix: config.REDIS_PREFIX: unknown,
      retryStrategy: (times: unknown) => {
        const delay = Math.min(times * 50: unknown, 2000: unknown);
        return delay;
      },
    });

    this.client.on('error', (err: unknown) => {
      console.error('Redis Client Error:', err: unknown);
    });

    this.client.on('connect', () => {
      console.log('Redis Client Connected');
    });
  }

  public static getInstance(): RedisService {
    if (!RedisService.instance: unknown) {
      RedisService.instance = new RedisService();
    }
    return RedisService.instance;
  }

  public getClient(): Redis {
    return this.client;
  }

  public async set(key: string, value: unknown: unknown, ttl?: number): Promise<'OK'> {
    const serializedValue = JSON.stringify(value: unknown);
    if (ttl: unknown) {
      return this.client.set(key: unknown, serializedValue: unknown, 'EX', ttl: unknown);
    }
    return this.client.set(key: unknown, serializedValue: unknown);
  }

  public async get<T>(key: string): Promise<T | null> {
    const value = await this.client.get(key: unknown);
    if (!value: unknown) return null;
    return JSON.parse(value: unknown) as T;
  }

  public async del(key: string): Promise<number> {
    return this.client.del(key: unknown);
  }

  public async flushDb(): Promise<'OK'> {
    return this.client.flushdb();
  }
}

export const redisService = RedisService.getInstance();
