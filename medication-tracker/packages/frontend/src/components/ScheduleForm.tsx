/**
 * Schedule Form Component
 * Last Updated: 2024-12-25T20:30:31+01:00
 * Status: BETA
 * Reference: ../../../docs/validation/critical_path/CRITICAL_PATH_STATUS.md
 *
 * Implements critical path requirements for schedule management UI:
 * 1. Data Safety: Input validation
 * 2. User Safety: Time validation
 * 3. System Stability: Error handling
 */

import React, { useState, useEffect } from 'react';
import { Schedule, ScheduleInput } from '../types/schedule';
import { ScheduleService } from '../services/scheduleService';
import { ScheduleValidation, TimeValidation, ErrorHandling } from '../validation/scheduleValidation';

interface ScheduleFormProps {
  userId: number;
  medicationId: number;
  schedule?: Schedule;
  onSubmit: (schedule: Schedule) => void;
  onCancel: () => void;
}

/**
 * Schedule form component
 * Critical Path: User Interface
 */
export const ScheduleForm: React.FC<ScheduleFormProps> = ({
  userId,
  medicationId,
  schedule,
  onSubmit,
  onCancel
}) => {
  // Critical Path: Form State
  const [time, setTime] = useState(schedule?.time || '');
  const [error, setError] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const scheduleService = new ScheduleService();

  /**
   * Handle time change
   * Critical Path: Time Validation
   */
  const handleTimeChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    try {
      const newTime = event.target.value;
      TimeValidation.validateTimeFormat(newTime);
      setTime(newTime);
      setError('');
    } catch (error) {
      setError(ErrorHandling.formatValidationError(error));
    }
  };

  /**
   * Check for conflicts
   * Critical Path: Schedule Safety
   */
  useEffect(() => {
    const checkConflicts = async () => {
      if (time) {
        try {
          const hasConflict = await scheduleService.checkConflicts(userId, time);
          if (hasConflict) {
            setError('Schedule conflicts with existing medication time');
          }
        } catch (error) {
          setError(ErrorHandling.formatValidationError(error));
        }
      }
    };

    checkConflicts();
  }, [time, userId]);

  /**
   * Handle form submission
   * Critical Path: Data Safety
   */
  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    setIsSubmitting(true);
    setError('');

    try {
      const input: ScheduleInput = {
        medication_id: medicationId,
        user_id: userId,
        time
      };

      // Critical Path: Input Validation
      ScheduleValidation.validateScheduleInput(input);

      // Critical Path: Submit Data
      const result = schedule
        ? await scheduleService.updateSchedule(schedule.id, input)
        : await scheduleService.createSchedule(input);

      onSubmit(result);
    } catch (error) {
      setError(ErrorHandling.formatValidationError(error));
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="schedule-form">
      <div className="form-group">
        <label htmlFor="time">Medication Time:</label>
        <input
          type="time"
          id="time"
          value={time}
          onChange={handleTimeChange}
          className={error ? 'error' : ''}
          disabled={isSubmitting}
          required
        />
        {error && <div className="error-message">{error}</div>}
      </div>

      <div className="form-actions">
        <button
          type="submit"
          disabled={isSubmitting || !!error}
          className="submit-button"
        >
          {isSubmitting ? 'Saving...' : schedule ? 'Update Schedule' : 'Create Schedule'}
        </button>
        <button
          type="button"
          onClick={onCancel}
          disabled={isSubmitting}
          className="cancel-button"
        >
          Cancel
        </button>
      </div>
    </form>
  );
};
