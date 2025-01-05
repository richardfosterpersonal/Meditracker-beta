/**
 * Schedule List Component
 * Last Updated: 2024-12-25T20:30:31+01:00
 * Status: BETA
 * Reference: ../../../docs/validation/critical_path/CRITICAL_PATH_STATUS.md
 *
 * Implements critical path requirements for schedule display:
 * 1. Data Safety: Display validation
 * 2. User Safety: Action validation
 * 3. System Stability: Error handling
 */

import React, { useState, useEffect } from 'react';
import { Schedule } from '../types/schedule';
import { ScheduleService } from '../services/scheduleService';
import { ErrorHandling } from '../validation/scheduleValidation';

interface ScheduleListProps {
  userId: number;
  onEdit: (schedule: Schedule) => void;
}

/**
 * Schedule list component
 * Critical Path: User Interface
 */
export const ScheduleList: React.FC<ScheduleListProps> = ({
  userId,
  onEdit
}) => {
  // Critical Path: Component State
  const [schedules, setSchedules] = useState<Schedule[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [processingId, setProcessingId] = useState<number | null>(null);

  const scheduleService = new ScheduleService();

  /**
   * Load schedules
   * Critical Path: Data Safety
   */
  useEffect(() => {
    const loadSchedules = async () => {
      try {
        const data = await scheduleService.listUserSchedules(userId);
        setSchedules(data);
        setError('');
      } catch (error) {
        setError(ErrorHandling.formatValidationError(error));
      } finally {
        setLoading(false);
      }
    };

    loadSchedules();
  }, [userId]);

  /**
   * Handle medication taken
   * Critical Path: User Safety
   */
  const handleMedicationTaken = async (schedule: Schedule) => {
    setProcessingId(schedule.id);
    try {
      const updated = await scheduleService.recordMedicationTaken(schedule.id);
      setSchedules(schedules.map(s => s.id === updated.id ? updated : s));
      setError('');
    } catch (error) {
      setError(ErrorHandling.formatValidationError(error));
    } finally {
      setProcessingId(null);
    }
  };

  /**
   * Handle schedule deletion
   * Critical Path: Data Safety
   */
  const handleDelete = async (schedule: Schedule) => {
    if (!window.confirm('Are you sure you want to delete this schedule?')) {
      return;
    }

    setProcessingId(schedule.id);
    try {
      await scheduleService.deleteSchedule(schedule.id);
      setSchedules(schedules.filter(s => s.id !== schedule.id));
      setError('');
    } catch (error) {
      setError(ErrorHandling.formatValidationError(error));
    } finally {
      setProcessingId(null);
    }
  };

  if (loading) {
    return <div className="loading">Loading schedules...</div>;
  }

  return (
    <div className="schedule-list">
      {error && <div className="error-message">{error}</div>}
      
      {schedules.length === 0 ? (
        <div className="no-schedules">No medication schedules found</div>
      ) : (
        <ul className="schedules">
          {schedules.map(schedule => (
            <li key={schedule.id} className="schedule-item">
              <div className="schedule-time">
                {schedule.time}
              </div>
              
              <div className="schedule-status">
                {schedule.last_taken_at ? (
                  <span className="taken">
                    Last taken: {new Date(schedule.last_taken_at).toLocaleString()}
                  </span>
                ) : (
                  <span className="not-taken">Not taken yet</span>
                )}
              </div>
              
              <div className="schedule-actions">
                <button
                  onClick={() => handleMedicationTaken(schedule)}
                  disabled={processingId === schedule.id}
                  className="take-button"
                >
                  {processingId === schedule.id ? 'Recording...' : 'Take Medication'}
                </button>
                
                <button
                  onClick={() => onEdit(schedule)}
                  disabled={processingId === schedule.id}
                  className="edit-button"
                >
                  Edit
                </button>
                
                <button
                  onClick={() => handleDelete(schedule)}
                  disabled={processingId === schedule.id}
                  className="delete-button"
                >
                  Delete
                </button>
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
};
