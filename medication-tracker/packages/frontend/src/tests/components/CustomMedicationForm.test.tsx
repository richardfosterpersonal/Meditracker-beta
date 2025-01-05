/**
 * CustomMedicationForm Tests
 * Validates integration with validation system
 * Compliant with SINGLE_SOURCE_VALIDATION.md
 */
import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { CustomMedicationForm } from '../../components/AddMedication/CustomMedicationForm';
import { useValidation } from '../../hooks/useValidation';
import { ValidationTypes } from '../../types/validation';

// Mock the validation hook
jest.mock('../../hooks/useValidation');
const mockUseValidation = useValidation as jest.MockedFunction<typeof useValidation>;

describe('CustomMedicationForm Validation', () => {
  const mockOnSubmit = jest.fn();
  const mockOnCancel = jest.fn();
  
  const mockValidateMedication = jest.fn();
  const mockValidationStatus = { loading: false };

  beforeEach(() => {
    jest.clearAllMocks();
    mockUseValidation.mockReturnValue({
      validateMedication: mockValidateMedication,
      validationStatus: mockValidationStatus
    });
  });

  it('should validate form data before submission', async () => {
    mockValidateMedication.mockResolvedValueOnce({
      status: 'success',
      evidence: {
        timestamp: '2024-12-24T16:10:16+01:00',
        status: 'complete'
      }
    });

    render(
      <CustomMedicationForm
        onSubmit={mockOnSubmit}
        onCancel={mockOnCancel}
      />
    );

    // Fill form data
    fireEvent.change(screen.getByLabelText(/form/i), {
      target: { value: 'tablet' }
    });
    fireEvent.change(screen.getByLabelText(/dosage value/i), {
      target: { value: '10' }
    });
    fireEvent.change(screen.getByLabelText(/dosage unit/i), {
      target: { value: 'mg' }
    });
    fireEvent.change(screen.getByLabelText(/route/i), {
      target: { value: 'oral' }
    });
    fireEvent.change(screen.getByLabelText(/instructions/i), {
      target: { value: 'Take with food' }
    });

    // Submit form
    fireEvent.click(screen.getByText(/submit custom medication/i));

    await waitFor(() => {
      expect(mockValidateMedication).toHaveBeenCalledWith({
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
      });
    });

    expect(mockOnSubmit).toHaveBeenCalled();
  });

  it('should show validation error message on failure', async () => {
    const errorMessage = 'Validation failed: Invalid dosage format';
    mockValidateMedication.mockResolvedValueOnce({
      status: 'error',
      error: errorMessage
    });

    render(
      <CustomMedicationForm
        onSubmit={mockOnSubmit}
        onCancel={mockOnCancel}
      />
    );

    // Fill and submit form
    fireEvent.change(screen.getByLabelText(/dosage value/i), {
      target: { value: 'invalid' }
    });
    fireEvent.click(screen.getByText(/submit custom medication/i));

    await waitFor(() => {
      expect(screen.getByText(errorMessage)).toBeInTheDocument();
    });

    expect(mockOnSubmit).not.toHaveBeenCalled();
  });

  it('should show loading state during validation', async () => {
    mockValidateMedication.mockImplementationOnce(() =>
      new Promise(resolve => setTimeout(resolve, 100))
    );

    render(
      <CustomMedicationForm
        onSubmit={mockOnSubmit}
        onCancel={mockOnCancel}
      />
    );

    fireEvent.click(screen.getByText(/submit custom medication/i));

    expect(screen.getByText(/validating.../i)).toBeInTheDocument();
  });

  it('should maintain HIPAA compliance notice', () => {
    render(
      <CustomMedicationForm
        onSubmit={mockOnSubmit}
        onCancel={mockOnCancel}
      />
    );

    expect(screen.getByText(/HIPAA requirements/i)).toBeInTheDocument();
  });
});
