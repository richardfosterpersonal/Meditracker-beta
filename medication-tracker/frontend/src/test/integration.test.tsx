import React from 'react';
import {
  render,
  screen,
  fireEvent,
  waitFor,
  createDelayedResponse,
  generateMockMedication,
  createErrorResponse
} from './testUtils';
import AddMedication from '../components/AddMedication';
import EditMedication from '../components/EditMedication';
import { ScheduleService } from '../services/scheduleService';
import { ErrorSeverity, ErrorCategory } from '../types/errors';

// Mock API calls
jest.mock('../services/api', () => ({
  createMedication: jest.fn(),
  updateMedication: jest.fn(),
  getMedication: jest.fn(),
  deleteMedication: jest.fn()
}));

describe('Integration Tests', () => {
  const scheduleService = ScheduleService.getInstance();

  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('Medication Management Flow', () => {
    it('successfully creates and updates medication with schedule', async () => {
      const api = require('../services/api');
      const mockMedication = generateMockMedication();
      
      // Mock successful creation
      api.createMedication.mockResolvedValueOnce(mockMedication);
      
      // Render add form
      render(<AddMedication />);
      
      // Fill form
      fireEvent.change(screen.getByLabelText(/medication name/i), {
        target: { value: 'Test Medication' }
      });
      fireEvent.change(screen.getByLabelText(/dosage/i), {
        target: { value: '100mg' }
      });
      
      // Add schedule
      fireEvent.click(screen.getByText(/add schedule/i));
      fireEvent.change(screen.getByLabelText(/time/i), {
        target: { value: '09:00' }
      });
      
      // Submit form
      fireEvent.click(screen.getByText(/save/i));
      
      await waitFor(() => {
        expect(api.createMedication).toHaveBeenCalledWith(
          expect.objectContaining({
            name: 'Test Medication',
            dosage: '100mg'
          })
        );
      });
      
      // Mock successful update
      api.updateMedication.mockResolvedValueOnce({
        ...mockMedication,
        dosage: '200mg'
      });
      
      // Render edit form
      render(<EditMedication medication={mockMedication} />);
      
      // Update dosage
      fireEvent.change(screen.getByLabelText(/dosage/i), {
        target: { value: '200mg' }
      });
      
      // Submit form
      fireEvent.click(screen.getByText(/save/i));
      
      await waitFor(() => {
        expect(api.updateMedication).toHaveBeenCalledWith(
          mockMedication.id,
          expect.objectContaining({
            dosage: '200mg'
          })
        );
      });
    });

    it('handles schedule conflicts appropriately', async () => {
      const existingSchedule = {
        id: '1',
        medicationId: 'med1',
        times: [{ hour: 9, minute: 0 }],
        startDate: '2024-01-01',
        frequency: 'daily'
      };

      const newSchedule = {
        id: '2',
        medicationId: 'med2',
        times: [{ hour: 9, minute: 15 }],
        startDate: '2024-01-01',
        frequency: 'daily'
      };

      try {
        await scheduleService.checkConflicts(newSchedule, [existingSchedule]);
      } catch (error: any) {
        expect(error.conflicts).toBeDefined();
        expect(error.conflicts[0].suggestedTime).toBeDefined();
      }
    });

    it('handles network errors gracefully', async () => {
      const api = require('../services/api');
      api.createMedication.mockRejectedValueOnce(
        createErrorResponse(500, 'Network Error')
      );

      render(<AddMedication />);

      // Fill form
      fireEvent.change(screen.getByLabelText(/medication name/i), {
        target: { value: 'Test Medication' }
      });

      // Submit form
      fireEvent.click(screen.getByText(/save/i));

      await waitFor(() => {
        expect(screen.getByText(/error/i)).toBeInTheDocument();
      });
    });
  });

  describe('Error Recovery Flow', () => {
    it('recovers from network errors with retry', async () => {
      const api = require('../services/api');
      let attemptCount = 0;
      
      api.createMedication.mockImplementation(() => {
        attemptCount++;
        if (attemptCount === 1) {
          return createErrorResponse(500, 'Network Error');
        }
        return createDelayedResponse(generateMockMedication());
      });

      render(<AddMedication />);

      // Fill and submit form
      fireEvent.change(screen.getByLabelText(/medication name/i), {
        target: { value: 'Test Medication' }
      });
      fireEvent.click(screen.getByText(/save/i));

      // Wait for error and retry
      await waitFor(() => {
        expect(screen.getByText(/retry/i)).toBeInTheDocument();
      });

      fireEvent.click(screen.getByText(/retry/i));

      await waitFor(() => {
        expect(attemptCount).toBe(2);
        expect(api.createMedication).toHaveBeenCalledTimes(2);
      });
    });
  });

  describe('Concurrent Update Handling', () => {
    it('handles concurrent updates correctly', async () => {
      const schedule = {
        id: 'test-schedule',
        medicationId: 'test-med',
        times: [{ hour: 9, minute: 0 }],
        startDate: '2024-01-01',
        frequency: 'daily' as const
      };

      // Simulate concurrent updates
      const update1 = {
        scheduleId: 'test-schedule',
        version: 0,
        changes: { times: [{ hour: 10, minute: 0 }] }
      };

      const update2 = {
        scheduleId: 'test-schedule',
        version: 0,
        changes: { times: [{ hour: 11, minute: 0 }] }
      };

      // First update should succeed
      await scheduleService.updateSchedule(update1, schedule);

      // Second update should fail due to version mismatch
      await expect(
        scheduleService.updateSchedule(update2, schedule)
      ).rejects.toThrow('Schedule has been modified');
    });
  });
});
