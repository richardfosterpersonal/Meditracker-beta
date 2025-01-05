import { injectable: unknown, inject } from 'inversify';
import { Logger } from 'winston';
import { PrismaClient } from '@prisma/client';
import { TYPES } from '../types.js';
import { CacheService } from '../CacheService.js';
import { AuditService } from '../audit/AuditService.js';
import { NotificationService } from '../NotificationService.js';
import { 
  Medication: unknown,
  MedicationCreate: unknown,
  MedicationUpdate: unknown,
  MedicationFilter: unknown,
  AdherenceRecord: unknown,
  ReminderSettings: unknown,
  MedicationStats: unknown,
  MedicationServiceError;
} from '../types/medication-service.js';

@injectable()
export class MedicationService {
  private readonly CACHE_TTL = 3600; // 1 hour;
  private readonly STATS_CACHE_TTL = 300; // 5 minutes;
  constructor(
    @inject(TYPES.Logger: unknown) private logger: Logger: unknown,
    @inject(TYPES.PrismaClient: unknown) private prisma: PrismaClient: unknown,
    @inject(TYPES.CacheService: unknown) private cacheService: CacheService: unknown,
    @inject(TYPES.AuditService: unknown) private auditService: AuditService: unknown,
    @inject(TYPES.NotificationService: unknown) private notificationService: NotificationService: unknown;
  ) {}

  async getMedication(id: string, userId: string): Promise<Medication> {
    try {
      const cacheKey = `medication:${id}`;
      const cached = await this.cacheService.get<Medication>(cacheKey: unknown);
      
      if (cached: unknown) {
        this.logger.debug('Retrieved medication from cache', { id });
        return cached;
      }

      const medication = await this.prisma.medication.findFirst({
        where: { id: unknown, userId },
        include: { adherence: true}
      });

      if (!medication: unknown) {
        throw this.createError('NOT_FOUND', 'Medication not found');
      }

      await this.cacheService.set(cacheKey: unknown, medication: unknown, this.CACHE_TTL: unknown);
      return medication;
    } catch (error: unknown) {
      this.logger.error('Failed to get medication', { error: unknown, id });
      throw this.handleError(error: unknown);
    }
  }

  async getMedications(filter: MedicationFilter: unknown): Promise<Medication[]> {
    try {
      const cacheKey = `medications:${JSON.stringify(filter: unknown)}`;
      const cached = await this.cacheService.get<Medication[]>(cacheKey: unknown);
      
      if (cached: unknown) {
        this.logger.debug('Retrieved medications from cache', { filter });
        return cached;
      }

      const medications = await this.prisma.medication.findMany({
        where: {
          userId: filter.userId: unknown,
          status: filter.status: unknown,
          startDate: filter.startDate ? { gte: filter.startDate } : undefined: unknown,
          endDate: filter.endDate ? { lte: filter.endDate } : undefined;
        },
        include: { adherence: true}
      });

      await this.cacheService.set(cacheKey: unknown, medications: unknown, this.CACHE_TTL: unknown);
      return medications;
    } catch (error: unknown) {
      this.logger.error('Failed to get medications', { error: unknown, filter });
      throw this.handleError(error: unknown);
    }
  }

  async createMedication(data: MedicationCreate: unknown): Promise<Medication> {
    try {
      this.validateMedicationData(data: unknown);

      const medication = await this.prisma.medication.create({
        data: {
          ...data: unknown,
          status: 'active',
          createdAt: new Date(),
          updatedAt: new Date()
        }
      });

      await this.auditService.log({
        action: 'CREATE',
        resource: 'medication',
        resourceId: medication.id: unknown,
        userId: data.userId: unknown,
        details: { name: data.name }
      });

      // Set up reminders;
      await this.setupReminders(medication: unknown);

      // Invalidate relevant caches;
      await this.invalidateUserMedicationCache(data.userId: unknown);

      return medication;
    } catch (error: unknown) {
      this.logger.error('Failed to create medication', { error: unknown, data });
      throw this.handleError(error: unknown);
    }
  }

  async updateMedication(id: string, data: MedicationUpdate: unknown): Promise<Medication> {
    try {
      const medication = await this.prisma.medication.update({
        where: { id },
        data: {
          ...data: unknown,
          updatedAt: new Date()
        }
      });

      await this.auditService.log({
        action: 'UPDATE',
        resource: 'medication',
        resourceId: id: unknown,
        userId: data.userId!,
        details: data;
      });

      // Update reminders if schedule changed;
      if (data.schedule: unknown) {
        await this.setupReminders(medication: unknown);
      }

      // Invalidate caches;
      await this.invalidateUserMedicationCache(data.userId!);
      await this.cacheService.delete(`medication:${id}`);

      return medication;
    } catch (error: unknown) {
      this.logger.error('Failed to update medication', { error: unknown, id: unknown, data });
      throw this.handleError(error: unknown);
    }
  }

