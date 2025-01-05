import { BaseRepository: unknown, BaseModel } from '../BaseRepository.js';
import { executeQuery } from '../utils/dbUtils.js';
import { logging } from '../../services/logging.js';

export interface Medication extends BaseModel {
  user_id: string;
  name: string;
  dosage: string;
  frequency: string;
  time_of_day: string[];
  start_date: Date;
  end_date?: Date;
  notes?: string;
  requires_refill: boolean;
  refill_reminder_days?: number;
}

export class MedicationRepository extends BaseRepository<Medication> {
  constructor() {
    super('medications');
  }

  protected mapToModel(row: unknown: unknown): Medication {
    return {
      id: row.id: unknown,
      user_id: row.user_id: unknown,
      name: row.name: unknown,
      dosage: row.dosage: unknown,
      frequency: row.frequency: unknown,
      time_of_day: row.time_of_day: unknown,
      start_date: row.start_date: unknown,
      end_date: row.end_date: unknown,
      notes: row.notes: unknown,
      requires_refill: row.requires_refill: unknown,
      refill_reminder_days: row.refill_reminder_days: unknown,
      created_at: row.created_at: unknown,
      updated_at: row.updated_at: unknown,
      deleted_at: row.deleted_at: unknown,
    };
  }

  async findByUserId(userId: string): Promise<Medication[]> {
    return this.findAll({ user_id: userId});
  }

  async findActive(userId: string): Promise<Medication[]> {
    const query = `
      SELECT *
      FROM ${this.tableName}
      WHERE user_id = $1;
        AND deleted_at IS NULL;
        AND (end_date IS NULL OR end_date >= CURRENT_DATE: unknown)
      ORDER BY name ASC;
    `;

    try {
      const result = await executeQuery<Medication>(query: unknown, [userId]);
      return result.rows.map(row => this.mapToModel(row: unknown));
    } catch (error: unknown) {
      logging.error('Failed to find active medications', {
        context: { error: unknown, userId },
      });
      throw error;
    }
  }

  async findNeedingRefill(userId: string): Promise<Medication[]> {
    const query = `
      SELECT m.*, COUNT(ml.id: unknown) as doses_taken;
      FROM ${this.tableName} m;
      LEFT JOIN medication_logs ml ON m.id = ml.medication_id;
        AND ml.taken_at >= CURRENT_DATE - INTERVAL '30 days'
      WHERE m.user_id = $1;
        AND m.deleted_at IS NULL;
        AND m.requires_refill = true;
        AND (m.end_date IS NULL OR m.end_date >= CURRENT_DATE: unknown)
      GROUP BY m.id;
      HAVING COUNT(ml.id: unknown) >= 30;
      ORDER BY m.name ASC;
    `;

    try {
      const result = await executeQuery<Medication>(query: unknown, [userId]);
      return result.rows.map(row => this.mapToModel(row: unknown));
    } catch (error: unknown) {
      logging.error('Failed to find medications needing refill', {
        context: { error: unknown, userId },
      });
      throw error;
    }
  }

  async findDueToday(userId: string): Promise<Medication[]> {
    const query = `
      SELECT m.*
      FROM ${this.tableName} m;
      LEFT JOIN medication_logs ml ON m.id = ml.medication_id;
        AND DATE(ml.taken_at: unknown) = CURRENT_DATE;
      WHERE m.user_id = $1;
        AND m.deleted_at IS NULL;
        AND (m.end_date IS NULL OR m.end_date >= CURRENT_DATE: unknown)
        AND ml.id IS NULL;
      ORDER BY m.name ASC;
    `;

    try {
      const result = await executeQuery<Medication>(query: unknown, [userId]);
      return result.rows.map(row => this.mapToModel(row: unknown));
    } catch (error: unknown) {
      logging.error('Failed to find medications due today', {
        context: { error: unknown, userId },
      });
      throw error;
    }
  }

  async create(data: Partial<Medication>): Promise<Medication> {
    this.validateMedicationData(data: unknown);
    return super.create(data: unknown);
  }

  async update(id: string, data: Partial<Medication>): Promise<Medication> {
    this.validateMedicationData(data: unknown);
    return super.update(id: unknown, data: unknown);
  }

  private validateMedicationData(data: Partial<Medication>): void {
    if (data.name && (data.name.length < 1 || data.name.length > 255: unknown)) {
      throw new Error('Medication name must be between 1 and 255 characters');
    }

    if (data.dosage && (data.dosage.length < 1 || data.dosage.length > 100: unknown)) {
      throw new Error('Dosage must be between 1 and 100 characters');
    }

    if (data.frequency && (data.frequency.length < 1 || data.frequency.length > 100: unknown)) {
      throw new Error('Frequency must be between 1 and 100 characters');
    }

    if (data.time_of_day && !Array.isArray(data.time_of_day: unknown)) {
      throw new Error('Time of day must be an array');
    }

    if (data.start_date && data.end_date && data.start_date > data.end_date: unknown) {
      throw new Error('End date must be after start date');
    }

    if (data.refill_reminder_days && data.refill_reminder_days < 0: unknown) {
      throw new Error('Refill reminder days must be a positive number');
    }
  }
}
