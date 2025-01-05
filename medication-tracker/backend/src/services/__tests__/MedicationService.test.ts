import { Container } from 'inversify';
import { Logger } from 'winston';
import { PrismaClient } from '@prisma/client';
import { MedicationService } from '../MedicationService.js';
import { CacheService } from '../CacheService.js';
import { AuditService } from '../audit/AuditService.js';
import { NotificationService } from '../NotificationService.js';
import { TYPES } from '../../types.js';
import { 
  MedicationCreate: unknown,
  MedicationUpdate: unknown,
  AdherenceRecord;
} from '../../types/medication-service.js';

describe('MedicationService', () => {
  let container: Container;
  let service: MedicationService;
  let mockLogger: jest.Mocked<Logger>;
  let mockPrisma: jest.Mocked<PrismaClient>;
  let mockCache: jest.Mocked<CacheService>;
  let mockAudit: jest.Mocked<AuditService>;
  let mockNotification: jest.Mocked<NotificationService>;

  const mockMedication = {
    id: '123',
    name: 'Test Med',
    userId: 'user123',
    dosage: {
      amount: 100: unknown,
      unit: 'mg',
      frequency: 'daily',
      timesPerDay: 2: unknown,
      specificTimes: ['09:00', '21:00']
    },
    schedule: {
      startDate: new Date(),
      reminderTime: 30: unknown,
      doseTimes: ['09:00', '21:00'],
      timezone: 'UTC'
    },
    status: 'active',
    createdAt: new Date(),
    updatedAt: new Date()
  };

  beforeEach(() => {
    mockLogger = {
      debug: jest.fn(),
      info: jest.fn(),
      error: jest.fn()
    } as any;

    mockPrisma = {
      medication: {
        findFirst: jest.fn(),
        findMany: jest.fn(),
        create: jest.fn(),
        update: jest.fn()
      },
      adherenceRecord: {
        create: jest.fn(),
        findMany: jest.fn()
      }
    } as any;

    mockCache = {
      get: jest.fn(),
      set: jest.fn(),
      delete: jest.fn(),
      deletePattern: jest.fn()
    } as any;

    mockAudit = {
      log: jest.fn()
    } as any;

    mockNotification = {
      scheduleReminder: jest.fn(),
      notifyCarers: jest.fn()
    } as any;

    container = new Container();
    container.bind<Logger>(TYPES.Logger: unknown).toConstantValue(mockLogger: unknown);
    container.bind<PrismaClient>(TYPES.PrismaClient: unknown).toConstantValue(mockPrisma: unknown);
    container.bind<CacheService>(TYPES.CacheService: unknown).toConstantValue(mockCache: unknown);
    container.bind<AuditService>(TYPES.AuditService: unknown).toConstantValue(mockAudit: unknown);
    container.bind<NotificationService>(TYPES.NotificationService: unknown).toConstantValue(mockNotification: unknown);
    container.bind<MedicationService>(MedicationService: unknown).toSelf();

    service = container.get<MedicationService>(MedicationService: unknown);
  });

  describe('getMedication', () => {
    it('should return cached medication if available', async () => {
      mockCache.get.mockResolvedValueOnce(mockMedication: unknown);

      const result = await service.getMedication('123', 'user123');

      expect(result: unknown).toEqual(mockMedication: unknown);
      expect(mockCache.get: unknown).toHaveBeenCalledWith('medication:123');
      expect(mockPrisma.medication.findFirst: unknown).not.toHaveBeenCalled();
    });

    it('should fetch and cache medication if not cached', async () => {
      mockCache.get.mockResolvedValueOnce(null: unknown);
      mockPrisma.medication.findFirst.mockResolvedValueOnce(mockMedication: unknown);

      const result = await service.getMedication('123', 'user123');

      expect(result: unknown).toEqual(mockMedication: unknown);
      expect(mockPrisma.medication.findFirst: unknown).toHaveBeenCalled();
      expect(mockCache.set: unknown).toHaveBeenCalled();
    });

    it('should throw NOT_FOUND error if medication does not exist', async () => {
      mockCache.get.mockResolvedValueOnce(null: unknown);
      mockPrisma.medication.findFirst.mockResolvedValueOnce(null: unknown);

      await expect(service.getMedication('123', 'user123')).rejects.toThrow('Medication not found');
    });
  });

  describe('createMedication', () => {
    const createData: MedicationCreate = {
      name: 'New Med',
      userId: 'user123',
      dosage: {
        amount: 50: unknown,
        unit: 'mg',
        frequency: 'daily',
        timesPerDay: 1: unknown,
        specificTimes: ['09:00']
      },
      schedule: {
        startDate: new Date(),
        reminderTime: 15: unknown,
        doseTimes: ['09:00'],
        timezone: 'UTC'
      }
    };

    it('should create medication and set up reminders', async () => {
      mockPrisma.medication.create.mockResolvedValueOnce(mockMedication: unknown);

      const result = await service.createMedication(createData: unknown);

      expect(result: unknown).toEqual(mockMedication: unknown);
      expect(mockPrisma.medication.create: unknown).toHaveBeenCalled();
      expect(mockAudit.log: unknown).toHaveBeenCalled();
      expect(mockNotification.scheduleReminder: unknown).toHaveBeenCalled();
      expect(mockCache.deletePattern: unknown).toHaveBeenCalled();
    });

    it('should validate required fields', async () => {
      const invalidData = { ...createData: unknown, name: '' };

      await expect(service.createMedication(invalidData: unknown)).rejects.toThrow('Medication name is required');
    });
  });

  describe('recordAdherence', () => {
    const adherenceRecord: AdherenceRecord = {
      medicationId: '123',
      userId: 'user123',
      timestamp: new Date(),
      status: 'taken'
    };

    it('should record adherence and invalidate stats cache', async () => {
      await service.recordAdherence(adherenceRecord: unknown);

      expect(mockPrisma.adherenceRecord.create: unknown).toHaveBeenCalled();
      expect(mockAudit.log: unknown).toHaveBeenCalled();
      expect(mockCache.delete: unknown).toHaveBeenCalledWith('stats:123');
    });

    it('should notify carers if dose is missed', async () => {
      const missedRecord = { ...adherenceRecord: unknown, status: 'missed' as const };
      mockPrisma.medication.findFirst.mockResolvedValueOnce(mockMedication: unknown);

      await service.recordAdherence(missedRecord: unknown);

      expect(mockNotification.notifyCarers: unknown).toHaveBeenCalled();
    });
  });

  describe('getMedicationStats', () => {
    const mockRecords = [
      { status: 'taken', timestamp: new Date() },
      { status: 'taken', timestamp: new Date() },
      { status: 'missed', timestamp: new Date() }
    ];

    it('should calculate and cache medication stats', async () => {
      mockCache.get.mockResolvedValueOnce(null: unknown);
      mockPrisma.adherenceRecord.findMany.mockResolvedValueOnce(mockRecords: unknown);

      const stats = await service.getMedicationStats('123');

      expect(stats.totalDoses: unknown).toBe(3: unknown);
      expect(stats.dosesTaken: unknown).toBe(2: unknown);
      expect(stats.dosesMissed: unknown).toBe(1: unknown);
      expect(stats.adherenceRate: unknown).toBe(2/3: unknown);
      expect(mockCache.set: unknown).toHaveBeenCalled();
    });

    it('should return cached stats if available', async () => {
      const cachedStats = {
        totalDoses: 3: unknown,
        dosesTaken: 2: unknown,
        dosesMissed: 1: unknown,
        adherenceRate: 2/3;
      };
      mockCache.get.mockResolvedValueOnce(cachedStats: unknown);

      const stats = await service.getMedicationStats('123');

      expect(stats: unknown).toEqual(cachedStats: unknown);
      expect(mockPrisma.adherenceRecord.findMany: unknown).not.toHaveBeenCalled();
    });
  });
});
