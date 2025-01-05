import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { MedicationWizard } from '../MedicationWizard';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { ChakraProvider } from '@chakra-ui/react';
import { saveMedication, fetchExistingSchedules } from '../../../api/medications';

// Mock API calls
jest.mock('../../../api/medications');
const mockSaveMedication = saveMedication as jest.MockedFunction<typeof saveMedication>;
const mockFetchExistingSchedules = fetchExistingSchedules as jest.MockedFunction<typeof fetchExistingSchedules>;

describe('MedicationWizard', () => {
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: {
        retry: false,
      },
    },
  });

  beforeEach(() => {
    // Reset mocks
    mockSaveMedication.mockReset();
    mockFetchExistingSchedules.mockReset();
    
    // Setup default mock responses
    mockFetchExistingSchedules.mockResolvedValue([]);
  });

  const renderWizard = () => {
    return render(
      <ChakraProvider>
        <QueryClientProvider client={queryClient}>
          <MedicationWizard />
        </QueryClientProvider>
      </ChakraProvider>
    );
  };

  describe('Navigation', () => {
    it('should start at the first step', () => {
      renderWizard();
      expect(screen.getByText("Let's Add Your Medication")).toBeInTheDocument();
    });

    it('should not allow proceeding without required data', async () => {
      renderWizard();
      
      fireEvent.click(screen.getByText('Next'));
      
      await waitFor(() => {
        expect(screen.getByText('Required Information Missing')).toBeInTheDocument();
      });
    });

    it('should allow navigation when data is provided', async () => {
      renderWizard();
      
      // Mock medication selection
      // This would need to be adapted based on your actual medication selection implementation
      const mockMedicationData = { id: '1', name: 'Test Medication' };
      // Simulate medication selection...
      
      fireEvent.click(screen.getByText('Next'));
      
      await waitFor(() => {
        expect(screen.getByText('Schedule Setup')).toBeInTheDocument();
      });
    });
  });

  describe('Schedule Validation', () => {
    it('should show warnings for invalid schedules', async () => {
      renderWizard();
      
      // Navigate to schedule step
      // Mock medication selection first...
      fireEvent.click(screen.getByText('Next'));
      
      // Mock an invalid schedule selection
      // This would need to be adapted based on your ScheduleBuilder implementation
      
      await waitFor(() => {
        expect(screen.getByText(/Schedule Warning/i)).toBeInTheDocument();
      });
    });

    it('should detect conflicts with existing schedules', async () => {
      // Mock existing schedules
      mockFetchExistingSchedules.mockResolvedValue([
        {
          type: 'fixed_time',
          fixedTimeSlots: [{ time: '09:00', dose: 1 }]
        }
      ]);

      renderWizard();
      
      // Navigate to schedule step and set conflicting schedule
      // Implementation details would depend on your ScheduleBuilder
      
      await waitFor(() => {
        expect(screen.getByText(/Schedule conflict/i)).toBeInTheDocument();
      });
    });
  });

  describe('Form Submission', () => {
    it('should successfully save valid medication data', async () => {
      mockSaveMedication.mockResolvedValue({
        id: '1',
        name: 'Test Medication',
        schedule: {
          type: 'fixed_time',
          fixedTimeSlots: [{ time: '09:00', dose: 1 }]
        }
      });

      renderWizard();
      
      // Complete all steps with valid data
      // Implementation details would depend on your form components
      
      // Submit form
      fireEvent.click(screen.getByText('Complete'));
      
      await waitFor(() => {
        expect(mockSaveMedication).toHaveBeenCalled();
        expect(screen.getByText('Medication added successfully')).toBeInTheDocument();
      });
    });

    it('should handle API errors gracefully', async () => {
      mockSaveMedication.mockRejectedValue(new Error('API Error'));

      renderWizard();
      
      // Complete all steps
      // Implementation details...
      
      // Submit form
      fireEvent.click(screen.getByText('Complete'));
      
      await waitFor(() => {
        expect(screen.getByText('Failed to add medication')).toBeInTheDocument();
      });
    });
  });

  describe('Accessibility', () => {
    it('should maintain focus management', () => {
      renderWizard();
      
      const nextButton = screen.getByText('Next');
      fireEvent.tab();
      
      expect(document.activeElement).toBe(nextButton);
    });

    it('should have proper ARIA labels', () => {
      renderWizard();
      
      expect(screen.getByRole('progressbar')).toHaveAttribute('aria-valuenow');
      // Add more accessibility checks based on your implementation
    });
  });
});
