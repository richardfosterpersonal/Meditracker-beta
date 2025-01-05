import { injectable, inject } from 'inversify';
import { Logger } from 'winston';
import { TYPES } from '@/config/types.js';
import { ApiError } from '@/utils/errors.js';
import { auditLog } from '@/utils/audit.js';
import { monitorPerformance } from '@/utils/monitoring.js';
import { ISchedulerService } from '@/interfaces/ISchedulerService.js';
import { INotificationService } from '@/interfaces/INotificationService.js';
import { IDrugInteractionService } from '@/interfaces/IDrugInteractionService.js';
import { Schedule, ScheduleConflict, ConflictType, ConflictSeverity } from '@/types/schedule.js';
import { NotificationType, NotificationPriority } from '@/types/notification.js';
import { Medication } from '@prisma/client';
import { prisma } from '@/config/database.js';
import { BackgroundScheduler, CronTrigger, IntervalTrigger } from 'apscheduler';
import { differenceInMinutes, addMinutes, isAfter } from 'date-fns';

@injectable()
export class SchedulerService implements ISchedulerService {
  private readonly scheduler: BackgroundScheduler;
  private readonly MIN_DOSE_INTERVAL = 30; // minutes

  constructor(
    @inject(TYPES.Logger) private readonly logger: Logger,
    @inject(TYPES.NotificationService) private readonly notificationService: INotificationService,
    @inject(TYPES.DrugInteractionService) private readonly drugInteractionService: IDrugInteractionService
  ) {
    this.scheduler = new BackgroundScheduler();
  }

  @monitorPerformance('scheduler_start')
  public async start(): Promise<void> {
    try {
      this.scheduler.start();
      await this.scheduleRegularChecks();
      await auditLog('scheduler', 'started');
    } catch (error) {
      this.logger.error('Error starting scheduler:', error);
      throw error instanceof ApiError ? error : new ApiError('Failed to start scheduler', 500);
    }
  }

  @monitorPerformance('scheduler_stop')
  public async stop(): Promise<void> {
    try {
      this.scheduler.shutdown();
      await auditLog('scheduler', 'stopped');
    } catch (error) {
      this.logger.error('Error stopping scheduler:', error);
      throw error instanceof ApiError ? error : new ApiError('Failed to stop scheduler', 500);
    }
  }

  @monitorPerformance('create_schedule')
  public async createSchedule(medication: Medication, schedule: Schedule): Promise<void> {
    try {
      // Check for conflicts
      const conflicts = await this.checkConflicts(medication, schedule);
      if (conflicts.some(c => c.severity === ConflictSeverity.HIGH)) {
        throw new ApiError('Schedule has high severity conflicts', 400);
      }

      // Create schedule
      await prisma.schedule.create({
        data: {
          ...schedule,
          medicationId: medication.id,
          createdAt: new Date(),
          updatedAt: new Date(),
        },
      });

      // Schedule notifications
      await this.scheduleNotifications(medication, schedule);

      await auditLog('scheduler', 'schedule_created', {
        medicationId: medication.id,
        userId: schedule.userId,
      });
    } catch (error) {
      this.logger.error('Error creating schedule:', error);
      throw error instanceof ApiError ? error : new ApiError('Failed to create schedule', 500);
    }
  }

  @monitorPerformance('update_schedule')
  public async updateSchedule(medication: Medication, schedule: Schedule): Promise<void> {
    try {
      // Check for conflicts
      const conflicts = await this.checkConflicts(medication, schedule);
      if (conflicts.some(c => c.severity === ConflictSeverity.HIGH)) {
        throw new ApiError('Schedule has high severity conflicts', 400);
      }

      // Update schedule
      await prisma.schedule.update({
        where: { id: schedule.id },
        data: {
          ...schedule,
          updatedAt: new Date(),
        },
      });

      // Reschedule notifications
      await this.cancelScheduledNotifications(medication.id);
      await this.scheduleNotifications(medication, schedule);

      await auditLog('scheduler', 'schedule_updated', {
        medicationId: medication.id,
        userId: schedule.userId,
      });
    } catch (error) {
      this.logger.error('Error updating schedule:', error);
      throw error instanceof ApiError ? error : new ApiError('Failed to update schedule', 500);
    }
  }

  @monitorPerformance('delete_schedule')
  public async deleteSchedule(medicationId: string): Promise<void> {
    try {
      await prisma.schedule.delete({
        where: { medicationId },
      });

      await this.cancelScheduledNotifications(medicationId);

      await auditLog('scheduler', 'schedule_deleted', {
        medicationId,
      });
    } catch (error) {
      this.logger.error('Error deleting schedule:', error);
      throw error instanceof ApiError ? error : new ApiError('Failed to delete schedule', 500);
    }
  }

