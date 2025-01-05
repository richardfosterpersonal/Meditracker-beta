import { Schedule, ScheduleConflict } from '@/types/schedule.js';
import { Medication } from '@prisma/client';

export interface ISchedulerService {
  /**
   * Start the background scheduler
   */
  start(): Promise<void>;

  /**
   * Stop the background scheduler
   */
  stop(): Promise<void>;

  /**
   * Create a new medication schedule
   * @param medication Medication to schedule
   * @param schedule Schedule details
   */
  createSchedule(medication: Medication, schedule: Schedule): Promise<void>;

  /**
   * Update an existing medication schedule
   * @param medication Medication to update
   * @param schedule Updated schedule
   */
  updateSchedule(medication: Medication, schedule: Schedule): Promise<void>;

  /**
   * Delete a medication schedule
   * @param medicationId ID of medication to unschedule
   */
  deleteSchedule(medicationId: string): Promise<void>;

  /**
   * Get schedule conflicts for a medication
   * @param medication Medication to check
   * @param schedule Proposed schedule
   */
  checkConflicts(medication: Medication, schedule: Schedule): Promise<ScheduleConflict[]>;

  /**
   * Get all schedules for a user
   * @param userId User identifier
   */
  getUserSchedules(userId: string): Promise<Schedule[]>;

  /**
   * Process all scheduled tasks that are due
   */
  processDueTasks(): Promise<void>;

  /**
   * Check for missed medication doses
   */
  checkMissedDoses(): Promise<void>;

  /**
   * Check medications needing refills
   */
  checkRefillsNeeded(): Promise<void>;

  /**
   * Check for potential drug interactions
   */
  checkInteractions(): Promise<void>;
}
