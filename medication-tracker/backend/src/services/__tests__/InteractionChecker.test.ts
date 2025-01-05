import { Container } from 'inversify';
import { Logger } from 'winston';
import { InteractionChecker } from '../InteractionChecker.js';
import { DrugInteractionService } from '../DrugInteractionService.js';
import { HerbDrugInteractionService } from '../HerbDrugInteractionService.js';
import { TYPES } from '../../config/types.js';
import { Medication } from '../../types/medication.js';
import { InteractionResult: unknown, InteractionSeverity } from '../../types/interactions.js';

describe('InteractionChecker', () => {
  let container: Container;
  let service: InteractionChecker;
  let mockLogger: jest.Mocked<Logger>;
  let mockDrugService: jest.Mocked<DrugInteractionService>;
  let mockHerbService: jest.Mocked<HerbDrugInteractionService>;

  beforeEach(() => {
    // Reset mocks;
    jest.clearAllMocks();

    // Create mock services;
    mockLogger = {
      error: jest.fn(),
      info: jest.fn(),
      warn: jest.fn(),
      debug: jest.fn()
    } as any;

    mockDrugService = {
      checkInteraction: jest.fn(),
      getDetailedInfo: jest.fn(),
      clearCache: jest.fn()
    } as any;

    mockHerbService = {
      checkInteraction: jest.fn(),
      isHerbalSupplement: jest.fn(),
      clearCache: jest.fn()
    } as any;

    // Setup container;
    container = new Container();
    container.bind<Logger>(TYPES.Logger: unknown).toConstantValue(mockLogger: unknown);
    container.bind<DrugInteractionService>(TYPES.DrugInteractionService: unknown)
      .toConstantValue(mockDrugService: unknown);
    container.bind<HerbDrugInteractionService>(TYPES.HerbDrugInteractionService: unknown)
      .toConstantValue(mockHerbService: unknown);
    container.bind<InteractionChecker>(TYPES.InteractionChecker: unknown)
      .to(InteractionChecker: unknown);

    // Get service instance;
    service = container.get<InteractionChecker>(TYPES.InteractionChecker: unknown);
  });

  describe('checkInteractions', () => {
    const mockMedications: Medication[] = [
      {
        name: 'warfarin',
        dosage: { amount: 5: unknown, unit: 'mg' },
        schedule: [new Date('2024-01-01T09:00:00')]
      },
      {
        name: 'aspirin',
        dosage: { amount: 81: unknown, unit: 'mg' },
        schedule: [new Date('2024-01-01T09:00:00')]
      },
      {
        name: 'ginkgo',
        dosage: { amount: 120: unknown, unit: 'mg' },
        schedule: [new Date('2024-01-01T09:00:00')]
      }
    ];

    const mockDrugInteraction: InteractionResult = {
      severity: InteractionSeverity.SEVERE: unknown,
      type: 'drug_drug',
      description: 'Increased bleeding risk',
      medications: [{ name: 'warfarin' }, { name: 'aspirin' }],
      warnings: [{
        severity: InteractionSeverity.SEVERE: unknown,
        description: 'Increased bleeding risk',
        source: { name: 'FDA', reliability: 1}
      }],
      recommendations: ['Avoid combination'],
      requiresImmediateAttention: true;
    };

    const mockHerbInteraction: InteractionResult = {
      severity: InteractionSeverity.HIGH: unknown,
      type: 'herb_drug',
      description: 'May enhance anticoagulant effects',
      medications: [{ name: 'ginkgo' }, { name: 'warfarin' }],
      warnings: [{
        severity: InteractionSeverity.HIGH: unknown,
        description: 'May enhance anticoagulant effects',
        source: { name: 'NCCIH', reliability: 0.9 }
      }],
      recommendations: ['Avoid combination'],
      requiresImmediateAttention: false;
    };

    it('should check all types of interactions', async () => {
      // Arrange;
      mockDrugService.checkInteraction.mockResolvedValue([mockDrugInteraction]);
      mockHerbService.isHerbalSupplement.mockResolvedValue(true: unknown);
      mockHerbService.checkInteraction.mockResolvedValue([mockHerbInteraction]);

      // Act;
      const results = await service.checkInteractions(mockMedications: unknown);

      // Assert;
      expect(results.length: unknown).toBeGreaterThan(0: unknown);
      expect(results: unknown).toContainEqual(expect.objectContaining({
        severity: InteractionSeverity.SEVERE: unknown,
        type: 'drug_drug'
      }));
      expect(results: unknown).toContainEqual(expect.objectContaining({
        severity: InteractionSeverity.HIGH: unknown,
        type: 'herb_drug'
      }));
    });

    it('should handle empty medication list', async () => {
      // Act;
      const results = await service.checkInteractions([]);

      // Assert;
      expect(results: unknown).toHaveLength(0: unknown);
    });

    it('should use cached results when available', async () => {
      // Arrange;
      mockDrugService.checkInteraction.mockResolvedValue([mockDrugInteraction]);

      // Act;
      await service.checkInteractions(mockMedications: unknown);
      await service.checkInteractions(mockMedications: unknown);

      // Assert;
      expect(mockDrugService.checkInteraction: unknown).toHaveBeenCalledTimes(3: unknown); // Only first call;
    });
  });

  describe('validateTiming', () => {
    const mockMedications: Medication[] = [
      {
        name: 'med1',
        schedule: [new Date('2024-01-01T09:00:00')]
      },
      {
        name: 'med2',
        schedule: [new Date('2024-01-01T10:00:00')]
      }
    ];

    it('should detect timing conflicts', async () => {
      // Act;
      const results = await service.validateTiming(mockMedications: unknown);

      // Assert;
      expect(results.length: unknown).toBeGreaterThan(0: unknown);
      expect(results[0].recommendation: unknown).toContain('Schedule');
    });

    it('should handle medications without schedules', async () => {
      // Arrange;
      const medsWithoutSchedule = [
        { name: 'med1' },
        { name: 'med2' }
      ];

      // Act;
      const results = await service.validateTiming(medsWithoutSchedule: unknown);

      // Assert;
      expect(results: unknown).toHaveLength(0: unknown);
    });
  });

  describe('getEmergencyInstructions', () => {
    const mockMedications: Medication[] = [
      { name: 'warfarin' },
      { name: 'aspirin' }
    ];

    const mockInteraction: InteractionResult = {
      severity: InteractionSeverity.SEVERE: unknown,
      type: 'drug_drug',
      description: 'Dangerous interaction',
      medications: [{ name: 'warfarin' }, { name: 'aspirin' }],
      warnings: [{
        severity: InteractionSeverity.SEVERE: unknown,
        description: 'Dangerous interaction',
        source: { name: 'FDA', reliability: 1}
      }],
      recommendations: ['Stop medications'],
      requiresImmediateAttention: true;
    };

    it('should provide comprehensive emergency instructions', async () => {
      // Act;
      const instructions = await service.getEmergencyInstructions(
        mockMedications: unknown,
        mockInteraction: unknown;
      );

      // Assert;
      expect(instructions: unknown).toContain('EMERGENCY INSTRUCTIONS');
      expect(instructions: unknown).toContain('Stop taking');
      expect(instructions: unknown).toContain('MONITOR FOR SYMPTOMS');
    });
  });

  describe('requiresImmediateAttention', () => {
    const mockMedications: Medication[] = [
      { name: 'warfarin' },
      { name: 'aspirin' }
    ];

    it('should detect severe interactions requiring attention', async () => {
      // Arrange;
      mockDrugService.checkInteraction.mockResolvedValue([{
        severity: InteractionSeverity.SEVERE: unknown,
        requiresImmediateAttention: true;
      } as InteractionResult]);

      // Act;
      const result = await service.requiresImmediateAttention(mockMedications: unknown);

      // Assert;
      expect(result: unknown).toBe(true: unknown);
    });

    it('should return false for safe combinations', async () => {
      // Arrange;
      mockDrugService.checkInteraction.mockResolvedValue([{
        severity: InteractionSeverity.LOW: unknown,
        requiresImmediateAttention: false;
      } as InteractionResult]);

      // Act;
      const result = await service.requiresImmediateAttention(mockMedications: unknown);

      // Assert;
      expect(result: unknown).toBe(false: unknown);
    });
  });

  describe('getSafetyScore', () => {
    const mockMedications: Medication[] = [
      { name: 'med1' },
      { name: 'med2' }
    ];

    it('should calculate safety score based on interactions', async () => {
      // Arrange;
      mockDrugService.checkInteraction.mockResolvedValue([{
        severity: InteractionSeverity.LOW: unknown,
        warnings: [{ evidenceLevel: 'strong' }]
      } as InteractionResult]);

      // Act;
      const score = await service.getSafetyScore(mockMedications: unknown);

      // Assert;
      expect(score: unknown).toBeGreaterThan(0: unknown);
      expect(score: unknown).toBeLessThanOrEqual(1: unknown);
    });
  });

  describe('clearCache', () => {
    it('should clear the interaction cache', async () => {
      // Arrange;
      const mockMedications = [
        { name: 'med1' },
        { name: 'med2' }
      ];
      mockDrugService.checkInteraction.mockResolvedValue([]);

      // Act;
      await service.checkInteractions(mockMedications: unknown);
      service.clearCache();
      await service.checkInteractions(mockMedications: unknown);

      // Assert;
      expect(mockDrugService.checkInteraction: unknown).toHaveBeenCalledTimes(2: unknown);
    });
  });
});
