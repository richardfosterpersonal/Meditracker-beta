interface ScheduleTime {
  hour: number;
  minute: number;
  daysOfWeek: number[];
}

interface MedicationSchedule {
  id: string;
  medicationId: string;
  times: ScheduleTime[];
  startDate: string;
  endDate?: string;
  isRecurring: boolean;
  frequency?: 'daily' | 'weekly' | 'monthly';
  interval?: number;
  daysOfWeek?: number[];
  daysOfMonth?: number[];
}

interface ScheduleConflict {
  medicationId: string;
  medicationName: string;
  conflictingTime: Date;
  conflictType: 'overlap' | 'tooClose' | 'interaction';
  severity: 'low' | 'medium' | 'high';
  description: string;
}

interface ScheduleExport {
  version: string;
  schedules: MedicationSchedule[];
  metadata: {
    exportDate: string;
    patientId: string;
    totalMedications: number;
  };
}

interface Medication {
  id: string;
  name: string;
}

export const calculateNextDose = (schedule: MedicationSchedule): Date | null => {
  const now = new Date();
  let nextDose: Date | null = null;

  // For each scheduled time
  for (const time of schedule.times) {
    const today = new Date();
    today.setHours(time.hour, time.minute, 0, 0);

    // If it's still earlier today
    if (today > now) {
      // For daily schedule, or if it's a matching day for weekly/monthly
      if (
        schedule.frequency === 'daily' ||
        (schedule.frequency === 'weekly' &&
          schedule.daysOfWeek?.includes(today.getDay())) ||
        (schedule.frequency === 'monthly' &&
          schedule.daysOfMonth?.includes(today.getDate()))
      ) {
        if (!nextDose || today < nextDose) {
          nextDose = today;
        }
      }
    }
  }

  // If no dose found today, look for next valid day
  if (!nextDose) {
    let checkDate = new Date(now);
    checkDate.setDate(checkDate.getDate() + 1);
    
    // Look ahead up to 31 days
    for (let i = 0; i < 31; i++) {
      for (const time of schedule.times) {
        checkDate.setHours(time.hour, time.minute, 0, 0);

        if (
          schedule.frequency === 'daily' ||
          (schedule.frequency === 'weekly' &&
            schedule.daysOfWeek?.includes(checkDate.getDay())) ||
          (schedule.frequency === 'monthly' &&
            schedule.daysOfMonth?.includes(checkDate.getDate()))
        ) {
          if (!nextDose || checkDate < nextDose) {
            nextDose = new Date(checkDate);
          }
        }
      }

      if (nextDose) break;
      checkDate.setDate(checkDate.getDate() + 1);
    }
  }

  return nextDose;
};

export const isDoseTime = (
  schedule: MedicationSchedule,
  tolerance: number = 15
): boolean => {
  const now = new Date();
  const nextDose = calculateNextDose(schedule);

  if (!nextDose) return false;

  const diffMinutes = Math.abs(now.getTime() - nextDose.getTime()) / (1000 * 60);
  return diffMinutes <= tolerance;
};

export const getUpcomingDoses = (
  schedule: MedicationSchedule,
  days: number = 7
): Date[] => {
  const doses: Date[] = [];
  let currentDate = new Date();
  const endDate = new Date();
  endDate.setDate(endDate.getDate() + days);

  while (currentDate < endDate) {
    for (const time of schedule.times) {
      const doseTime = new Date(currentDate);
      doseTime.setHours(time.hour, time.minute, 0, 0);

      if (
        schedule.frequency === 'daily' ||
        (schedule.frequency === 'weekly' &&
          schedule.daysOfWeek?.includes(doseTime.getDay())) ||
        (schedule.frequency === 'monthly' &&
          schedule.daysOfMonth?.includes(doseTime.getDate()))
      ) {
        if (doseTime > new Date()) {
          doses.push(new Date(doseTime));
        }
      }
    }
    currentDate.setDate(currentDate.getDate() + 1);
  }

  return doses.sort((a, b) => a.getTime() - b.getTime());
};

