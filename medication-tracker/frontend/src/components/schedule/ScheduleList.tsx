/**
 * Schedule List Component
 * Last Updated: 2024-12-25T20:41:19+01:00
 * Status: BETA
 * Reference: ../../../../docs/validation/critical_path/MASTER_CRITICAL_PATH.md
 *
 * Implements critical path requirements for schedule display:
 * 1. Data Safety: Display validation
 * 2. User Safety: Action validation
 * 3. System Stability: Error handling
 */

import React, { useState, useEffect } from 'react';
import { Schedule } from '../../types/schedule';
import { ScheduleService } from '../../services/scheduleService';
import { ErrorHandling } from '../../validation/scheduleValidation';
import '../../styles/schedule.css';

interface ScheduleListProps {
  userId: number;
  onEdit: (schedule: Schedule) => void;
}

export const ScheduleList: React.FC<ScheduleListProps> = ({
  userId,
  onEdit
}) => {
  // Critical Path: Component State
  const [schedules, setSchedules] = useState<Schedule[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [processingId, setProcessingId] = useState<number | null>(null);
  const [validationStatus, setValidationStatus] = useState<'idle' | 'validating' | 'error' | 'success'>('idle');

  const scheduleService = new ScheduleService();

  // Critical Path: Data Loading
  useEffect(() => {
    const loadSchedules = async () => {
      setValidationStatus('validating');
      try {
        const data = await scheduleService.listUserSchedules(userId);
        setSchedules(data);
        setError('');
        setValidationStatus('success');
      } catch (error) {
        setError(ErrorHandling.formatValidationError(error));
        setValidationStatus('error');
      } finally {
        setLoading(false);
      }
    };

    loadSchedules();
  }, [userId]);

  // Critical Path: Action Handling
  const handleMedicationTaken = async (schedule: Schedule) => {
    setProcessingId(schedule.id);
    setValidationStatus('validating');
    
    try {
      const updated = await scheduleService.recordMedicationTaken(schedule.id);
      setSchedules(schedules.map(s => s.id === updated.id ? updated : s));
      setError('');
      setValidationStatus('success');
    } catch (error) {
      setError(ErrorHandling.formatValidationError(error));
      setValidationStatus('error');
    } finally {
      setProcessingId(null);
    }
  };

  // Critical Path: Delete Handling
  const handleDelete = async (schedule: Schedule) => {
    if (!window.confirm('Are you sure you want to delete this schedule?')) {
      return;
    }

    setProcessingId(schedule.id);
    setValidationStatus('validating');
    
    try {
      await scheduleService.deleteSchedule(schedule.id);
      setSchedules(schedules.filter(s => s.id !== schedule.id));
      setError('');
      setValidationStatus('success');
    } catch (error) {
      setError(ErrorHandling.formatValidationError(error));
      setValidationStatus('error');
    } finally {
      setProcessingId(null);
    }
  };

  if (loading) {
    return (
      <div className="schedule-list loading">
        <div className="loading-indicator">Loading schedules...</div>
      </div>
    );
  }

  return (
    <div className={`schedule-list ${validationStatus}`}>
      {error && <div className="error-message">{error}</div>}
      
      {schedules.length === 0 ? (
        <div className="no-schedules">
          <div className="empty-state">
            <i className="icon-calendar"></i>
            <p>No medication schedules found</p>
          </div>
        </div>
      ) : (
        <ul className="schedules">
          {schedules.map(schedule => (
            <li key={schedule.id} className={`schedule-item ${processingId === schedule.id ? 'processing' : ''}`}>
              <div className="schedule-time">
                <i className="icon-clock"></i>
                {schedule.time}
              </div>
              
              <div className="schedule-status">
                {schedule.last_taken_at ? (
                  <span className="taken">
                    <i className="icon-check"></i>
                    Last taken: {new Date(schedule.last_taken_at).toLocaleString()}
                  </span>
                ) : (
                  <span className="not-taken">
                    <i className="icon-alert"></i>
                    Not taken yet
                  </span>
                )}
              </div>
              
              <div className="schedule-actions">
                <button
                  onClick={() => handleMedicationTaken(schedule)}
                  disabled={processingId === schedule.id}
                  className="take-button"
                  title="Record medication as taken"
                >
                  <i className="icon-check"></i>
                  {processingId === schedule.id ? 'Recording...' : 'Take Medication'}
                </button>
                
                <button
                  onClick={() => onEdit(schedule)}
                  disabled={processingId === schedule.id}
                  className="edit-button"
                  title="Edit schedule"
                >
                  <i className="icon-edit"></i>
                  Edit
                </button>
                
                <button
                  onClick={() => handleDelete(schedule)}
                  disabled={processingId === schedule.id}
                  className="delete-button"
                  title="Delete schedule"
                >
                  <i className="icon-trash"></i>
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
