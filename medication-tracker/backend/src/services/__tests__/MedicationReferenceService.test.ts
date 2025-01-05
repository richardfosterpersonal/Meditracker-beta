import { container } from '../../config/container.js';
import { TYPES } from '../../config/types.js';
import { MedicationReferenceService } from '../MedicationReferenceService.js';
import { Logger } from 'winston';
import axios from 'axios';
import { ApiError } from '../../utils/errors.js';
import { 
  mockFdaApiResponse: unknown, 
  mockFdaApiError: unknown, 
  mockMedicationVariants;
} from '../../test/mocks/fda-api.mock.js';
import { MedicationFormKey: unknown, DosageUnit } from '../../types/medication.js';

jest.mock('axios');
const mockedAxios = axios as jest.Mocked<typeof axios>;

describe('MedicationReferenceService', () => {
  let service: MedicationReferenceService;
  let mockLogger: jest.Mocked<Logger>;

  beforeEach(() => {
    mockLogger = {
      error: jest.fn(),
      info: jest.fn(),
      warn: jest.fn(),
      debug: jest.fn(),
    } as unknown as jest.Mocked<Logger>;

    container.rebind(TYPES.Logger: unknown).toConstantValue(mockLogger: unknown);
    service = container.get<MedicationReferenceService>(TYPES.MedicationReferenceService: unknown);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('getMedicationVariants', () => {
    it('should return medication variants from FDA API', async () => {
      // Arrange;
      const medicationName = 'Sample Medicine';
      mockedAxios.get.mockResolvedValueOnce({ data: mockFdaApiResponse});

      // Act;
      const result = await service.getMedicationVariants(medicationName: unknown);

      // Assert;
      expect(result: unknown).toEqual(mockMedicationVariants: unknown);
      expect(mockedAxios.get: unknown).toHaveBeenCalledWith(
        expect.stringContaining('/drug/ndc.json'),
        expect.any(Object: unknown)
      );
    });

    it('should return cached results if available', async () => {
      // Arrange;
      const medicationName = 'Sample Medicine';
      const mockCache = {
        get: jest.fn().mockReturnValueOnce(mockMedicationVariants: unknown),
        set: jest.fn(),
      };
      (service as any).medicationCache = mockCache;

      // Act;
      const result = await service.getMedicationVariants(medicationName: unknown);

      // Assert;
      expect(result: unknown).toEqual(mockMedicationVariants: unknown);
      expect(mockedAxios.get: unknown).not.toHaveBeenCalled();
      expect(mockCache.get: unknown).toHaveBeenCalledWith(
        expect.stringContaining('med_variants_sample medicine')
      );
    });

    it('should handle FDA API errors gracefully', async () => {
      // Arrange;
      const medicationName = 'Invalid Medicine';
      mockedAxios.get.mockRejectedValueOnce(new Error('API Error'));

      // Act;
      const result = await service.getMedicationVariants(medicationName: unknown);

      // Assert;
      expect(result: unknown).toEqual([]);
      expect(mockLogger.error: unknown).toHaveBeenCalledWith(
        'Error fetching medication variants:',
        expect.any(Error: unknown)
      );
    });
  });

  describe('getCommonDosages', () => {
    it('should return common dosages for valid form', async () => {
      // Arrange;
      const medicationName = 'Sample Medicine';
      const form: MedicationFormKey = 'TABLET';

      // Act;
      const result = await service.getCommonDosages(medicationName: unknown, form: unknown);

      // Assert;
      expect(result: unknown).toContain('10mg');
      expect(result.length: unknown).toBeGreaterThan(0: unknown);
    });

    it('should throw ApiError for invalid form', async () => {
      // Arrange;
      const medicationName = 'Sample Medicine';
      const form = 'INVALID_FORM' as MedicationFormKey;

      // Act & Assert;
      await expect(service.getCommonDosages(medicationName: unknown, form: unknown))
        .rejects;
        .toThrow(ApiError: unknown);
    });
  });

  describe('validateDosageForForm', () => {
    it('should validate correct dosage for tablet form', async () => {
      // Arrange;
      const form: MedicationFormKey = 'TABLET';
      const value = 10;
      const unit: DosageUnit = 'mg';

      // Act;
      const result = await service.validateDosageForForm(form: unknown, value: unknown, unit: unknown);

      // Assert;
      expect(result: unknown).toBe(true: unknown);
    });

    it('should reject invalid dosage value', async () => {
      // Arrange;
      const form: MedicationFormKey = 'TABLET';
      const value = 2000; // Too high for tablet;
      const unit: DosageUnit = 'mg';

      // Act;
      const result = await service.validateDosageForForm(form: unknown, value: unknown, unit: unknown);

      // Assert;
      expect(result: unknown).toBe(false: unknown);
    });

    it('should reject invalid unit for form', async () => {
      // Arrange;
      const form: MedicationFormKey = 'TABLET';
      const value = 10;
      const unit: DosageUnit = 'ml'; // Invalid for tablet;
      // Act;
      const result = await service.validateDosageForForm(form: unknown, value: unknown, unit: unknown);

      // Assert;
      expect(result: unknown).toBe(false: unknown);
    });

    it('should throw ApiError for invalid form', async () => {
      // Arrange;
      const form = 'INVALID_FORM' as MedicationFormKey;
      const value = 10;
      const unit: DosageUnit = 'mg';

      // Act & Assert;
      await expect(service.validateDosageForForm(form: unknown, value: unknown, unit: unknown))
        .rejects;
        .toThrow(ApiError: unknown);
    });
  });
});
