import React, { useEffect, useState } from 'react';
import { format } from 'date-fns';
import { Medication, Schedule } from '../../../shared/types';
import { useMedicationSchedule } from '../hooks/useMedicationSchedule';
import { useNotifications } from '../hooks/useNotifications';

interface Props {
  userId: string;
}

export const MedicationScheduleManager: React.FC<Props> = ({ userId }) => {
  const {
    medications,
    loading: medicationLoading,
    error: medicationError,
    markMedicationTaken,
    addMedicationSchedule,
    updateMedicationSchedule,
    removeMedicationSchedule,
  } = useMedicationSchedule();

  const {
    showNotification,
    sendNotification,
  } = useNotifications();

  const [selectedMedication, setSelectedMedication] = useState<Medication | null>(null);
  const [isEditing, setIsEditing] = useState(false);

  // Schedule monitoring
  useEffect(() => {
    const checkSchedule = () => {
      const now = new Date();
      const currentTime = format(now, 'HH:mm');

      medications.forEach(medication => {
        const { schedule } = medication;
        if (shouldTakeMedication(schedule, now)) {
          sendNotification({
            type: 'MEDICATION_ALERT',
            priority: 'HIGH',
            message: `Time to take ${medication.name}`,
            data: {
              medicationId: medication.id,
              dosage: medication.dosage,
              instructions: medication.instructions,
            },
          });
        }
      });
    };

    // Check schedule every minute
    const interval = setInterval(checkSchedule, 60000);
    return () => clearInterval(interval);
  }, [medications, sendNotification]);

  const shouldTakeMedication = (schedule: Schedule, now: Date): boolean => {
    const currentTime = format(now, 'HH:mm');
    const dayOfWeek = now.getDay();
    const dayOfMonth = now.getDate();

    // Check if medication is active
    const startDate = new Date(schedule.startDate);
    if (startDate > now) return false;

    if (schedule.endDate) {
      const endDate = new Date(schedule.endDate);
      if (endDate < now) return false;
    }

    // Check if current time matches any scheduled time
    if (!schedule.times.includes(currentTime)) return false;

    switch (schedule.type) {
      case 'daily':
        return true;
      case 'weekly':
        return schedule.days?.includes(dayOfWeek) ?? false;
      case 'monthly':
        return schedule.days?.includes(dayOfMonth) ?? false;
      case 'custom':
        if (!schedule.interval) return false;
        const diffDays = Math.floor((now.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24));
        return diffDays % schedule.interval === 0;
      default:
        return false;
    }
  };

  const handleMedicationTaken = async (medicationId: string) => {
    try {
      await markMedicationTaken(medicationId);
    } catch (error) {
      showNotification({
        type: 'error',
        message: 'Failed to mark medication as taken',
      });
    }
  };

  const handleScheduleUpdate = async (medicationId: string, newSchedule: Schedule) => {
    try {
      await updateMedicationSchedule(medicationId, newSchedule);
      setIsEditing(false);
      setSelectedMedication(null);
    } catch (error) {
      showNotification({
        type: 'error',
        message: 'Failed to update medication schedule',
      });
    }
  };

  const handleScheduleRemove = async (medicationId: string) => {
    try {
      await removeMedicationSchedule(medicationId);
      showNotification({
        type: 'success',
        message: 'Medication schedule removed successfully',
      });
    } catch (error) {
      showNotification({
        type: 'error',
        message: 'Failed to remove medication schedule',
      });
    }
  };

  if (medicationLoading) {
    return <div>Loading...</div>;
  }

  if (medicationError) {
    return <div>Error: {medicationError.message}</div>;
  }

  return (
    <div className="medication-schedule-manager">
      <h2>Medication Schedule</h2>
      
      <div className="medication-list">
        {medications.map(medication => (
          <div key={medication.id} className="medication-item">
            <div className="medication-info">
              <h3>{medication.name}</h3>
              <p>Dosage: {medication.dosage.amount} {medication.dosage.unit}</p>
              <p>Next scheduled: {getNextScheduledTime(medication.schedule)}</p>
            </div>
            
            <div className="medication-actions">
              <button
                onClick={() => handleMedicationTaken(medication.id)}
                className="take-button"
              >
                Mark as Taken
              </button>
              
              <button
                onClick={() => {
                  setSelectedMedication(medication);
                  setIsEditing(true);
                }}
                className="edit-button"
              >
                Edit Schedule
              </button>
              
              <button
                onClick={() => handleScheduleRemove(medication.id)}
                className="remove-button"
              >
                Remove
              </button>
            </div>
          </div>
        ))}
      </div>

      {isEditing && selectedMedication && (
        <ScheduleEditor
          medication={selectedMedication}
          onSave={(schedule) => handleScheduleUpdate(selectedMedication.id, schedule)}
          onCancel={() => {
            setIsEditing(false);
            setSelectedMedication(null);
          }}
        />
      )}
    </div>
  );
};