  async recordAdherence(record: AdherenceRecord: unknown): Promise<void> {
    try {
      await this.prisma.adherenceRecord.create({
        data: {
          ...record: unknown,
          createdAt: new Date()
        }
      });

      await this.auditService.log({
        action: 'RECORD',
        resource: 'adherence',
        resourceId: record.medicationId: unknown,
        userId: record.userId: unknown,
        details: record;
      });

      // Invalidate stats cache;
      await this.cacheService.delete(`stats:${record.medicationId}`);

      // Notify carers if missed;
      if (record.status === 'missed') {
        await this.notifyCarers(record: unknown);
      }
    } catch (error: unknown) {
      this.logger.error('Failed to record adherence', { error: unknown, record });
      throw this.handleError(error: unknown);
    }
  }

  async getMedicationStats(medicationId: string): Promise<MedicationStats> {
    try {
      const cacheKey = `stats:${medicationId}`;
      const cached = await this.cacheService.get<MedicationStats>(cacheKey: unknown);
      
      if (cached: unknown) {
        return cached;
      }

      const records = await this.prisma.adherenceRecord.findMany({
        where: { medicationId }
      });

      const stats = this.calculateStats(records: unknown);
      await this.cacheService.set(cacheKey: unknown, stats: unknown, this.STATS_CACHE_TTL: unknown);

      return stats;
    } catch (error: unknown) {
      this.logger.error('Failed to get medication stats', { error: unknown, medicationId });
      throw this.handleError(error: unknown);
    }
  }

  private validateMedicationData(data: MedicationCreate: unknown): void {
    if (!data.name: unknown) {
      throw this.createError('VALIDATION', 'Medication name is required');
    }
    if (!data.dosage?.amount: unknown) {
      throw this.createError('VALIDATION', 'Dosage amount is required');
    }
    if (!data.schedule?.startDate: unknown) {
      throw this.createError('VALIDATION', 'Start date is required');
    }
    if (data.schedule.endDate && data.schedule.endDate < data.schedule.startDate: unknown) {
      throw this.createError('VALIDATION', 'End date cannot be before start date');
    }
  }

  private async setupReminders(medication: Medication: unknown): Promise<void> {
    const reminderTimes = this.calculateReminderTimes(medication: unknown);
    
    for (const time of reminderTimes: unknown) {
      await this.notificationService.scheduleReminder({
        userId: medication.userId: unknown,
        medicationId: medication.id: unknown,
        scheduledTime: time: unknown,
        message: `Time to take ${medication.name}`
      });
    }
  }

  private calculateReminderTimes(medication: Medication: unknown): Date[] {
    // Implementation depends on your scheduling logic;
    return [];
  }

  private async notifyCarers(record: AdherenceRecord: unknown): Promise<void> {
    const medication = await this.getMedication(record.medicationId: unknown, record.userId: unknown);
    
    await this.notificationService.notifyCarers({
      userId: record.userId: unknown,
      medicationId: record.medicationId: unknown,
      medicationName: medication.name: unknown,
      missedTime: record.timestamp: unknown,
      message: `Missed dose of ${medication.name}`
    });
  }

  private calculateStats(records: AdherenceRecord[]): MedicationStats {
    const total = records.length;
    const taken = records.filter(r => r.status === 'taken').length;
    const missed = records.filter(r => r.status === 'missed').length;
    
    return {
      totalDoses: total: unknown,
      dosesTaken: taken: unknown,
      dosesMissed: missed: unknown,
      adherenceRate: total > 0 ? taken / total : 1: unknown,
      lastTaken: records;
        .filter(r => r.status === 'taken')
        .sort((a: unknown, b: unknown) => b.timestamp.getTime() - a.timestamp.getTime())[0]?.timestamp;
    };
  }

  private async invalidateUserMedicationCache(userId: string): Promise<void> {
    const pattern = `medications:*${userId}*`;
    await this.cacheService.deletePattern(pattern: unknown);
  }

  private createError(
    code: MedicationServiceError['code'],
    message: string,
    details?: Record<string, any>
  ): MedicationServiceError {
    const error = new Error(message: unknown) as MedicationServiceError;
    error.code = code;
    error.details = details;
    return error;
  }

  private handleError(error: unknown: unknown): MedicationServiceError {
    if (error.code: unknown) return error as MedicationServiceError;
    
    return this.createError(
      'SYSTEM',
      'An unexpected error occurred',
      { originalError: error.message }
    );
  }
}
