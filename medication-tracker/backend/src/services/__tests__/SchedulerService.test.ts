import { Container } from 'inversify';
import { Logger } from 'winston';
import { mock, MockProxy } from 'jest-mock-extended';
import { SchedulerService } from '../SchedulerService.js';
import { INotificationService } from '@/interfaces/INotificationService.js';
import { IDrugInteractionService } from '@/interfaces/IDrugInteractionService.js';
import { Schedule, ConflictType, ConflictSeverity } from '@/types/schedule.js';
import { NotificationType, NotificationPriority } from '@/types/notification.js';
import { ApiError } from '@/utils/errors.js';
import { prisma } from '@/config/database.js';
import { addMinutes, subMinutes } from 'date-fns';

// Mock prisma
jest.mock('@/config/database', () => ({
  prisma: {
    schedule: {
      create: jest.fn(),
      update: jest.fn(),
      delete: jest.fn(),
      findMany: jest.fn(),
    },
    medication: {
      findMany: jest.fn(),
    },
    notification: {
      deleteMany: jest.fn(),
    },
  },
}));

describe('SchedulerService', () => {
  let container: Container;
  let schedulerService: SchedulerService;
  let logger: MockProxy<Logger>;
  let notificationService: MockProxy<INotificationService>;
  let drugInteractionService: MockProxy<IDrugInteractionService>;

  const mockMedication = {
    id: '1',
    name: 'Test Med',
    userId: 'user1',
    active: true,
    remainingDoses: 10,
  };

  const mockSchedule: Schedule = {
    id: '1',
    medicationId: '1',
    userId: 'user1',
    type: 'fixed_time',
    startDate: new Date(),
    times: ['09:00', '21:00'],
    dosage: 1,
    unit: 'pill',
    reminderTime: 30,
    active: true,
  };

  beforeEach(() => {
    // Reset mocks
    jest.clearAllMocks();

    // Create mocks
    logger = mock<Logger>();
    notificationService = mock<INotificationService>();
    drugInteractionService = mock<IDrugInteractionService>();

    // Setup container
    container = new Container();
    container.bind('Logger').toConstantValue(logger);
    container.bind('NotificationService').toConstantValue(notificationService);
    container.bind('DrugInteractionService').toConstantValue(drugInteractionService);
    container.bind(SchedulerService).toSelf();

    // Get service instance
    schedulerService = container.get(SchedulerService);
  });

  describe('createSchedule', () => {
    it('should create a schedule successfully', async () => {
      // Setup
      const prismaCreateSpy = jest.spyOn(prisma.schedule, 'create');
      prismaCreateSpy.mockResolvedValueOnce(mockSchedule);

      // Execute
      await schedulerService.createSchedule(mockMedication, mockSchedule);

      // Verify
      expect(prismaCreateSpy).toHaveBeenCalledWith({
        data: expect.objectContaining({
          medicationId: mockMedication.id,
        }),
      });
      expect(notificationService.createNotification).toHaveBeenCalled();
    });

    it('should throw error if schedule has high severity conflicts', async () => {
      // Setup
      const mockConflict = {
        medication1: 'Med1',
        medication2: 'Med2',
        time: new Date(),
        conflictType: ConflictType.INTERACTION,
        severity: ConflictSeverity.HIGH,
        recommendation: 'Avoid combination',
      };

      jest.spyOn(schedulerService, 'checkConflicts').mockResolvedValueOnce([mockConflict]);

      // Execute & Verify
      await expect(schedulerService.createSchedule(mockMedication, mockSchedule))
        .rejects
        .toThrow('Schedule has high severity conflicts');
    });
  });

  describe('checkMissedDoses', () => {
    it('should create notifications for missed doses', async () => {
      // Setup
      const now = new Date();
      const missedTime = subMinutes(now, 60);
      const mockSchedules = [{
        ...mockSchedule,
        medication: mockMedication,
        times: [missedTime.toLocaleTimeString('en-US', { hour12: false })],
      }];

      jest.spyOn(prisma.schedule, 'findMany').mockResolvedValueOnce(mockSchedules);

      // Execute
      await schedulerService.checkMissedDoses();

      // Verify
      expect(notificationService.createNotification).toHaveBeenCalledWith(
        expect.objectContaining({
          type: NotificationType.MISSED_MEDICATION,
          priority: NotificationPriority.HIGH,
        })
      );
    });
  });

  describe('checkInteractions', () => {
    it('should check interactions between medications', async () => {
      // Setup
      const mockMedications = [
        { ...mockMedication, id: '1', name: 'Med1' },
        { ...mockMedication, id: '2', name: 'Med2' },
      ];

      jest.spyOn(prisma.medication, 'findMany').mockResolvedValueOnce(mockMedications);
      drugInteractionService.checkInteraction.mockResolvedValueOnce(['Severe interaction']);

      // Execute
      await schedulerService.checkInteractions();

      // Verify
      expect(drugInteractionService.checkInteraction).toHaveBeenCalledWith('Med1', 'Med2');
      expect(notificationService.createNotification).toHaveBeenCalledWith(
        expect.objectContaining({
          type: NotificationType.INTERACTION_ALERT,
          priority: NotificationPriority.HIGH,
        })
      );
    });
  });

  describe('checkRefillsNeeded', () => {
    it('should create notifications for low medication supply', async () => {
      // Setup
      const lowMedication = { ...mockMedication, remainingDoses: 3 };
      jest.spyOn(prisma.medication, 'findMany').mockResolvedValueOnce([lowMedication]);

      // Execute
      await schedulerService.checkRefillsNeeded();

      // Verify
      expect(notificationService.createNotification).toHaveBeenCalledWith(
        expect.objectContaining({
          type: NotificationType.REFILL_REMINDER,
          priority: NotificationPriority.NORMAL,
        })
      );
    });
  });

  describe('error handling', () => {
    it('should handle database errors gracefully', async () => {
      // Setup
      const dbError = new Error('Database connection failed');
      jest.spyOn(prisma.schedule, 'findMany').mockRejectedValueOnce(dbError);

      // Execute & Verify
      await expect(schedulerService.checkMissedDoses())
        .rejects
        .toThrow('Failed to check missed doses');
      expect(logger.error).toHaveBeenCalledWith(
        'Error checking missed doses:',
        expect.any(Error)
      );
    });

    it('should handle notification service errors', async () => {
      // Setup
      const notificationError = new Error('Failed to send notification');
      notificationService.createNotification.mockRejectedValueOnce(notificationError);

      const mockSchedules = [{
        ...mockSchedule,
        medication: mockMedication,
        times: [(new Date()).toLocaleTimeString('en-US', { hour12: false })],
      }];

      jest.spyOn(prisma.schedule, 'findMany').mockResolvedValueOnce(mockSchedules);

      // Execute & Verify
      await expect(schedulerService.checkMissedDoses())
        .rejects
        .toThrow('Failed to check missed doses');
      expect(logger.error).toHaveBeenCalled();
    });
  });

  describe('performance and safety', () => {
    it('should handle concurrent schedule updates safely', async () => {
      // Setup
      const updates = Array(5).fill(null).map((_, i) => ({
        ...mockSchedule,
        id: `schedule${i}`,
      }));

      // Execute
      await Promise.all(updates.map(schedule => 
        schedulerService.updateSchedule(mockMedication, schedule)
      ));

      // Verify
      expect(prisma.schedule.update).toHaveBeenCalledTimes(5);
    });

    it('should respect minimum dose interval', async () => {
      // Setup
      const schedule1 = {
        ...mockSchedule,
        times: ['09:00'],
      };

      const schedule2 = {
        ...mockSchedule,
        times: ['09:15'], // Less than MIN_DOSE_INTERVAL (30 mins)
      };

      // Execute
      const conflicts = await schedulerService.checkConflicts(
        mockMedication,
        schedule2
      );

      // Verify
      expect(conflicts).toHaveLength(1);
      expect(conflicts[0].conflictType).toBe(ConflictType.TIMING);
      expect(conflicts[0].severity).toBe(ConflictSeverity.MEDIUM);
    });
  });
});
