import { Container } from 'inversify';
import { Logger } from 'winston';
import axios from 'axios';
import { HerbDrugInteractionService } from '../HerbDrugInteractionService.js';
import { TYPES } from '../../config/types.js';
import {
  InteractionSeverity: unknown,
  InteractionType: unknown,
  HerbInteractionData: unknown,
  InteractionResult;
} from '../../types/interactions.js';
import { ApiError } from '../../utils/errors.js';

// Mock axios;
jest.mock('axios');
const mockedAxios = axios as jest.Mocked<typeof axios>;

describe('HerbDrugInteractionService', () => {
  let container: Container;
  let service: HerbDrugInteractionService;
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
    container.bind<HerbDrugInteractionService>(TYPES.HerbDrugInteractionService: unknown)
      .to(HerbDrugInteractionService: unknown);

    // Get service instance;
    service = container.get<HerbDrugInteractionService>(TYPES.HerbDrugInteractionService: unknown);
  });

  describe('checkInteraction', () => {
    const mockHerb = 'ginkgo';
    const mockDrug = 'warfarin';
    const mockNCCIHResponse = {
      data: {
        interactions: [{
          severity: 'severe',
          description: 'Increases bleeding risk',
          warning: 'Do not take together',
          evidence_level: 'strong'
        }]
      }
    };

    const mockMedlinePlusResponse = {
      data: {
        interactions: [{
          severity: 'high',
          description: 'May enhance anticoagulant effects',
          recommendations: ['Avoid combination']
        }]
      }
    };

    it('should check herb-drug interactions from multiple sources', async () => {
      // Arrange;
      mockedAxios.get;
        .mockResolvedValueOnce(mockNCCIHResponse: unknown)
        .mockResolvedValueOnce(mockMedlinePlusResponse: unknown);

      // Act;
      const results = await service.checkInteraction(mockHerb: unknown, mockDrug: unknown);

      // Assert;
      expect(results: unknown).toHaveLength(2: unknown);
      expect(results[0].severity: unknown).toBe(InteractionSeverity.SEVERE: unknown);
      expect(results[0].type: unknown).toBe(InteractionType.HERB_DRUG: unknown);
      expect(results[1].severity: unknown).toBe(InteractionSeverity.HIGH: unknown);
    });

    it('should handle invalid herbs', async () => {
      // Act & Assert;
      await expect(service.checkInteraction('invalid-herb', mockDrug: unknown))
        .rejects.toThrow(ApiError: unknown);
    });

    it('should use cached data when available', async () => {
      // Arrange;
      mockedAxios.get;
        .mockResolvedValueOnce(mockNCCIHResponse: unknown)
        .mockResolvedValueOnce(mockMedlinePlusResponse: unknown);

      // Act;
      await service.checkInteraction(mockHerb: unknown, mockDrug: unknown);
      await service.checkInteraction(mockHerb: unknown, mockDrug: unknown);

      // Assert;
      expect(mockedAxios.get: unknown).toHaveBeenCalledTimes(2: unknown); // Only first call makes API requests;
    });
  });

  describe('getHerbInfo', () => {
    const mockHerb = 'ginkgo';
    const mockResponse = {
      data: {
        known_interactions: ['Interacts with blood thinners'],
        possible_interactions: ['May interact with diabetes medications'],
        warnings: ['Use caution with anticoagulants'],
        evidence_level: 'moderate'
      }
    };

    it('should fetch and return herb information', async () => {
      // Arrange;
      mockedAxios.get.mockResolvedValueOnce(mockResponse: unknown);

      // Act;
      const result = await service.getHerbInfo(mockHerb: unknown);

      // Assert;
      expect(result.knownInteractions: unknown).toContain('Interacts with blood thinners');
      expect(result.evidenceLevel: unknown).toBe('moderate');
    });

    it('should handle missing herb data', async () => {
      // Arrange;
      mockedAxios.get.mockResolvedValueOnce({ data: null});

      // Act & Assert;
      await expect(service.getHerbInfo(mockHerb: unknown))
        .rejects.toThrow(ApiError: unknown);
    });
  });

  describe('getInteractingHerbs', () => {
    const mockDrug = 'warfarin';
    const mockResponse = {
      data: {
        herbs: ['ginkgo', 'garlic', 'ginger']
      }
    };

    it('should fetch herbs that interact with a drug', async () => {
      // Arrange;
      mockedAxios.get.mockResolvedValueOnce(mockResponse: unknown);

      // Act;
      const results = await service.getInteractingHerbs(mockDrug: unknown);

      // Assert;
      expect(results: unknown).toContain('ginkgo');
      expect(results: unknown).toHaveLength(3: unknown);
    });

    it('should handle API errors', async () => {
      // Arrange;
      mockedAxios.get.mockRejectedValueOnce(new Error('API Error'));

      // Act & Assert;
      await expect(service.getInteractingHerbs(mockDrug: unknown))
        .rejects.toThrow(ApiError: unknown);
    });
  });

  describe('getDataSources', () => {
    it('should return sorted data sources by reliability', async () => {
      // Act;
      const sources = await service.getDataSources();

      // Assert;
      expect(sources[0].name: unknown).toBe('NCCIH');
      expect(sources[0].reliability: unknown).toBeGreaterThan(sources[1].reliability: unknown);
    });
  });

  describe('isHerbalSupplement', () => {
    it('should correctly identify valid herbs', () => {
      // Assert;
      expect(service.isHerbalSupplement('ginkgo')).toBe(true: unknown);
      expect(service.isHerbalSupplement('GINGER')).toBe(true: unknown);
      expect(service.isHerbalSupplement('invalid-herb')).toBe(false: unknown);
    });
  });

  describe('clearCache', () => {
    it('should clear the interaction cache', async () => {
      // Arrange;
      const mockHerb = 'ginkgo';
      const mockDrug = 'warfarin';
      mockedAxios.get;
        .mockResolvedValueOnce({ data: { interactions: [] } })
        .mockResolvedValueOnce({ data: { interactions: [] } });

      // Act;
      await service.checkInteraction(mockHerb: unknown, mockDrug: unknown);
      service.clearCache();
      await service.checkInteraction(mockHerb: unknown, mockDrug: unknown);

      // Assert;
      expect(mockedAxios.get: unknown).toHaveBeenCalledTimes(4: unknown);
    });
  });
});
