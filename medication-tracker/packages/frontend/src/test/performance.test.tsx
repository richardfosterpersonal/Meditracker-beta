import React from 'react';
import { measureRenderTime } from './testUtils';
import AddMedication from '../components/AddMedication';
import EditMedication from '../components/EditMedication';
import { ScheduleService } from '../services/scheduleService';

const PERFORMANCE_THRESHOLD = 100; // milliseconds

describe('Performance Tests', () => {
  describe('Component Render Performance', () => {
    it('AddMedication renders within performance threshold', () => {
      const renderTime = measureRenderTime(AddMedication);
      expect(renderTime).toBeLessThan(PERFORMANCE_THRESHOLD);
    });

    it('EditMedication renders within performance threshold', () => {
      const mockMedication = {
        id: '1',
        name: 'Test Med',
        dosage: '100mg',
        schedule: {
          frequency: 'daily',
          times: [{ hour: 9, minute: 0 }],
          startDate: '2024-01-01'
        }
      };
      
      const renderTime = measureRenderTime(EditMedication, {
        medication: mockMedication
      });
      expect(renderTime).toBeLessThan(PERFORMANCE_THRESHOLD);
    });
  });

  describe('Schedule Service Performance', () => {
    let scheduleService: ScheduleService;
    
    beforeEach(() => {
      scheduleService = ScheduleService.getInstance();
    });

    it('handles conflict checking with large number of schedules efficiently', async () => {
      const existingSchedules = Array.from({ length: 100 }, (_, i) => ({
        id: `schedule-${i}`,
        medicationId: `med-${i}`,
        times: [{ hour: 9, minute: 0 }],
        startDate: '2024-01-01',
        frequency: 'daily' as const
      }));

      const newSchedule = {
        id: 'new-schedule',
        medicationId: 'new-med',
        times: [{ hour: 12, minute: 0 }],
        startDate: '2024-01-01',
        frequency: 'daily' as const
      };

      const start = performance.now();
      await scheduleService.checkConflicts(newSchedule, existingSchedules);
      const end = performance.now();

      expect(end - start).toBeLessThan(PERFORMANCE_THRESHOLD);
    });

    it('handles concurrent updates efficiently', async () => {
      const schedule = {
        id: 'test-schedule',
        medicationId: 'test-med',
        times: [{ hour: 9, minute: 0 }],
        startDate: '2024-01-01',
        frequency: 'daily' as const
      };

      const updates = Array.from({ length: 50 }, (_, i) => ({
        scheduleId: 'test-schedule',
        version: i,
        changes: {
          times: [{ hour: 10 + i, minute: 0 }]
        }
      }));

      const start = performance.now();
      for (const update of updates) {
        try {
          await scheduleService.updateSchedule(update, schedule);
        } catch (error) {
          // Version conflicts expected
        }
      }
      const end = performance.now();

      const averageUpdateTime = (end - start) / updates.length;
      expect(averageUpdateTime).toBeLessThan(PERFORMANCE_THRESHOLD / 10);
    });
  });

  describe('Error Handling Performance', () => {
    it('handles error boundaries efficiently', () => {
      const ErrorComponent = () => {
        throw new Error('Test error');
      };

      const renderTime = measureRenderTime(ErrorComponent);
      expect(renderTime).toBeLessThan(PERFORMANCE_THRESHOLD);
    });
  });
});
