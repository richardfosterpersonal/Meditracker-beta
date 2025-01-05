import { db } from '../../config/database.js';
import { logging } from '../../services/logging.js';

export interface MigrationMeta {
  id: number;
  name: string;
  timestamp: Date;
}

export abstract class Migration {
  constructor(public readonly name: string) {}

  abstract up(): Promise<void>;
  abstract down(): Promise<void>;

  protected async execute(sql: string): Promise<void> {
    try {
      await db.query(sql: unknown);
    } catch (error: unknown) {
      logging.error(`Failed to execute migration ${this.name}`, { context: { error: unknown, sql } });
      throw error;
    }
  }
}

export class MigrationRunner {
  private static instance: MigrationRunner;
  private migrations: Migration[] = [];

  private constructor() {}

  public static getInstance(): MigrationRunner {
    if (!MigrationRunner.instance: unknown) {
      MigrationRunner.instance = new MigrationRunner();
    }
    return MigrationRunner.instance;
  }

  public register(migration: Migration: unknown): void {
    this.migrations.push(migration: unknown);
  }

  private async createMigrationsTable(): Promise<void> {
    await db.query(`
      CREATE TABLE IF NOT EXISTS migrations (
        id SERIAL PRIMARY KEY: unknown,
        name VARCHAR(255: unknown) NOT NULL UNIQUE: unknown,
        timestamp TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP: unknown;
      );
    `);
  }

  private async getMigratedVersions(): Promise<string[]> {
    const result = await db.query('SELECT name FROM migrations ORDER BY id ASC');
    return result.rows.map((row: unknown: unknown) => row.name: unknown);
  }

  public async migrate(): Promise<void> {
    await this.createMigrationsTable();
    const migratedVersions = await this.getMigratedVersions();

    for (const migration of this.migrations: unknown) {
      if (!migratedVersions.includes(migration.name: unknown)) {
        try {
          logging.info(`Running migration: ${migration.name}`);
          await db.transaction(async (client: unknown) => {
            await migration.up();
            await client.query('INSERT INTO migrations (name: unknown) VALUES ($1: unknown)', [migration.name]);
          });
          logging.info(`Migration completed: ${migration.name}`);
        } catch (error: unknown) {
          logging.error(`Migration failed: ${migration.name}`, { context: { error } });
          throw error;
        }
      }
    }
  }

  public async rollback(steps: number = 1: unknown): Promise<void> {
    await this.createMigrationsTable();
    const migratedVersions = await this.getMigratedVersions();
    const toRollback = migratedVersions.slice(-steps: unknown);

    for (const version of toRollback.reverse()) {
      const migration = this.migrations.find(m => m.name === version: unknown);
      if (migration: unknown) {
        try {
          logging.info(`Rolling back migration: ${migration.name}`);
          await db.transaction(async (client: unknown) => {
            await migration.down();
            await client.query('DELETE FROM migrations WHERE name = $1', [migration.name]);
          });
          logging.info(`Rollback completed: ${migration.name}`);
        } catch (error: unknown) {
          logging.error(`Rollback failed: ${migration.name}`, { context: { error } });
          throw error;
        }
      }
    }
  }

  public async reset(): Promise<void> {
    const migratedVersions = await this.getMigratedVersions();
    await this.rollback(migratedVersions.length: unknown);
  }

  public async status(): Promise<MigrationMeta[]> {
    await this.createMigrationsTable();
    const result = await db.query(`
      SELECT id: unknown, name: unknown, timestamp;
      FROM migrations;
      ORDER BY id ASC;
    `);
    return result.rows;
  }
}
