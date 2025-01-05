/**
 * Schedule Validation Utilities
 * Last Updated: 2024-12-25T20:30:31+01:00
 * Status: BETA
 * Reference: ../../../docs/validation/critical_path/CRITICAL_PATH_STATUS.md
 *
 * Implements critical path requirements for frontend schedule validation:
 * 1. Data Safety: Input validation
 * 2. User Safety: Time validation
 * 3. System Stability: Error handling
 */

import { Schedule, ScheduleInput } from '../types/schedule';

/**
 * Schedule validation errors
 * Critical Path: Error Handling
 */
export class ScheduleValidationError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'ScheduleValidationError';
  }
}

/**
 * Time validation utilities
 * Critical Path: Time Safety
 */
export const TimeValidation = {
  /**
   * Validate time format
   * @param time Time string in HH:MM format
   */
  validateTimeFormat(time: string): boolean {
    const timeRegex = /^([0-1][0-9]|2[0-3]):[0-5][0-9]$/;
    if (!timeRegex.test(time)) {
      throw new ScheduleValidationError('Invalid time format. Use HH:MM');
    }
    return true;
  },

  /**
   * Parse time string to Date
   * @param time Time string in HH:MM format
   */
  parseTime(time: string): Date {
    try {
      const [hours, minutes] = time.split(':').map(Number);
      const date = new Date();
      date.setHours(hours, minutes, 0, 0);
      return date;
    } catch (e) {
      throw new ScheduleValidationError('Failed to parse time');
    }
  }
};

/**
 * Schedule validation utilities
 * Critical Path: Schedule Safety
 */
export const ScheduleValidation = {
  /**
   * Validate schedule input
   * @param input Schedule input data
   */
  validateScheduleInput(input: ScheduleInput): boolean {
    // Critical Path: Required Fields
    if (!input.medication_id) {
      throw new ScheduleValidationError('Medication ID is required');
    }
    if (!input.user_id) {
      throw new ScheduleValidationError('User ID is required');
    }
    if (!input.time) {
      throw new ScheduleValidationError('Time is required');
    }

    // Critical Path: Time Validation
    TimeValidation.validateTimeFormat(input.time);

    return true;
  },

  /**
   * Validate schedule update
   * @param input Partial schedule update
   */
  validateScheduleUpdate(input: Partial<ScheduleInput>): boolean {
    // Critical Path: Time Validation
    if (input.time) {
      TimeValidation.validateTimeFormat(input.time);
    }

    return true;
  },

  /**
   * Check for schedule conflicts
   * @param schedules Existing schedules
   * @param newTime New schedule time
   */
  checkTimeConflicts(schedules: Schedule[], newTime: string): boolean {
    const newDate = TimeValidation.parseTime(newTime);
    
    return schedules.some(schedule => {
      const existingDate = TimeValidation.parseTime(schedule.time);
      // Check if times are within 30 minutes of each other
      const diffMinutes = Math.abs(newDate.getTime() - existingDate.getTime()) / (1000 * 60);
      return diffMinutes < 30;
    });
  }
};

/**
 * Response validation utilities
 * Critical Path: Data Safety
 */
export const ResponseValidation = {
  /**
   * Validate schedule response
   * @param schedule Schedule response data
   */
  validateScheduleResponse(schedule: Schedule): boolean {
    // Critical Path: Required Fields
    if (!schedule.id) {
      throw new ScheduleValidationError('Invalid response: Missing ID');
    }
    if (!schedule.medication_id) {
      throw new ScheduleValidationError('Invalid response: Missing medication ID');
    }
    if (!schedule.user_id) {
      throw new ScheduleValidationError('Invalid response: Missing user ID');
    }
    if (!schedule.time) {
      throw new ScheduleValidationError('Invalid response: Missing time');
    }

    // Critical Path: Time Validation
    TimeValidation.validateTimeFormat(schedule.time);

    return true;
  },

  /**
   * Validate schedule list response
   * @param schedules Schedule list response
   */
  validateScheduleListResponse(schedules: Schedule[]): boolean {
    schedules.forEach(schedule => {
      ResponseValidation.validateScheduleResponse(schedule);
    });
    return true;
  }
};

/**
 * Error handling utilities
 * Critical Path: Error Safety
 */
export const ErrorHandling = {
  /**
   * Format validation error
   * @param error Error object
   */
  formatValidationError(error: unknown): string {
    if (error instanceof ScheduleValidationError) {
      return error.message;
    }
    if (error instanceof Error) {
      return `Validation error: ${error.message}`;
    }
    return 'Unknown validation error';
  }
};