  @monitorPerformance('check_conflicts')
  public async checkConflicts(medication: Medication, schedule: Schedule): Promise<ScheduleConflict[]> {
    try {
      const conflicts: ScheduleConflict[] = [];

      // Get other medications for the user
      const otherMedications = await prisma.medication.findMany({
        where: {
          userId: schedule.userId,
          id: { not: medication.id },
          active: true,
        },
        include: {
          schedule: true,
        },
      });

      // Check timing conflicts
      for (const otherMed of otherMedications) {
        if (!otherMed.schedule) continue;

        const timingConflicts = this.checkTimingConflicts(
          medication,
          schedule,
          otherMed,
          otherMed.schedule
        );
        conflicts.push(...timingConflicts);

        // Check drug interactions
        const interactions = await this.drugInteractionService.checkInteraction(
          medication.name,
          otherMed.name
        );

        if (interactions.length > 0) {
          conflicts.push({
            medication1: medication.name,
            medication2: otherMed.name,
            time: new Date(),
            conflictType: ConflictType.INTERACTION,
            severity: ConflictSeverity.HIGH,
            recommendation: 'Consult healthcare provider about potential drug interaction',
          });
        }
      }

      return conflicts;
    } catch (error) {
      this.logger.error('Error checking conflicts:', error);
      throw error instanceof ApiError ? error : new ApiError('Failed to check conflicts', 500);
    }
  }

  @monitorPerformance('get_user_schedules')
  public async getUserSchedules(userId: string): Promise<Schedule[]> {
    try {
      return await prisma.schedule.findMany({
        where: { userId },
        orderBy: { createdAt: 'desc' },
      });
    } catch (error) {
      this.logger.error('Error getting user schedules:', error);
      throw error instanceof ApiError ? error : new ApiError('Failed to get user schedules', 500);
    }
  }

  @monitorPerformance('process_due_tasks')
  public async processDueTasks(): Promise<void> {
    try {
      await Promise.all([
        this.checkMissedDoses(),
        this.checkRefillsNeeded(),
        this.checkInteractions(),
      ]);

      await auditLog('scheduler', 'tasks_processed');
    } catch (error) {
      this.logger.error('Error processing due tasks:', error);
      throw error instanceof ApiError ? error : new ApiError('Failed to process due tasks', 500);
    }
  }

  @monitorPerformance('check_missed_doses')
  public async checkMissedDoses(): Promise<void> {
    try {
      const now = new Date();
      const schedules = await prisma.schedule.findMany({
        where: {
          active: true,
          endDate: {
            gte: now,
          },
        },
        include: {
          medication: true,
        },
      });

      for (const schedule of schedules) {
        const doseTimes = this.getDoseTimes(schedule, now);
        const missedDoses = doseTimes.filter(time => 
          isAfter(now, addMinutes(time, schedule.reminderTime))
        );

        if (missedDoses.length > 0) {
          await this.notificationService.createNotification({
            userId: schedule.userId,
            type: NotificationType.MISSED_MEDICATION,
            priority: NotificationPriority.HIGH,
            title: 'Missed Medication Dose',
            message: `You missed a dose of ${schedule.medication.name}`,
            metadata: {
              medicationId: schedule.medicationId,
              missedDoses: missedDoses.map(d => d.toISOString()),
            },
            notifyCarers: true,
          });
        }
      }

      await auditLog('scheduler', 'checked_missed_doses');
    } catch (error) {
      this.logger.error('Error checking missed doses:', error);
      throw error instanceof ApiError ? error : new ApiError('Failed to check missed doses', 500);
    }
  }

  @monitorPerformance('check_refills_needed')
  public async checkRefillsNeeded(): Promise<void> {
    try {
      const medications = await prisma.medication.findMany({
        where: {
          active: true,
          remainingDoses: {
            lte: 5,
          },
        },
      });

      for (const medication of medications) {
        await this.notificationService.createNotification({
          userId: medication.userId,
          type: NotificationType.REFILL_REMINDER,
          priority: NotificationPriority.NORMAL,
          title: 'Medication Refill Needed',
          message: `${medication.name} is running low. Only ${medication.remainingDoses} doses remaining.`,
          metadata: {
            medicationId: medication.id,
            remainingDoses: medication.remainingDoses,
          },
          notifyCarers: true,
        });
      }

      await auditLog('scheduler', 'checked_refills');
    } catch (error) {
      this.logger.error('Error checking refills:', error);
      throw error instanceof ApiError ? error : new ApiError('Failed to check refills', 500);
    }
  }

