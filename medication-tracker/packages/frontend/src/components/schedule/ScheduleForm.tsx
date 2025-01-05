/**
 * Schedule Form Component
 * Last Updated: 2024-12-25T20:41:19+01:00
 * Status: BETA
 * Reference: ../../../../docs/validation/critical_path/MASTER_CRITICAL_PATH.md
 *
 * Implements critical path requirements for schedule management UI:
 * 1. Data Safety: Input validation
 * 2. User Safety: Time validation
 * 3. System Stability: Error handling
 */

import React, { useState, useEffect } from 'react';
import { Schedule, ScheduleInput } from '../../types/schedule';
import { ScheduleService } from '../../services/scheduleService';
import { ScheduleValidation, TimeValidation, ErrorHandling } from '../../validation/scheduleValidation';
import '../../styles/schedule.css';

interface ScheduleFormProps {
  userId: number;
  medicationId: number;
  schedule?: Schedule;
  onSubmit: (schedule: Schedule) => void;
  onCancel: () => void;
}

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
  const [validationStatus, setValidationStatus] = useState<'idle' | 'validating' | 'error' | 'success'>('idle');

  const scheduleService = new ScheduleService();

  // Critical Path: Time Validation
  const handleTimeChange = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const newTime = event.target.value;
    setTime(newTime);
    setValidationStatus('validating');
    
    try {
      // Validate time format
      TimeValidation.validateTimeFormat(newTime);
      
      // Check for conflicts
      const hasConflict = await scheduleService.checkConflicts(userId, newTime);
      if (hasConflict) {
        setError('Schedule conflicts with existing medication time');
        setValidationStatus('error');
      } else {
        setError('');
        setValidationStatus('success');
      }
    } catch (error) {
      setError(ErrorHandling.formatValidationError(error));
      setValidationStatus('error');
    }
  };

  // Critical Path: Form Submission
  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    setIsSubmitting(true);
    setValidationStatus('validating');

    try {
      const input: ScheduleInput = {
        medication_id: medicationId,
        user_id: userId,
        time
      };

      // Validate input
      ScheduleValidation.validateScheduleInput(input);

      // Submit data
      const result = schedule
        ? await scheduleService.updateSchedule(schedule.id, input)
        : await scheduleService.createSchedule(input);

      setValidationStatus('success');
      onSubmit(result);
    } catch (error) {
      setError(ErrorHandling.formatValidationError(error));
      setValidationStatus('error');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="schedule-form">
      <div className={`form-group ${validationStatus === 'error' ? 'has-error' : ''}`}>
        <label htmlFor="time">Medication Time:</label>
        <div className="input-wrapper">
          <input
            type="time"
            id="time"
            value={time}
            onChange={handleTimeChange}
            className={validationStatus}
            disabled={isSubmitting}
            required
          />
          {validationStatus === 'validating' && (
            <div className="validation-indicator">Validating...</div>
          )}
        </div>
        {error && <div className="error-message">{error}</div>}
      </div>

      <div className="form-actions">
        <button
          type="submit"
          disabled={isSubmitting || validationStatus === 'error'}
          className={`submit-button ${isSubmitting ? 'loading' : ''}`}
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
