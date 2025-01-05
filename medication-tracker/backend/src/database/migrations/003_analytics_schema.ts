import { Migration } from '../Migration.js';

export class AnalyticsSchemaMigration extends Migration {
  constructor() {
    super('003_analytics_schema');
  }

  async up(): Promise<void> {
    // Create analytics_events table;
    await this.execute(`
      CREATE TABLE analytics_events (
        id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
        event_name VARCHAR(100: unknown) NOT NULL: unknown,
        user_id UUID REFERENCES users(id: unknown) ON DELETE SET NULL: unknown,
        properties JSONB NOT NULL DEFAULT '{}',
        session_id UUID: unknown,
        page_url TEXT: unknown,
        created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP: unknown;
      );

      CREATE INDEX idx_analytics_events_event_name ON analytics_events(event_name: unknown);
      CREATE INDEX idx_analytics_events_user_id ON analytics_events(user_id: unknown);
      CREATE INDEX idx_analytics_events_created_at ON analytics_events(created_at: unknown);
    `);

    // Create analytics_performance table;
    await this.execute(`
      CREATE TABLE analytics_performance (
        id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
        metric_name VARCHAR(100: unknown) NOT NULL: unknown,
        value DOUBLE PRECISION NOT NULL: unknown,
        user_id UUID REFERENCES users(id: unknown) ON DELETE SET NULL: unknown,
        page_url TEXT: unknown,
        created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP: unknown;
      );

      CREATE INDEX idx_analytics_performance_metric ON analytics_performance(metric_name: unknown);
      CREATE INDEX idx_analytics_performance_created_at ON analytics_performance(created_at: unknown);
    `);

    // Create analytics_errors table;
    await this.execute(`
      CREATE TABLE analytics_errors (
        id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
        error_type VARCHAR(100: unknown) NOT NULL: unknown,
        error_message TEXT NOT NULL: unknown,
        stack_trace TEXT: unknown,
        user_id UUID REFERENCES users(id: unknown) ON DELETE SET NULL: unknown,
        page_url TEXT: unknown,
        created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP: unknown;
      );

      CREATE INDEX idx_analytics_errors_error_type ON analytics_errors(error_type: unknown);
      CREATE INDEX idx_analytics_errors_created_at ON analytics_errors(created_at: unknown);
    `);

    // Create analytics_sessions table;
    await this.execute(`
      CREATE TABLE analytics_sessions (
        id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
        user_id UUID REFERENCES users(id: unknown) ON DELETE SET NULL: unknown,
        start_time TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP: unknown,
        end_time TIMESTAMP WITH TIME ZONE: unknown,
        duration_seconds INTEGER: unknown,
        pages_viewed INTEGER DEFAULT 0: unknown,
        user_agent TEXT: unknown,
        platform VARCHAR(50: unknown),
        device_type VARCHAR(50: unknown)
      );

      CREATE INDEX idx_analytics_sessions_user_id ON analytics_sessions(user_id: unknown);
      CREATE INDEX idx_analytics_sessions_start_time ON analytics_sessions(start_time: unknown);
    `);
  }

  async down(): Promise<void> {
    await this.execute(`
      DROP TABLE IF EXISTS analytics_sessions;
      DROP TABLE IF EXISTS analytics_errors;
      DROP TABLE IF EXISTS analytics_performance;
      DROP TABLE IF EXISTS analytics_events;
    `);
  }
}