  @monitorPerformance('check_interactions')
  public async checkInteractions(): Promise<void> {
    try {
      const medications = await prisma.medication.findMany({
        where: {
          active: true,
        },
      });

      // Group medications by user
      const userMedications = medications.reduce((acc, med) => {
        if (!acc[med.userId]) {
          acc[med.userId] = [];
        }
        acc[med.userId].push(med);
        return acc;
      }, {} as Record<string, Medication[]>);

      // Check interactions for each user's medications
      for (const [userId, meds] of Object.entries(userMedications)) {
        for (let i = 0; i < meds.length; i++) {
          for (let j = i + 1; j < meds.length; j++) {
            const interactions = await this.drugInteractionService.checkInteraction(
              meds[i].name,
              meds[j].name
            );

            if (interactions.length > 0) {
              await this.notificationService.createNotification({
                userId,
                type: NotificationType.INTERACTION_ALERT,
                priority: NotificationPriority.HIGH,
                title: 'Medication Interaction Alert',
                message: `Potential interaction between ${meds[i].name} and ${meds[j].name}`,
                metadata: {
                  medications: [meds[i].id, meds[j].id],
                  interactions,
                },
                notifyCarers: true,
              });
            }
          }
        }
      }

      await auditLog('scheduler', 'checked_interactions');
    } catch (error) {
      this.logger.error('Error checking interactions:', error);
      throw error instanceof ApiError ? error : new ApiError('Failed to check interactions', 500);
    }
  }

  private async scheduleRegularChecks(): Promise<void> {
    // Check for missed doses every 15 minutes
    this.scheduler.add_job(
      this.checkMissedDoses.bind(this),
      IntervalTrigger(minutes=15),
      id='check_missed_doses'
    );

    // Check for medications needing refills daily at midnight
    this.scheduler.add_job(
      this.checkRefillsNeeded.bind(this),
      CronTrigger(hour=0),
      id='check_refills'
    );

    // Check for medication interactions hourly
    this.scheduler.add_job(
      this.checkInteractions.bind(this),
      IntervalTrigger(hours=1),
      id='check_interactions'
    );
  }

  private async scheduleNotifications(medication: Medication, schedule: Schedule): Promise<void> {
    const now = new Date();
    const endDate = schedule.endDate || addMinutes(now, 7 * 24 * 60); // Schedule a week ahead if no end date

    const doseTimes = this.getDoseTimes(schedule, now);
    for (const doseTime of doseTimes) {
      if (doseTime > now && doseTime <= endDate) {
        const reminderTime = addMinutes(doseTime, -schedule.reminderTime);
        await this.notificationService.scheduleNotification({
          userId: schedule.userId,
          type: NotificationType.MEDICATION_REMINDER,
          priority: NotificationPriority.HIGH,
          title: 'Medication Reminder',
          message: `Time to take ${medication.name}`,
          metadata: {
            medicationId: medication.id,
            doseTime: doseTime.toISOString(),
          },
          scheduleTime: reminderTime,
          notifyCarers: true,
        });
      }
    }
  }

  private async cancelScheduledNotifications(medicationId: string): Promise<void> {
    // Find and delete all scheduled notifications for this medication
    await prisma.notification.deleteMany({
      where: {
        metadata: {
          path: ['medicationId'],
          equals: medicationId,
        },
        sent: false,
      },
    });
  }

  private checkTimingConflicts(
    med1: Medication,
    schedule1: Schedule,
    med2: Medication,
    schedule2: Schedule
  ): ScheduleConflict[] {
    const conflicts: ScheduleConflict[] = [];
    const now = new Date();

    const times1 = this.getDoseTimes(schedule1, now);
    const times2 = this.getDoseTimes(schedule2, now);

    for (const time1 of times1) {
      for (const time2 of times2) {
        const minutesDiff = Math.abs(differenceInMinutes(time1, time2));
        if (minutesDiff < this.MIN_DOSE_INTERVAL) {
          conflicts.push({
            medication1: med1.name,
            medication2: med2.name,
            time: time1,
            conflictType: ConflictType.TIMING,
            severity: ConflictSeverity.MEDIUM,
            recommendation: `Space out doses by at least ${this.MIN_DOSE_INTERVAL} minutes`,
          });
        }
      }
    }

    return conflicts;
  }

  private getDoseTimes(schedule: Schedule, date: Date): Date[] {
    const times: Date[] = [];

    for (const time of schedule.times) {
      const [hours, minutes] = time.split(':').map(Number);
      const doseTime = new Date(date);
      doseTime.setHours(hours, minutes, 0, 0);
      times.push(doseTime);
    }

    return times;
  }
}
