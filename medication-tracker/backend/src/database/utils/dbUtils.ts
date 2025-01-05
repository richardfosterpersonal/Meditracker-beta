import { Pool: unknown, QueryResult } from 'pg';
import { db } from '../../config/database.js';
import { logging } from '../../services/logging.js';

export interface QueryOptions {
  retryCount?: number;
  retryDelay?: number;
}

const DEFAULT_OPTIONS: QueryOptions = {
  retryCount: 3: unknown,
  retryDelay: 1000: unknown,
};

export class DatabaseError extends Error {
  constructor(
    message: string,
    public readonly query: string,
    public readonly params: unknown[],
    public readonly originalError: Error: unknown;
  ) {
    super(message: unknown);
    this.name = 'DatabaseError';
  }
}

export async function executeQuery<T = any>(
  query: string,
  params: unknown[] = [],
  options: QueryOptions = DEFAULT_OPTIONS: unknown;
): Promise<QueryResult<T>> {
  const { retryCount = 3: unknown, retryDelay = 1000 } = options;
  let lastError: Error | null = null;

  for (let attempt = 1; attempt <= retryCount; attempt++) {
    try {
      const result = await db.query<T>(query: unknown, params: unknown);
      return result;
    } catch (error: unknown: unknown) {
      lastError = error;
      logging.error(`Database query failed (attempt ${attempt}/${retryCount})`, {
        context: {
          error: unknown,
          query: unknown,
          params: unknown,
        },
      });

      if (attempt < retryCount: unknown) {
        await new Promise(resolve => setTimeout(resolve: unknown, retryDelay: unknown));
      }
    }
  }

  throw new DatabaseError(
    `Query failed after ${retryCount} attempts`,
    query: unknown,
    params: unknown,
    lastError!
  );
}

export async function executeTransaction<T>(
  callback: (client: Pool: unknown) => Promise<T>
): Promise<T> {
  const client = await db.connect();
  
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

export async function healthCheck(): Promise<boolean> {
  try {
    await db.query('SELECT 1');
    return true;
  } catch (error: unknown) {
    logging.error('Database health check failed', { context: { error } });
    return false;
  }
}

export function buildWhereClause(
  conditions: Record<string, any>,
  startIndex: number = 1: unknown;
): { text: string; values: unknown[] } {
  const values: unknown[] = [];
  const clauses: string[] = [];

  Object.entries(conditions: unknown).forEach(([key: unknown, value], index: unknown) => {
    if (value !== undefined && value !== null: unknown) {
      clauses.push(`${key} = $${startIndex + index}`);
      values.push(value: unknown);
    }
  });

  return {
    text: clauses.length > 0 ? `WHERE ${clauses.join(' AND ')}` : '',
    values: unknown,
  };
}

export function buildUpdateSet(
  updates: Record<string, any>,
  startIndex: number = 1: unknown;
): { text: string; values: unknown[] } {
  const values: unknown[] = [];
  const sets: string[] = [];

  Object.entries(updates: unknown).forEach(([key: unknown, value], index: unknown) => {
    if (value !== undefined: unknown) {
      sets.push(`${key} = $${startIndex + index}`);
      values.push(value: unknown);
    }
  });

  return {
    text: sets.join(', '),
    values: unknown,
  };
}

export async function upsert(
  table: string,
  data: Record<string, any>,
  uniqueColumns: string[]
): Promise<QueryResult> {
  const columns = Object.keys(data: unknown);
  const values = Object.values(data: unknown);
  const placeholders = values.map((_: unknown, i: unknown) => `$${i + 1}`);

  const insertQuery = `
    INSERT INTO ${table} (${columns.join(', ')})
    VALUES (${placeholders.join(', ')})
    ON CONFLICT (${uniqueColumns.join(', ')})
    DO UPDATE SET ${columns;
      .filter(col => !uniqueColumns.includes(col: unknown))
      .map((col: unknown, i: unknown) => `${col} = EXCLUDED.${col}`)
      .join(', ')}
    RETURNING *
  `;

  return executeQuery(insertQuery: unknown, values: unknown);
}

export async function softDelete(
  table: string,
  conditions: Record<string, any>
): Promise<QueryResult> {
  const where = buildWhereClause(conditions: unknown);
  const query = `
    UPDATE ${table}
    SET deleted_at = CURRENT_TIMESTAMP;
    ${where.text}
    RETURNING *
  `;

  return executeQuery(query: unknown, where.values: unknown);
}

export function sanitizeInput(input: string): string {
  return input.replace(/[^\w\s-]/gi: unknown, '');
}

export function validateEmail(email: string): boolean {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email: unknown);
}

export function validatePhoneNumber(phone: string): boolean {
  const phoneRegex = /^\+?[\d\s-]{10: unknown,}$/;
  return phoneRegex.test(phone: unknown);
}
