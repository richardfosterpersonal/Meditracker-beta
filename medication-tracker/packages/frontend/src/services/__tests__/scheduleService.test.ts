import { ScheduleService, ScheduleConflictError } from '../scheduleService';
import { MedicationSchedule } from '../../utils/scheduleValidation';

describe('ScheduleService', () => {
  let scheduleService: ScheduleService;

  beforeEach(() => {
    scheduleService = ScheduleService.getInstance();
  });

  describe('checkConflicts', () => {
    const existingSchedule: MedicationSchedule = {
      id: '1',
      medicationId: 'med1',
      times: [{ hour: 9, minute: 0 }],
      startDate: '2024-01-01',
      frequency: 'daily'
    };

    it('detects time conflicts', async () => {
      const newSchedule: MedicationSchedule = {
        id: '2',
        medicationId: 'med2',
        times: [{ hour: 9, minute: 15 }], // Within 60 minutes
        startDate: '2024-01-01',
        frequency: 'daily'
      };

      await expect(
        scheduleService.checkConflicts(newSchedule, [existingSchedule])
      ).rejects.toThrow(ScheduleConflictError);
    });

    it('passes when times are sufficiently separated', async () => {
      const newSchedule: MedicationSchedule = {
        id: '2',
        medicationId: 'med2',
        times: [{ hour: 12, minute: 0 }], // 3 hours apart
        startDate: '2024-01-01',
        frequency: 'daily'
      };

      const conflicts = await scheduleService.checkConflicts(
        newSchedule,
        [existingSchedule]
      );
      expect(conflicts).toHaveLength(0);
    });

    it('suggests alternative times for conflicts', async () => {
      const newSchedule: MedicationSchedule = {
        id: '2',
        medicationId: 'med2',
        times: [{ hour: 9, minute: 15 }],
        startDate: '2024-01-01',
        frequency: 'daily'
      };

      try {
        await scheduleService.checkConflicts(newSchedule, [existingSchedule]);
      } catch (error) {
        if (error instanceof ScheduleConflictError) {
          expect(error.conflicts[0].suggestedTime).toBeDefined();
          expect(error.conflicts[0].suggestedTime?.hour).toBeDefined();
          expect(error.conflicts[0].suggestedTime?.minute).toBeDefined();
        }
      }
    });
  });

  describe('updateSchedule', () => {
    const originalSchedule: MedicationSchedule = {
      id: '1',
      medicationId: 'med1',
      times: [{ hour: 9, minute: 0 }],
      startDate: '2024-01-01',
      frequency: 'daily'
    };

    it('updates schedule with correct version', async () => {
      const update = {
        scheduleId: '1',
        version: 0,
        changes: {
          times: [{ hour: 10, minute: 0 }]
        }
      };

      const updatedSchedule = await scheduleService.updateSchedule(
        update,
        originalSchedule
      );
      expect(updatedSchedule.times[0].hour).toBe(10);
    });

    it('throws on version mismatch', async () => {
      // First update
      await scheduleService.updateSchedule(
        {
          scheduleId: '1',
          version: 0,
          changes: { times: [{ hour: 10, minute: 0 }] }
        },
        originalSchedule
      );

      // Second update with old version
      await expect(
        scheduleService.updateSchedule(
          {
            scheduleId: '1',
            version: 0,
            changes: { times: [{ hour: 11, minute: 0 }] }
          },
          originalSchedule
        )
      ).rejects.toThrow('Schedule has been modified');
    });
  });
});