export const formatScheduleDescription = (schedule: MedicationSchedule): string => {
  const times = schedule.times
    .map(t => `${String(t.hour).padStart(2, '0')}:${String(t.minute).padStart(2, '0')}`)
    .join(', ');

  const daysOfWeek = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
  let description = '';

  switch (schedule.frequency) {
    case 'daily':
      description = `Daily at ${times}`;
      break;
    case 'weekly':
      const days = schedule.daysOfWeek
        ?.map(d => daysOfWeek[d])
        .join(', ');
      description = `Every ${days} at ${times}`;
      break;
    case 'monthly':
      const dates = schedule.daysOfMonth
        ?.map(d => `${d}${getOrdinalSuffix(d)}`)
        .join(', ');
      description = `Monthly on the ${dates} at ${times}`;
      break;
    default:
      description = `At ${times}`;
  }

  return description;
};

const getOrdinalSuffix = (day: number): string => {
  if (day > 3 && day < 21) return 'th';
  switch (day % 10) {
    case 1:
      return 'st';
    case 2:
      return 'nd';
    case 3:
      return 'rd';
    default:
      return 'th';
  }
};

export const detectScheduleConflicts = (
  newSchedule: MedicationSchedule,
  existingSchedules: MedicationSchedule[],
  medications: Medication[],
  minimumGap: number = 60 // minimum minutes between medications
): ScheduleConflict[] => {
  const conflicts: ScheduleConflict[] = [];
  const nextWeekDoses = getUpcomingDoses(newSchedule, 7);

  // Get all doses for existing schedules
  const existingDoses = existingSchedules.flatMap(schedule => {
    const doses = getUpcomingDoses(schedule, 7);
    return doses.map(dose => ({
      dose,
      medicationId: schedule.medicationId,
      medicationName: medications.find(m => m.id === schedule.medicationId)?.name || 'Unknown'
    }));
  });

  // Check each new dose against existing doses
  for (const newDose of nextWeekDoses) {
    for (const existing of existingDoses) {
      const timeDiff = Math.abs(newDose.getTime() - existing.dose.getTime()) / (1000 * 60);

      // Check for timing conflicts
      if (timeDiff < minimumGap) {
        conflicts.push({
          medicationId: existing.medicationId,
          medicationName: existing.medicationName,
          conflictingTime: newDose,
          conflictType: timeDiff === 0 ? 'overlap' : 'tooClose',
          severity: timeDiff === 0 ? 'high' : 'medium',
          description: timeDiff === 0
            ? `Conflicts with ${existing.medicationName} at the same time`
            : `Too close to ${existing.medicationName} (${Math.round(timeDiff)} minutes apart)`
        });
      }

      // Check for medication interactions
      const newMed = medications.find(m => m.id === newSchedule.medicationId);
      const existingMed = medications.find(m => m.id === existing.medicationId);
      
      if (newMed && existingMed && hasInteraction(newMed, existingMed)) {
        conflicts.push({
          medicationId: existing.medicationId,
          medicationName: existing.medicationName,
          conflictingTime: newDose,
          conflictType: 'interaction',
          severity: 'high',
          description: `Potential interaction with ${existing.medicationName}`
        });
      }
    }
  }

  return conflicts;
};

const hasInteraction = (med1: Medication, med2: Medication): boolean => {
  // Implementation would depend on medication interaction database
  // This is a placeholder for the interaction check logic
  return false;
};

export const exportSchedules = async (
  schedules: MedicationSchedule[],
  patientId: string
): Promise<ScheduleExport> => {
  const exportData: ScheduleExport = {
    version: '1.0',
    schedules,
    metadata: {
      exportDate: new Date().toISOString(),
      patientId,
      totalMedications: schedules.length
    }
  };

  return exportData;
};

