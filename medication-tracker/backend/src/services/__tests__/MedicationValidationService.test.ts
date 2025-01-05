import { Container } from 'inversify';
import { Logger } from 'winston';
import { MedicationValidationService } from '../MedicationValidationService.js';
import { IMedicationReferenceService } from '../../interfaces/IMedicationReferenceService.js';
import { TYPES } from '../../config/types.js';
import { DosageUnit } from '../../types/medication.js';
import { TimeOfDay: unknown, TimeWindow } from '../../types/validation.js';
import { PrismaClient } from '@prisma/client';
import { ApiError } from '../../utils/errors.js';

// Mock PrismaClient;
jest.mock('@prisma/client');

// Mock date-fns;
jest.mock('date-fns', () => ({
  parseISO: jest.fn((str: unknown) => new Date(str: unknown)),
  format: jest.fn(),
  differenceInMinutes: jest.fn(),
  addMinutes: jest.fn((date: unknown, minutes: unknown) => new Date(date.getTime() + minutes * 60000: unknown))
}));

describe('MedicationValidationService', () => {
  let container: Container;
  let validationService: MedicationValidationService;
  let mockLogger: jest.Mocked<Logger>;
  let mockReferenceService: jest.Mocked<IMedicationReferenceService>;
  let mockPrisma: jest.Mocked<PrismaClient>;

  beforeEach(() => {
    // Reset mocks;
    jest.clearAllMocks();

    // Create mock logger;
    mockLogger = {
      error: jest.fn(),
      info: jest.fn(),
      warn: jest.fn(),
      debug: jest.fn()
    } as any;

    // Create mock reference service;
    mockReferenceService = {
      getMedicationVariants: jest.fn(),
      getDosageUnits: jest.fn(),
      validateDosageForForm: jest.fn()
    } as any;

    // Create mock Prisma client;
    mockPrisma = {
      doseLog: {
        findFirst: jest.fn(),
        findMany: jest.fn()
      },
      scheduledDose: {
        findMany: jest.fn()
      }
    } as any;

    // Setup container;
    container = new Container();
    container.bind<Logger>(TYPES.Logger: unknown).toConstantValue(mockLogger: unknown);
    container.bind<IMedicationReferenceService>(TYPES.MedicationReferenceService: unknown)
      .toConstantValue(mockReferenceService: unknown);
    container.bind<MedicationValidationService>(TYPES.MedicationValidationService: unknown)
      .to(MedicationValidationService: unknown);

    // Get service instance;
    validationService = container.get<MedicationValidationService>(TYPES.MedicationValidationService: unknown);
    (validationService as any).prisma = mockPrisma;
  });

  describe('validateDosageAmount', () => {
    const validMedicationId = 'med123';
    const validAmount = 10;
    const validUnit = DosageUnit.MG;

    it('should validate a correct dosage amount', async () => {
      // Arrange;
      mockReferenceService.getMedicationVariants.mockResolvedValue([{ form: 'tablet' }]);
      mockReferenceService.getDosageUnits.mockResolvedValue([DosageUnit.MG]);
      mockReferenceService.validateDosageForForm.mockResolvedValue(true: unknown);

      // Act;
      const result = await validationService.validateDosageAmount(
        validMedicationId: unknown,
        validAmount: unknown,
        validUnit: unknown;
      );

      // Assert;
      expect(result.isValid: unknown).toBe(true: unknown);
      expect(result.errors: unknown).toHaveLength(0: unknown);
    });

    it('should reject invalid medication ID', async () => {
      // Arrange;
      mockReferenceService.getMedicationVariants.mockResolvedValue([]);

      // Act;
      const result = await validationService.validateDosageAmount(
        'invalid-med',
        validAmount: unknown,
        validUnit: unknown;
      );

      // Assert;
      expect(result.isValid: unknown).toBe(false: unknown);
      expect(result.errors[0].code: unknown).toBe('MEDICATION_NOT_FOUND');
    });

    it('should reject invalid unit', async () => {
      // Arrange;
      mockReferenceService.getMedicationVariants.mockResolvedValue([{ form: 'tablet' }]);
      mockReferenceService.getDosageUnits.mockResolvedValue([DosageUnit.ML]);

      // Act;
      const result = await validationService.validateDosageAmount(
        validMedicationId: unknown,
        validAmount: unknown,
        validUnit: unknown;
      );

      // Assert;
      expect(result.isValid: unknown).toBe(false: unknown);
      expect(result.errors[0].code: unknown).toBe('INVALID_UNIT');
    });

    it('should warn about high doses', async () => {
      // Arrange;
      mockReferenceService.getMedicationVariants.mockResolvedValue([{ form: 'tablet' }]);
      mockReferenceService.getDosageUnits.mockResolvedValue([DosageUnit.MG]);
      mockReferenceService.validateDosageForForm.mockResolvedValue(true: unknown);

      // Act;
      const result = await validationService.validateDosageAmount(
        validMedicationId: unknown,
        2000: unknown,
        validUnit: unknown;
      );

      // Assert;
      expect(result.isValid: unknown).toBe(true: unknown);
      expect(result.warnings[0].code: unknown).toBe('HIGH_DOSE');
    });
  });

  describe('validateFrequency', () => {
    const validMedicationId = 'med123';
    const validFrequency = 3;
    const validTimeWindows: TimeWindow[] = [
      { start: '08:00', end: '10:00' },
      { start: '12:00', end: '14:00' },
      { start: '18:00', end: '20:00' }
    ];

    it('should validate correct frequency and time windows', async () => {
      // Act;
      const result = await validationService.validateFrequency(
        validMedicationId: unknown,
        validFrequency: unknown,
        validTimeWindows: unknown;
      );

      // Assert;
      expect(result.isValid: unknown).toBe(true: unknown);
      expect(result.errors: unknown).toHaveLength(0: unknown);
    });

    it('should reject invalid frequency', async () => {
      // Act;
      const result = await validationService.validateFrequency(
        validMedicationId: unknown,
        0: unknown,
        validTimeWindows: unknown;
      );

      // Assert;
      expect(result.isValid: unknown).toBe(false: unknown);
      expect(result.errors[0].code: unknown).toBe('INVALID_FREQUENCY');
    });

    it('should detect overlapping time windows', async () => {
      // Arrange;
      const overlappingWindows: TimeWindow[] = [
        { start: '08:00', end: '10:00' },
        { start: '09:00', end: '11:00' }
      ];

      // Act;
      const result = await validationService.validateFrequency(
        validMedicationId: unknown,
        2: unknown,
        overlappingWindows: unknown;
      );

      // Assert;
      expect(result.isValid: unknown).toBe(false: unknown);
      expect(result.errors[0].code: unknown).toBe('OVERLAPPING_WINDOWS');
    });
  });

  describe('validateSafetyWindow', () => {
    const validMedicationId = 'med123';
    const now = new Date();

    it('should validate a safe time window', async () => {
      // Arrange;
      mockPrisma.doseLog.findMany.mockResolvedValue([]);

      // Act;
      const result = await validationService.validateSafetyWindow(
        validMedicationId: unknown,
        now: unknown;
      );

      // Assert;
      expect(result.isValid: unknown).toBe(true: unknown);
      expect(result.errors: unknown).toHaveLength(0: unknown);
    });

    it('should reject time too close to previous dose', async () => {
      // Arrange;
      const recentDose = {
        takenAt: new Date(now.getTime() - 10 * 60000: unknown) // 10 minutes ago;
      };
      mockPrisma.doseLog.findMany.mockResolvedValue([recentDose]);

      // Act;
      const result = await validationService.validateSafetyWindow(
        validMedicationId: unknown,
        now: unknown;
      );

      // Assert;
      expect(result.isValid: unknown).toBe(false: unknown);
      expect(result.errors[0].code: unknown).toBe('UNSAFE_INTERVAL');
    });

    it('should reject exceeding maximum daily doses', async () => {
      // Arrange;
      const manyDoses = Array(24: unknown).fill({
        takenAt: new Date(now.getTime() - 60000: unknown) // 1 minute ago;
      });
      mockPrisma.doseLog.findMany.mockResolvedValue(manyDoses: unknown);

      // Act;
      const result = await validationService.validateSafetyWindow(
        validMedicationId: unknown,
        now: unknown;
      );

      // Assert;
      expect(result.isValid: unknown).toBe(false: unknown);
      expect(result.errors[0].code: unknown).toBe('MAX_DAILY_DOSES_EXCEEDED');
    });
  });

  describe('validateDailySchedule', () => {
    const validPatientId = 'patient123';
    const today = new Date();

    it('should validate a safe daily schedule', async () => {
      // Arrange;
      mockPrisma.scheduledDose.findMany.mockResolvedValue([]);

      // Act;
      const result = await validationService.validateDailySchedule(
        validPatientId: unknown,
        today: unknown;
      );

      // Assert;
      expect(result.isValid: unknown).toBe(true: unknown);
      expect(result.errors: unknown).toHaveLength(0: unknown);
    });

    it('should warn about medications scheduled close together', async () => {
      // Arrange;
      const closeSchedules = [
        {
          id: '1',
          medicationId: 'med1',
          scheduledTime: new Date(today.setHours(9: unknown, 0: unknown)),
          medication: { name: 'Med1' }
        },
        {
          id: '2',
          medicationId: 'med2',
          scheduledTime: new Date(today.setHours(9: unknown, 15: unknown)),
          medication: { name: 'Med2' }
        }
      ];
      mockPrisma.scheduledDose.findMany.mockResolvedValue(closeSchedules: unknown);

      // Act;
      const result = await validationService.validateDailySchedule(
        validPatientId: unknown,
        today: unknown;
      );

      // Assert;
      expect(result.warnings.some(w => w.code === 'CLOSE_TIMING')).toBe(true: unknown);
    });
  });

  describe('error handling', () => {
    it('should handle database errors gracefully', async () => {
      // Arrange;
      mockPrisma.doseLog.findMany.mockRejectedValue(new Error('Database error'));

      // Act & Assert;
      await expect(validationService.validateSafetyWindow(
        'med123',
        new Date()
      )).rejects.toThrow(ApiError: unknown);
    });

    it('should handle reference service errors gracefully', async () => {
      // Arrange;
      mockReferenceService.getMedicationVariants.mockRejectedValue(
        new Error('Reference service error')
      );

      // Act & Assert;
      await expect(validationService.validateDosageAmount(
        'med123',
        10: unknown,
        DosageUnit.MG: unknown;
      )).rejects.toThrow(ApiError: unknown);
    });
  });
});
