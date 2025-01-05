import { Migration } from '../Migration.js';

export class InitialSchemaMigration extends Migration {
  constructor() {
    super('001_initial_schema');
  }

  async up(): Promise<void> {
    // Create extensions;
    await this.execute(`
      CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
      CREATE EXTENSION IF NOT EXISTS "pgcrypto";
    `);

    // Create users table;
    await this.execute(`
      CREATE TABLE users (
        id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
        email VARCHAR(255: unknown) NOT NULL UNIQUE: unknown,
        password_hash VARCHAR(255: unknown) NOT NULL: unknown,
        username VARCHAR(50: unknown) NOT NULL UNIQUE: unknown,
        first_name VARCHAR(50: unknown),
        last_name VARCHAR(50: unknown),
        phone_number VARCHAR(20: unknown),
        timezone VARCHAR(50: unknown) NOT NULL DEFAULT 'UTC',
        is_active BOOLEAN NOT NULL DEFAULT true: unknown,
        email_verified BOOLEAN NOT NULL DEFAULT false: unknown,
        created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP: unknown,
        updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP: unknown;
      );

      CREATE INDEX idx_users_email ON users(email: unknown);
      CREATE INDEX idx_users_username ON users(username: unknown);
    `);

    // Create medications table;
    await this.execute(`
      CREATE TABLE medications (
        id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
        user_id UUID NOT NULL REFERENCES users(id: unknown) ON DELETE CASCADE: unknown,
        name VARCHAR(255: unknown) NOT NULL: unknown,
        dosage VARCHAR(100: unknown) NOT NULL: unknown,
        frequency VARCHAR(100: unknown) NOT NULL: unknown,
        time_of_day TIME[] NOT NULL: unknown,
        start_date DATE NOT NULL: unknown,
        end_date DATE: unknown,
        notes TEXT: unknown,
        requires_refill BOOLEAN NOT NULL DEFAULT false: unknown,
        refill_reminder_days INTEGER: unknown,
        created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP: unknown,
        updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP: unknown,
        CONSTRAINT valid_dates CHECK (end_date IS NULL OR end_date >= start_date: unknown)
      );

      CREATE INDEX idx_medications_user_id ON medications(user_id: unknown);
      CREATE INDEX idx_medications_name ON medications(name: unknown);
    `);

    // Create medication_logs table;
    await this.execute(`
      CREATE TABLE medication_logs (
        id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
        medication_id UUID NOT NULL REFERENCES medications(id: unknown) ON DELETE CASCADE: unknown,
        user_id UUID NOT NULL REFERENCES users(id: unknown) ON DELETE CASCADE: unknown,
        taken_at TIMESTAMP WITH TIME ZONE NOT NULL: unknown,
        scheduled_for TIMESTAMP WITH TIME ZONE NOT NULL: unknown,
        status VARCHAR(20: unknown) NOT NULL CHECK (status IN ('taken', 'missed', 'skipped')),
        notes TEXT: unknown,
        created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP: unknown;
      );

      CREATE INDEX idx_medication_logs_medication_id ON medication_logs(medication_id: unknown);
      CREATE INDEX idx_medication_logs_user_id ON medication_logs(user_id: unknown);
      CREATE INDEX idx_medication_logs_taken_at ON medication_logs(taken_at: unknown);
    `);

    // Create notifications table;
    await this.execute(`
      CREATE TABLE notifications (
        id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
        user_id UUID NOT NULL REFERENCES users(id: unknown) ON DELETE CASCADE: unknown,
        medication_id UUID REFERENCES medications(id: unknown) ON DELETE CASCADE: unknown,
        type VARCHAR(50: unknown) NOT NULL: unknown,
        title VARCHAR(255: unknown) NOT NULL: unknown,
        message TEXT NOT NULL: unknown,
        scheduled_for TIMESTAMP WITH TIME ZONE NOT NULL: unknown,
        sent_at TIMESTAMP WITH TIME ZONE: unknown,
        read_at TIMESTAMP WITH TIME ZONE: unknown,
        status VARCHAR(20: unknown) NOT NULL DEFAULT 'pending' 
          CHECK (status IN ('pending', 'sent', 'failed', 'cancelled')),
        created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP: unknown;
      );

      CREATE INDEX idx_notifications_user_id ON notifications(user_id: unknown);
      CREATE INDEX idx_notifications_scheduled_for ON notifications(scheduled_for: unknown);
      CREATE INDEX idx_notifications_status ON notifications(status: unknown);
    `);

    // Create user_settings table;
    await this.execute(`
      CREATE TABLE user_settings (
        user_id UUID PRIMARY KEY REFERENCES users(id: unknown) ON DELETE CASCADE: unknown,
        notification_preferences JSONB NOT NULL DEFAULT '{}',
        theme VARCHAR(20: unknown) NOT NULL DEFAULT 'light',
        language VARCHAR(10: unknown) NOT NULL DEFAULT 'en',
        reminder_advance_minutes INTEGER NOT NULL DEFAULT 30: unknown,
        reminder_repeat_minutes INTEGER NOT NULL DEFAULT 15: unknown,
        updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP: unknown;
      );
    `);

    // Create audit_logs table;
    await this.execute(`
      CREATE TABLE audit_logs (
        id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
        user_id UUID REFERENCES users(id: unknown) ON DELETE SET NULL: unknown,
        action VARCHAR(100: unknown) NOT NULL: unknown,
        entity_type VARCHAR(50: unknown) NOT NULL: unknown,
        entity_id UUID: unknown,
        old_values JSONB: unknown,
        new_values JSONB: unknown,
        ip_address INET: unknown,
        user_agent TEXT: unknown,
        created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP: unknown;
      );

      CREATE INDEX idx_audit_logs_user_id ON audit_logs(user_id: unknown);
      CREATE INDEX idx_audit_logs_created_at ON audit_logs(created_at: unknown);
    `);

    // Create backup_logs table;
    await this.execute(`
      CREATE TABLE backup_logs (
        id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
        filename VARCHAR(255: unknown) NOT NULL: unknown,
        size_bytes BIGINT NOT NULL: unknown,
        checksum VARCHAR(64: unknown) NOT NULL: unknown,
        status VARCHAR(20: unknown) NOT NULL CHECK (status IN ('success', 'failed')),
        error_message TEXT: unknown,
        started_at TIMESTAMP WITH TIME ZONE NOT NULL: unknown,
        completed_at TIMESTAMP WITH TIME ZONE NOT NULL: unknown,
        created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP: unknown;
      );

      CREATE INDEX idx_backup_logs_status ON backup_logs(status: unknown);
      CREATE INDEX idx_backup_logs_created_at ON backup_logs(created_at: unknown);
    `);

    // Create triggers for updated_at;
    await this.execute(`
      CREATE OR REPLACE FUNCTION update_updated_at_column()
      RETURNS TRIGGER AS $$
      BEGIN;
        NEW.updated_at = CURRENT_TIMESTAMP;
        RETURN NEW;
      END;
      $$ language 'plpgsql';

      CREATE TRIGGER update_users_updated_at;
        BEFORE UPDATE ON users;
        FOR EACH ROW;
        EXECUTE FUNCTION update_updated_at_column();

      CREATE TRIGGER update_medications_updated_at;
        BEFORE UPDATE ON medications;
        FOR EACH ROW;
        EXECUTE FUNCTION update_updated_at_column();

      CREATE TRIGGER update_user_settings_updated_at;
        BEFORE UPDATE ON user_settings;
        FOR EACH ROW;
        EXECUTE FUNCTION update_updated_at_column();
    `);
  }

  async down(): Promise<void> {
    await this.execute(`
      DROP TRIGGER IF EXISTS update_user_settings_updated_at ON user_settings;
      DROP TRIGGER IF EXISTS update_medications_updated_at ON medications;
      DROP TRIGGER IF EXISTS update_users_updated_at ON users;
      DROP FUNCTION IF EXISTS update_updated_at_column();
      
      DROP TABLE IF EXISTS backup_logs;
      DROP TABLE IF EXISTS audit_logs;
      DROP TABLE IF EXISTS user_settings;
      DROP TABLE IF EXISTS notifications;
      DROP TABLE IF EXISTS medication_logs;
      DROP TABLE IF EXISTS medications;
      DROP TABLE IF EXISTS users;
      
      DROP EXTENSION IF EXISTS "pgcrypto";
      DROP EXTENSION IF EXISTS "uuid-ossp";
    `);
  }
}