export const importSchedules = async (
  importData: ScheduleExport,
  validateOnly: boolean = false
): Promise<{ success: boolean; conflicts: ScheduleConflict[]; schedules: MedicationSchedule[] }> => {
  try {
    // Validate import data structure
    if (!importData.version || !importData.schedules || !importData.metadata) {
      throw new Error('Invalid import data structure');
    }

    // Get existing schedules for conflict checking
    const existingSchedules = await api.get('/api/v1/medications/schedules').then(res => res.data);
    const medications = await api.get('/api/v1/medications').then(res => res.data);

    // Check for conflicts
    const allConflicts: ScheduleConflict[] = [];
    for (const schedule of importData.schedules) {
      const conflicts = detectScheduleConflicts(schedule, existingSchedules, medications);
      allConflicts.push(...conflicts);
    }

    if (validateOnly) {
      return {
        success: allConflicts.length === 0,
        conflicts: allConflicts,
        schedules: importData.schedules
      };
    }

    // If no conflicts or user accepts conflicts, proceed with import
    if (allConflicts.length === 0) {
      // Import schedules
      for (const schedule of importData.schedules) {
        await api.post('/api/v1/medications/schedules', schedule);
      }
    }

    return {
      success: true,
      conflicts: allConflicts,
      schedules: importData.schedules
    };
  } catch (error) {
    console.error('Error importing schedules:', error);
    throw error;
  }
};

export const generateRecurringSchedule = (
  baseSchedule: MedicationSchedule,
  options: {
    alternatingDays?: boolean;
    skipWeekends?: boolean;
    specificWeeks?: number[];
    daysInterval?: number;
  }
): MedicationSchedule => {
  const schedule = { ...baseSchedule };

  if (options.alternatingDays) {
    schedule.daysOfWeek = schedule.daysOfWeek?.filter((_, index) => index % 2 === 0);
  }

  if (options.skipWeekends) {
    schedule.daysOfWeek = schedule.daysOfWeek?.filter(day => day !== 0 && day !== 6);
  }

  if (options.specificWeeks) {
    schedule.daysOfMonth = schedule.daysOfMonth?.filter(day => 
      options.specificWeeks?.includes(Math.ceil(day / 7))
    );
  }

  if (options.daysInterval) {
    const allDays = Array.from({ length: 31 }, (_, i) => i + 1);
    schedule.daysOfMonth = allDays.filter(day => day % options.daysInterval! === 0);
  }

  return schedule;
};

export const validateSchedule = (schedule: MedicationSchedule): { valid: boolean; errors: string[] } => {
  const errors: string[] = [];

  // Check for required fields
  if (!schedule.medicationId) {
    errors.push('Medication ID is required');
  }

  if (!schedule.times || schedule.times.length === 0) {
    errors.push('At least one time must be specified');
  }

  // Validate times
  schedule.times.forEach((time, index) => {
    if (time.hour < 0 || time.hour > 23) {
      errors.push(`Invalid hour for time #${index + 1}`);
    }
    if (time.minute < 0 || time.minute > 59) {
      errors.push(`Invalid minute for time #${index + 1}`);
    }
  });

  // Validate frequency settings
  if (schedule.frequency === 'weekly' && (!schedule.daysOfWeek || schedule.daysOfWeek.length === 0)) {
    errors.push('Days of week must be specified for weekly frequency');
  }

  if (schedule.frequency === 'monthly' && (!schedule.daysOfMonth || schedule.daysOfMonth.length === 0)) {
    errors.push('Days of month must be specified for monthly frequency');
  }

  // Validate date range
  if (schedule.startDate && schedule.endDate) {
    const start = new Date(schedule.startDate);
    const end = new Date(schedule.endDate);
    if (end < start) {
      errors.push('End date cannot be before start date');
    }
  }

  return {
    valid: errors.length === 0,
    errors
  };
};