const getNextScheduledTime = (schedule: Schedule): string => {
  const now = new Date();
  const currentTime = format(now, 'HH:mm');
  
  // Find the next scheduled time today
  const todayTimes = schedule.times.filter(time => time > currentTime);
  if (todayTimes.length > 0) {
    return `Today at ${todayTimes[0]}`;
  }
  
  // If no more times today, return the first time tomorrow
  return `Tomorrow at ${schedule.times[0]}`;
};

interface ScheduleEditorProps {
  medication: Medication;
  onSave: (schedule: Schedule) => void;
  onCancel: () => void;
}

const ScheduleEditor: React.FC<ScheduleEditorProps> = ({
  medication,
  onSave,
  onCancel,
}) => {
  const [schedule, setSchedule] = useState<Schedule>(medication.schedule);

  return (
    <div className="schedule-editor">
      <h3>Edit Schedule for {medication.name}</h3>
      
      <div className="form-group">
        <label>Schedule Type</label>
        <select
          value={schedule.type}
          onChange={(e) => setSchedule({ ...schedule, type: e.target.value as Schedule['type'] })}
        >
          <option value="daily">Daily</option>
          <option value="weekly">Weekly</option>
          <option value="monthly">Monthly</option>
          <option value="custom">Custom</option>
        </select>
      </div>

      <div className="form-group">
        <label>Times</label>
        {schedule.times.map((time, index) => (
          <div key={index} className="time-input">
            <input
              type="time"
              value={time}
              onChange={(e) => {
                const newTimes = [...schedule.times];
                newTimes[index] = e.target.value;
                setSchedule({ ...schedule, times: newTimes });
              }}
            />
            <button onClick={() => {
              setSchedule({
                ...schedule,
                times: schedule.times.filter((_, i) => i !== index)
              });
            }}>Remove</button>
          </div>
        ))}
        <button onClick={() => {
          setSchedule({
            ...schedule,
            times: [...schedule.times, '12:00']
          });
        }}>Add Time</button>
      </div>

      {(schedule.type === 'weekly' || schedule.type === 'monthly') && (
        <div className="form-group">
          <label>Days</label>
          <div className="days-selector">
            {Array.from({ length: schedule.type === 'weekly' ? 7 : 31 }, (_, i) => (
              <label key={i}>
                <input
                  type="checkbox"
                  checked={schedule.days?.includes(i) ?? false}
                  onChange={(e) => {
                    const days = schedule.days ?? [];
                    if (e.target.checked) {
                      setSchedule({
                        ...schedule,
                        days: [...days, i].sort((a, b) => a - b)
                      });
                    } else {
                      setSchedule({
                        ...schedule,
                        days: days.filter(d => d !== i)
                      });
                    }
                  }}
                />
                {schedule.type === 'weekly'
                  ? ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'][i]
                  : i + 1}
              </label>
            ))}
          </div>
        </div>
      )}

      {schedule.type === 'custom' && (
        <div className="form-group">
          <label>Interval (days)</label>
          <input
            type="number"
            min="1"
            value={schedule.interval ?? 1}
            onChange={(e) => setSchedule({
              ...schedule,
              interval: parseInt(e.target.value)
            })}
          />
        </div>
      )}

      <div className="form-group">
        <label>Start Date</label>
        <input
          type="date"
          value={schedule.startDate.split('T')[0]}
          onChange={(e) => setSchedule({
            ...schedule,
            startDate: new Date(e.target.value).toISOString()
          })}
        />
      </div>

      <div className="form-group">
        <label>End Date (optional)</label>
        <input
          type="date"
          value={schedule.endDate?.split('T')[0] ?? ''}
          onChange={(e) => setSchedule({
            ...schedule,
            endDate: e.target.value ? new Date(e.target.value).toISOString() : undefined
          })}
        />
      </div>

      <div className="button-group">
        <button onClick={() => onSave(schedule)} className="save-button">
          Save Changes
        </button>
        <button onClick={onCancel} className="cancel-button">
          Cancel
        </button>
      </div>
    </div>
  );
};
