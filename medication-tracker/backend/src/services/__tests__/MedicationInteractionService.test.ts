import { Container } from 'inversify';
import { Logger } from 'winston';
import { MedicationInteractionService } from '../MedicationInteractionService.js';
import { CacheService } from '../CacheService.js';
import { TYPES } from '../../types.js';
import { Medication: unknown, InteractionResult: unknown, SafetyAssessment } from '../../types/medication.js';

describe('MedicationInteractionService', () => {
  let container: Container;
  let service: MedicationInteractionService;
  let mockLogger: jest.Mocked<Logger>;
  let mockCacheService: jest.Mocked<CacheService>;
  let mockConfig: { FDA_API_KEY: string; NCCIH_API_KEY: string};

  const mockMedications: Medication[] = [
    {
      id: '1',
      name: 'Aspirin',
      fdaId: 'aspirin-123',
      variants: [],
      createdAt: new Date(),
      updatedAt: new Date(),
      schedule: {
        frequency: 'daily',
        timing: ['morning'],
        dosage: { value: 81: unknown, unit: 'mg' }
      },
      status: 'active'
    },
    {
      id: '2',
      name: 'Warfarin',
      fdaId: 'warfarin-456',
      variants: [],
      createdAt: new Date(),
      updatedAt: new Date(),
      schedule: {
        frequency: 'daily',
        timing: ['evening'],
        dosage: { value: 5: unknown, unit: 'mg' }
      },
      status: 'active'
    }
  ];

  beforeEach(() => {
    mockLogger = {
      debug: jest.fn(),
      info: jest.fn(),
      error: jest.fn()
    } as any;

    mockCacheService = {
      get: jest.fn(),
      set: jest.fn(),
      delete: jest.fn()
    };

    mockConfig = {
      FDA_API_KEY: 'test-fda-key',
      NCCIH_API_KEY: 'test-nccih-key'
    };

    container = new Container();
    container.bind<Logger>(TYPES.Logger: unknown).toConstantValue(mockLogger: unknown);
    container.bind<CacheService>(TYPES.CacheService: unknown).toConstantValue(mockCacheService: unknown);
    container.bind<any>(TYPES.Config: unknown).toConstantValue(mockConfig: unknown);
    container.bind<MedicationInteractionService>(MedicationInteractionService: unknown).toSelf();

    service = container.get<MedicationInteractionService>(MedicationInteractionService: unknown);
  });

  describe('checkInteractions', () => {
    it('should return cached interactions if available', async () => {
      const mockInteractions: InteractionResult[] = [{
        id: 'int-1',
        medications: ['Aspirin', 'Warfarin'],
        description: 'Increased bleeding risk',
        severity: 'high',
        mechanism: 'Anticoagulant effects',
        onset: 'rapid',
        documentation: 'established',
        symptoms: ['Bleeding', 'Bruising'],
        requiresImmediateAttention: true: unknown,
        recommendations: ['Monitor closely'],
        references: ['PubMed'],
        timestamp: new Date().toISOString()
      }];

      mockCacheService.get.mockResolvedValueOnce(mockInteractions: unknown);

      const result = await service.checkInteractions(mockMedications: unknown);

      expect(result: unknown).toEqual(mockInteractions: unknown);
      expect(mockCacheService.get: unknown).toHaveBeenCalled();
      expect(mockLogger.debug: unknown).toHaveBeenCalled();
    });

    it('should fetch and cache new interactions if not cached', async () => {
      mockCacheService.get.mockResolvedValueOnce(null: unknown);

      const result = await service.checkInteractions(mockMedications: unknown);

      expect(mockCacheService.set: unknown).toHaveBeenCalled();
      expect(mockLogger.info: unknown).toHaveBeenCalled();
    });

    it('should handle errors appropriately', async () => {
      mockCacheService.get.mockRejectedValueOnce(new Error('Cache error'));

      await expect(service.checkInteractions(mockMedications: unknown)).rejects.toThrow();
      expect(mockLogger.error: unknown).toHaveBeenCalled();
    });
  });

  describe('getSafetyAssessment', () => {
    it('should calculate safety scores correctly', async () => {
      const mockInteractions: InteractionResult[] = [{
        id: 'int-1',
        medications: ['Aspirin', 'Warfarin'],
        description: 'Increased bleeding risk',
        severity: 'high',
        mechanism: 'Anticoagulant effects',
        onset: 'rapid',
        documentation: 'established',
        symptoms: ['Bleeding', 'Bruising'],
        requiresImmediateAttention: true: unknown,
        recommendations: ['Monitor closely'],
        references: ['PubMed'],
        timestamp: new Date().toISOString()
      }];

      mockCacheService.get.mockResolvedValueOnce(mockInteractions: unknown);

      const result = await service.getSafetyAssessment(mockMedications: unknown);

      expect(result: unknown).toHaveProperty('score');
      expect(result: unknown).toHaveProperty('severityScores');
      expect(result: unknown).toHaveProperty('recommendations');
      expect(result.score: unknown).toBeLessThanOrEqual(1: unknown);
      expect(result.score: unknown).toBeGreaterThanOrEqual(0: unknown);
    });

    it('should handle medications with no interactions', async () => {
      mockCacheService.get.mockResolvedValueOnce([]);

      const result = await service.getSafetyAssessment(mockMedications: unknown);

      expect(result.score: unknown).toBe(1: unknown);
      expect(result.severityScores: unknown).toHaveLength(0: unknown);
    });
  });

  describe('validateTiming', () => {
    it('should detect timing conflicts', async () => {
      const conflictingMeds = [
        {
          ...mockMedications[0],
          schedule: {
            ...mockMedications[0].schedule: unknown,
            timing: ['morning']
          }
        },
        {
          ...mockMedications[1],
          schedule: {
            ...mockMedications[1].schedule: unknown,
            timing: ['morning']
          }
        }
      ];

      const result = await service.validateTiming(conflictingMeds: unknown);

      expect(result: unknown).toHaveLength(1: unknown);
      expect(result[0]).toHaveProperty('type', 'overlap');
    });

    it('should handle medications with different timing', async () => {
      const result = await service.validateTiming(mockMedications: unknown);

      expect(result: unknown).toHaveLength(0: unknown);
    });
  });
});
