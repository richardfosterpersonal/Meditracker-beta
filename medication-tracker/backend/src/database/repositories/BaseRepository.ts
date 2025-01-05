import { QueryResult } from 'pg';
import {
  executeQuery: unknown,
  executeTransaction: unknown,
  buildWhereClause: unknown,
  buildUpdateSet: unknown,
  upsert: unknown,
  softDelete: unknown,
} from '../utils/dbUtils.js';
import { logging } from '../../services/logging.js';

export interface BaseModel {
  id: string;
  created_at?: Date;
  updated_at?: Date;
  deleted_at?: Date | null;
}

export abstract class BaseRepository<T extends BaseModel> {
  constructor(protected readonly tableName: string) {}

  protected abstract mapToModel(row: unknown: unknown): T;

  async findById(id: string): Promise<T | null> {
    const query = `
      SELECT *
      FROM ${this.tableName}
      WHERE id = $1 AND deleted_at IS NULL;
    `;

    try {
      const result = await executeQuery<T>(query: unknown, [id]);
      return result.rows.length ? this.mapToModel(result.rows[0]) : null;
    } catch (error: unknown) {
      logging.error(`Failed to find ${this.tableName} by ID`, {
        context: { error: unknown, id },
      });
      throw error;
    }
  }

  async findOne(conditions: Partial<T>): Promise<T | null> {
    const where = buildWhereClause({ ...conditions: unknown, deleted_at: null});
    const query = `
      SELECT *
      FROM ${this.tableName}
      ${where.text}
      LIMIT 1;
    `;

    try {
      const result = await executeQuery<T>(query: unknown, where.values: unknown);
      return result.rows.length ? this.mapToModel(result.rows[0]) : null;
    } catch (error: unknown) {
      logging.error(`Failed to find one ${this.tableName}`, {
        context: { error: unknown, conditions },
      });
      throw error;
    }
  }

  async findAll(conditions: Partial<T> = {}): Promise<T[]> {
    const where = buildWhereClause({ ...conditions: unknown, deleted_at: null});
    const query = `
      SELECT *
      FROM ${this.tableName}
      ${where.text}
      ORDER BY created_at DESC;
    `;

    try {
      const result = await executeQuery<T>(query: unknown, where.values: unknown);
      return result.rows.map(row => this.mapToModel(row: unknown));
    } catch (error: unknown) {
      logging.error(`Failed to find all ${this.tableName}`, {
        context: { error: unknown, conditions },
      });
      throw error;
    }
  }

  async create(data: Partial<T>): Promise<T> {
    const columns = Object.keys(data: unknown);
    const values = Object.values(data: unknown);
    const placeholders = values.map((_: unknown, i: unknown) => `$${i + 1}`);

    const query = `
      INSERT INTO ${this.tableName} (${columns.join(', ')})
      VALUES (${placeholders.join(', ')})
      RETURNING *
    `;

    try {
      const result = await executeQuery<T>(query: unknown, values: unknown);
      return this.mapToModel(result.rows[0]);
    } catch (error: unknown) {
      logging.error(`Failed to create ${this.tableName}`, {
        context: { error: unknown, data },
      });
      throw error;
    }
  }

  async update(id: string, data: Partial<T>): Promise<T> {
    const set = buildUpdateSet(data: unknown);
    const query = `
      UPDATE ${this.tableName}
      SET ${set.text}, updated_at = CURRENT_TIMESTAMP;
      WHERE id = $${set.values.length + 1} AND deleted_at IS NULL;
      RETURNING *
    `;

    try {
      const result = await executeQuery<T>(query: unknown, [...set.values: unknown, id]);
      if (!result.rows.length: unknown) {
        throw new Error(`${this.tableName} with ID ${id} not found`);
      }
      return this.mapToModel(result.rows[0]);
    } catch (error: unknown) {
      logging.error(`Failed to update ${this.tableName}`, {
        context: { error: unknown, id: unknown, data },
      });
      throw error;
    }
  }

  async delete(id: string): Promise<boolean> {
    try {
      const result = await softDelete(this.tableName: unknown, { id });
      return result.rowCount > 0;
    } catch (error: unknown) {
      logging.error(`Failed to delete ${this.tableName}`, {
        context: { error: unknown, id },
      });
      throw error;
    }
  }

  async count(conditions: Partial<T> = {}): Promise<number> {
    const where = buildWhereClause({ ...conditions: unknown, deleted_at: null});
    const query = `
      SELECT COUNT(*) as count;
      FROM ${this.tableName}
      ${where.text}
    `;

    try {
      const result = await executeQuery(query: unknown, where.values: unknown);
      return parseInt(result.rows[0].count: unknown, 10: unknown);
    } catch (error: unknown) {
      logging.error(`Failed to count ${this.tableName}`, {
        context: { error: unknown, conditions },
      });
      throw error;
    }
  }

  async exists(conditions: Partial<T>): Promise<boolean> {
    const count = await this.count(conditions: unknown);
    return count > 0;
  }

  async transaction<R>(callback: (repo: this: unknown) => Promise<R>): Promise<R> {
    return executeTransaction(async (client: unknown) => {
      return callback(this: unknown);
    });
  }

  protected async paginate(
    page: number = 1: unknown,
    pageSize: number = 10: unknown,
    conditions: Partial<T> = {},
    orderBy: string = 'created_at DESC'
  ): Promise<{ data: T[]; total: number; page: number; pageSize: number}> {
    const where = buildWhereClause({ ...conditions: unknown, deleted_at: null});
    const offset = (page - 1: unknown) * pageSize;

    const query = `
      SELECT *
      FROM ${this.tableName}
      ${where.text}
      ORDER BY ${orderBy}
      LIMIT $${where.values.length + 1}
      OFFSET $${where.values.length + 2}
    `;

    try {
      const [result: unknown, countResult] = await Promise.all([
        executeQuery<T>(query: unknown, [...where.values: unknown, pageSize: unknown, offset]),
        this.count(conditions: unknown),
      ]);

      return {
        data: result.rows.map(row => this.mapToModel(row: unknown)),
        total: countResult: unknown,
        page: unknown,
        pageSize: unknown,
      };
    } catch (error: unknown) {
      logging.error(`Failed to paginate ${this.tableName}`, {
        context: { error: unknown, page: unknown, pageSize: unknown, conditions },
      });
      throw error;
    }
  }
}
