/**
 * Validation Hook Tests
 * Ensures compliance with SINGLE_SOURCE_VALIDATION.md
 */
import { renderHook, act } from '@testing-library/react-hooks';
import axios from 'axios';
import { useValidation } from '../../hooks/useValidation';
import { ValidationTypes } from '../../types/validation';

// Mock axios
jest.mock('axios');
const mockedAxios = axios as jest.Mocked<typeof axios>;

describe('useValidation Hook', () => {
  const mockValidationRequest = {
    type: ValidationTypes.MEDICATION_SAFETY,
    data: {
      form: 'tablet',
      dosageValue: '10',
      dosageUnit: 'mg',
      route: 'oral',
      instructions: 'Take with food'
    },
    component: 'medication',
    feature: 'medication_management'
  };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('should validate medication data successfully', async () => {
    const mockEvidence = {
      timestamp: '2024-12-24T16:10:16+01:00',
      component: 'medication',
      action: 'validate',
      status: 'complete',
      validations: [
        {
          type: 'medication_safety',
          timestamp: '2024-12-24T16:10:16+01:00',
          status: 'complete'
        }
      ]
    };

    mockedAxios.post.mockResolvedValueOnce({ data: { evidence: mockEvidence } });

    const { result } = renderHook(() => useValidation());

    let validationResult;
    await act(async () => {
      validationResult = await result.current.validateMedication(mockValidationRequest);
    });

    expect(validationResult).toEqual({
      status: 'success',
      evidence: mockEvidence
    });

    expect(mockedAxios.post).toHaveBeenCalledWith(
      '/api/v1/validation/validate',
      mockValidationRequest
    );

    expect(result.current.validationStatus).toEqual({
      loading: false,
      evidence: mockEvidence
    });
  });

  it('should handle validation errors properly', async () => {
    const mockError = {
      response: {
        data: {
          error: 'Validation failed: Invalid dosage format'
        }
      }
    };

    mockedAxios.post.mockRejectedValueOnce(mockError);

    const { result } = renderHook(() => useValidation());

    let validationResult;
    await act(async () => {
      validationResult = await result.current.validateMedication(mockValidationRequest);
    });

    expect(validationResult).toEqual({
      status: 'error',
      error: 'Validation failed: Invalid dosage format'
    });

    expect(result.current.validationStatus).toEqual({
      loading: false,
      error: 'Validation failed: Invalid dosage format'
    });
  });

  it('should handle network errors gracefully', async () => {
    mockedAxios.post.mockRejectedValueOnce(new Error('Network error'));

    const { result } = renderHook(() => useValidation());

    let validationResult;
    await act(async () => {
      validationResult = await result.current.validateMedication(mockValidationRequest);
    });

    expect(validationResult).toEqual({
      status: 'error',
      error: 'Validation failed'
    });
  });

  it('should maintain loading state during validation', async () => {
    mockedAxios.post.mockImplementationOnce(() => 
      new Promise(resolve => setTimeout(resolve, 100))
    );

    const { result } = renderHook(() => useValidation());

    let promise;
    act(() => {
      promise = result.current.validateMedication(mockValidationRequest);
    });

    expect(result.current.validationStatus.loading).toBe(true);

    await act(async () => {
      await promise;
    });

    expect(result.current.validationStatus.loading).toBe(false);
  });
});
