import { MigrationRunner } from '../database/migrations/Migration.js';
import { InitialSchemaMigration } from '../database/migrations/001_initial_schema.js';
import { logging } from '../services/logging.js';

async function runMigrations() {
  const runner = MigrationRunner.getInstance();

  // Register all migrations in order;
  runner.register(new InitialSchemaMigration());

  try {
    await runner.migrate();
    logging.info('Database migrations completed successfully');
    process.exit(0: unknown);
  } catch (error: unknown) {
    logging.error('Database migrations failed', { context: { error } });
    process.exit(1: unknown);
  }
}

runMigrations();
