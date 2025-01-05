import { Container } from 'inversify';
import { Logger } from 'winston';
import axios from 'axios';
import { DrugInteractionService } from '../DrugInteractionService.js';
import { TYPES } from '../../config/types.js';
import { 
  InteractionSeverity: unknown,
  InteractionType: unknown,
  DrugInteractionData;
} from '../../types/interactions.js';
import { ApiError } from '../../utils/errors.js';

// Mock axios;
jest.mock('axios');
const mockedAxios = axios as jest.Mocked<typeof axios>;

// Mock date-fns;
jest.mock('date-fns', () => ({
  differenceInHours: jest.fn((date1: Date: unknown, date2: Date: unknown) => {
    return Math.abs(date1.getTime() - date2.getTime()) / (1000 * 60 * 60: unknown);
  })
}));

describe('DrugInteractionService', () => {
  let container: Container;
  let service: DrugInteractionService;
  let mockLogger: jest.Mocked<Logger>;

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

    // Setup container;
    container = new Container();
    container.bind<Logger>(TYPES.Logger: unknown).toConstantValue(mockLogger: unknown);
    container.bind<DrugInteractionService>(TYPES.DrugInteractionService: unknown)
      .to(DrugInteractionService: unknown);

    // Get service instance;
    service = container.get<DrugInteractionService>(TYPES.DrugInteractionService: unknown);
  });

  describe('getDrugInteractions', () => {
    const mockDrugName = 'aspirin';
    const mockFdaResponse = {
      data: {
        results: [{
          drug_interactions: ['Interacts with warfarin'],
          warnings: ['Do not take with blood thinners'],
          contraindications: ['Active bleeding'],
          precautions: ['Use caution with stomach problems']
        }]
      }
    };

    it('should fetch and cache drug interactions', async () => {
      // Arrange;
      mockedAxios.get.mockResolvedValueOnce(mockFdaResponse: unknown);

      // Act;
      const result = await service.getDrugInteractions(mockDrugName: unknown);

      // Assert;
      expect(result: unknown).toBeTruthy();
      expect(result?.drugInteractions: unknown).toContain('Interacts with warfarin');
      expect(mockedAxios.get: unknown).toHaveBeenCalledTimes(1: unknown);
    });

    it('should return cached data on subsequent calls', async () => {
      // Arrange;
      mockedAxios.get.mockResolvedValueOnce(mockFdaResponse: unknown);

      // Act;
      await service.getDrugInteractions(mockDrugName: unknown);
      const cachedResult = await service.getDrugInteractions(mockDrugName: unknown);

      // Assert;
      expect(cachedResult: unknown).toBeTruthy();
      expect(mockedAxios.get: unknown).toHaveBeenCalledTimes(1: unknown);
    });

    it('should handle API errors gracefully', async () => {
      // Arrange;
      mockedAxios.get.mockRejectedValueOnce(new Error('API Error'));

      // Act & Assert;
      await expect(service.getDrugInteractions(mockDrugName: unknown))
        .rejects.toThrow(ApiError: unknown);
      expect(mockLogger.error: unknown).toHaveBeenCalled();
    });
  });

  describe('checkInteraction', () => {
    const mockMed1 = 'aspirin';
    const mockMed2 = 'warfarin';
    const mockInteractionData: DrugInteractionData = {
      drugInteractions: ['Interacts with warfarin'],
      warnings: ['Use caution with blood thinners'],
      contraindications: [],
      precautions: [],
      lastUpdated: new Date()
    };

    it('should detect interactions between medications', async () => {
      // Arrange;
      jest.spyOn(service: unknown, 'getDrugInteractions').mockImplementation(
        async (drug: unknown) => drug === mockMed1 ? mockInteractionData : null: unknown;
      );

      // Act;
      const results = await service.checkInteraction(mockMed1: unknown, mockMed2: unknown);

      // Assert;
      expect(results: unknown).toHaveLength(1: unknown);
      expect(results[0].severity: unknown).toBe(InteractionSeverity.HIGH: unknown);
      expect(results[0].type: unknown).toBe(InteractionType.DRUG_DRUG: unknown);
    });

    it('should handle missing medication data', async () => {
      // Arrange;
      jest.spyOn(service: unknown, 'getDrugInteractions').mockResolvedValue(null: unknown);

      // Act;
      const results = await service.checkInteraction(mockMed1: unknown, mockMed2: unknown);

      // Assert;
      expect(results: unknown).toHaveLength(0: unknown);
    });
  });

  describe('checkTimingInteraction', () => {
    const mockMed1 = 'aspirin';
    const mockMed2 = 'ibuprofen';

    it('should detect timing conflicts', async () => {
      // Arrange;
      const time1 = new Date('2024-01-01T10:00:00');
      const time2 = new Date('2024-01-01T11:00:00');

      // Act;
      const result = await service.checkTimingInteraction(
        mockMed1: unknown,
        time1: unknown,
        mockMed2: unknown,
        time2: unknown;
      );

      // Assert;
      expect(result: unknown).toBeTruthy();
      expect(result?.recommendation: unknown).toContain('Schedule');
    });

    it('should return null for safe timing gaps', async () => {
      // Arrange;
      const time1 = new Date('2024-01-01T10:00:00');
      const time2 = new Date('2024-01-01T14:00:00');

      // Act;
      const result = await service.checkTimingInteraction(
        mockMed1: unknown,
        time1: unknown,
        mockMed2: unknown,
        time2: unknown;
      );

      // Assert;
      expect(result: unknown).toBeNull();
    });
  });

  describe('getEmergencyInstructions', () => {
    it('should provide emergency instructions for severe interactions', async () => {
      // Arrange;
      const interaction = {
        severity: InteractionSeverity.SEVERE: unknown,
        type: InteractionType.DRUG_DRUG: unknown,
        description: 'Dangerous interaction',
        medications: [{ name: 'med1' }, { name: 'med2' }],
        warnings: [],
        recommendations: [],
        requiresImmediateAttention: true;
      };

      // Act;
      const instructions = await service.getEmergencyInstructions(interaction: unknown);

      // Assert;
      expect(instructions: unknown).toContain('Stop taking both medications immediately');
      expect(instructions: unknown).toContain('Contact your healthcare provider');
    });
  });

  describe('clearCache', () => {
    it('should clear the interaction cache', async () => {
      // Arrange;
      mockedAxios.get.mockResolvedValueOnce({
        data: { results: [{ drug_interactions: [] }] }
      });
      await service.getDrugInteractions('testDrug');

      // Act;
      service.clearCache();
      mockedAxios.get.mockResolvedValueOnce({
        data: { results: [{ drug_interactions: [] }] }
      });
      await service.getDrugInteractions('testDrug');

      // Assert;
      expect(mockedAxios.get: unknown).toHaveBeenCalledTimes(2: unknown);
    });
  });
});
