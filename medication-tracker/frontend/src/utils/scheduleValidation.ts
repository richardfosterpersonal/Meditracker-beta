import { DateTime } from 'luxon';
import { ErrorCategory, ErrorSeverity } from '../types/errors';
import { ScheduleConfig, ScheduleType, TimeSlot } from '../components/ScheduleBuilder';
import { addMinutes, parseISO, isWithinInterval, format } from 'date-fns';

export class ScheduleValidationError extends Error {
  constructor(
    message: string,
    public category: ErrorCategory = ErrorCategory.SCHEDULE,
    public severity: ErrorSeverity = ErrorSeverity.MEDIUM
  ) {
    super(message);
    this.name = 'ScheduleValidationError';
  }
}

interface ScheduleTime {
  hour: number;
  minute: number;
  timezone?: string;
}

interface MedicationSchedule {
  id: string;
  medicationId: string;
  times: ScheduleTime[];
  startDate: string;
  endDate?: string;
  frequency: 'daily' | 'weekly' | 'monthly';
  daysOfWeek?: number[];
  daysOfMonth?: number[];
  version?: number;
}

interface ValidationError {
  type: 'CONFLICT' | 'INVALID_TIME' | 'EXCEED_DAILY_LIMIT' | 'UNSAFE_INTERVAL';
  message: string;
  details?: any;
}

interface TimeWindow {
  start: Date;
  end: Date;
  dose: number;
}

export function validateScheduleTime(time: ScheduleTime): void {
  // Validate basic time values
  if (time.hour < 0 || time.hour > 23) {
    throw new ScheduleValidationError(
      'Hour must be between 0 and 23',
      ErrorCategory.SCHEDULE,
      ErrorSeverity.HIGH
    );
  }
  if (time.minute < 0 || time.minute > 59) {
    throw new ScheduleValidationError(
      'Minute must be between 0 and 59',
      ErrorCategory.SCHEDULE,
      ErrorSeverity.HIGH
    );
  }

  // Enhanced timezone validation
  if (time.timezone) {
    if (!isValidTimezone(time.timezone)) {
      throw new ScheduleValidationError(
        'Invalid timezone specified',
        ErrorCategory.SCHEDULE,
        ErrorSeverity.HIGH
      );
    }
    
    // Check for DST transitions
    const dt = DateTime.fromObject({ hour: time.hour, minute: time.minute }, { zone: time.timezone });
    if (!dt.isValid) {
      throw new ScheduleValidationError(
        'Invalid time during DST transition',
        ErrorCategory.SCHEDULE,
        ErrorSeverity.HIGH
      );
    }
  }
}

export function validateScheduleDates(startDate: string, endDate?: string): void {
  const start = DateTime.fromISO(startDate);
  if (!start.isValid) {
    throw new ScheduleValidationError(
      'Invalid start date format',
      ErrorCategory.SCHEDULE,
      ErrorSeverity.HIGH
    );
  }

  // Ensure start date is not in the past
  const now = DateTime.now().startOf('day');
  if (start < now) {
    throw new ScheduleValidationError(
      'Start date cannot be in the past',
      ErrorCategory.SCHEDULE,
      ErrorSeverity.MEDIUM
    );
  }

  if (endDate) {
    const end = DateTime.fromISO(endDate);
    if (!end.isValid) {
      throw new ScheduleValidationError(
        'Invalid end date format',
        ErrorCategory.SCHEDULE,
        ErrorSeverity.HIGH
      );
    }
    if (end < start) {
      throw new ScheduleValidationError(
        'End date cannot be before start date',
        ErrorCategory.SCHEDULE,
        ErrorSeverity.HIGH
      );
    }

    // Validate reasonable date range (e.g., not more than 2 years)
    const maxDuration = DateTime.fromISO(startDate).plus({ years: 2 });
    if (end > maxDuration) {
      throw new ScheduleValidationError(
        'Schedule duration cannot exceed 2 years',
        ErrorCategory.SCHEDULE,
        ErrorSeverity.MEDIUM
      );
    }
  }
}

export function validateFrequency(
  frequency: string,
  daysOfWeek?: number[],
  daysOfMonth?: number[]
): void {
  switch (frequency) {
    case 'daily':
      if (daysOfWeek || daysOfMonth) {
        throw new ScheduleValidationError(
          'Daily frequency should not specify days of week or month',
          ErrorCategory.SCHEDULE,
          ErrorSeverity.MEDIUM
        );
      }
      break;

    case 'weekly':
      if (!daysOfWeek?.length) {
        throw new ScheduleValidationError(
          'Weekly frequency requires at least one day of week',
          ErrorCategory.SCHEDULE,
          ErrorSeverity.HIGH
        );
      }
      if (daysOfWeek.some(day => day < 0 || day > 6)) {
        throw new ScheduleValidationError(
          'Days of week must be between 0 (Sunday) and 6 (Saturday)',
          ErrorCategory.SCHEDULE,
          ErrorSeverity.HIGH
        );
      }
      if (new Set(daysOfWeek).size !== daysOfWeek.length) {
        throw new ScheduleValidationError(
          'Duplicate days of week are not allowed',
          ErrorCategory.SCHEDULE,
          ErrorSeverity.MEDIUM
        );
      }
      break;

    case 'monthly':
      if (!daysOfMonth?.length) {
        throw new ScheduleValidationError(
          'Monthly frequency requires at least one day of month',
          ErrorCategory.SCHEDULE,
          ErrorSeverity.HIGH
        );
      }
      if (daysOfMonth.some(day => day < 1 || day > 31)) {
        throw new ScheduleValidationError(
          'Days of month must be between 1 and 31',
          ErrorCategory.SCHEDULE,
          ErrorSeverity.HIGH
        );
      }
      if (new Set(daysOfMonth).size !== daysOfMonth.length) {
        throw new ScheduleValidationError(
          'Duplicate days of month are not allowed',
          ErrorCategory.SCHEDULE,
          ErrorSeverity.MEDIUM
        );
      }
      break;

    default:
      throw new ScheduleValidationError(
        'Invalid frequency. Must be daily, weekly, or monthly',
        ErrorCategory.SCHEDULE,
        ErrorSeverity.HIGH
      );
  }
}

export function validateSchedule(schedule: MedicationSchedule): void {
  // Validate all times
  schedule.times.forEach(validateScheduleTime);
  
  // Validate dates
  validateScheduleDates(schedule.startDate, schedule.endDate);
  
  // Validate frequency and associated days
  validateFrequency(
    schedule.frequency,
    schedule.daysOfWeek,
    schedule.daysOfMonth
  );
  
  // Check for duplicate times
  const timeStrings = schedule.times.map(t => `${t.hour}:${t.minute}`);
  const uniqueTimes = new Set(timeStrings);
  if (uniqueTimes.size !== timeStrings.length) {
    throw new ScheduleValidationError(
      'Duplicate times are not allowed',
      ErrorCategory.SCHEDULE,
      ErrorSeverity.MEDIUM
    );
  }

  // Validate minimum time between doses
  const sortedTimes = [...schedule.times].sort((a, b) => {
    const aMinutes = a.hour * 60 + a.minute;
    const bMinutes = b.hour * 60 + b.minute;
    return aMinutes - bMinutes;
  });

  for (let i = 1; i < sortedTimes.length; i++) {
    const prevTime = sortedTimes[i - 1];
    const currTime = sortedTimes[i];
    const prevMinutes = prevTime.hour * 60 + prevTime.minute;
    const currMinutes = currTime.hour * 60 + currTime.minute;
    const timeDiff = currMinutes - prevMinutes;

    if (timeDiff < 60) { // Minimum 1 hour between doses
      throw new ScheduleValidationError(
        'Doses must be at least 1 hour apart',
        ErrorCategory.SCHEDULE,
        ErrorSeverity.HIGH
      );
    }
  }
}

export function normalizeToUTC(time: ScheduleTime): DateTime {
  const now = DateTime.now();
  const scheduleDateTime = DateTime.fromObject(
    {
      year: now.year,
      month: now.month,
      day: now.day,
      hour: time.hour,
      minute: time.minute
    },
    {
      zone: time.timezone || 'local'
    }
  );
  
  if (!scheduleDateTime.isValid) {
    throw new ScheduleValidationError(
      'Invalid datetime during timezone conversion',
      ErrorCategory.SCHEDULE,
      ErrorSeverity.HIGH
    );
  }
  
  return scheduleDateTime.toUTC();
}

export function isValidTimezone(timezone: string): boolean {
  try {
    const dt = DateTime.local().setZone(timezone);
    return dt.isValid && dt.zoneName === timezone;
  } catch {
    return false;
  }
}

export function getNextOccurrence(
  schedule: MedicationSchedule,
  fromTime: DateTime = DateTime.now()
): DateTime | null {
  const times = schedule.times.map(t => normalizeToUTC(t));
  let nextOccurrence: DateTime | null = null;

  switch (schedule.frequency) {
    case 'daily':
      nextOccurrence = findNextDailyOccurrence(times, fromTime);
      break;
    case 'weekly':
      nextOccurrence = findNextWeeklyOccurrence(times, schedule.daysOfWeek!, fromTime);
      break;
    case 'monthly':
      nextOccurrence = findNextMonthlyOccurrence(times, schedule.daysOfMonth!, fromTime);
      break;
  }

  return nextOccurrence;
}

function findNextDailyOccurrence(times: DateTime[], fromTime: DateTime): DateTime | null {
  return times
    .map(t => alignDateTime(t, fromTime))
    .filter(t => t > fromTime)
    .sort((a, b) => a.toMillis() - b.toMillis())[0] || null;
}

function findNextWeeklyOccurrence(
  times: DateTime[],
  daysOfWeek: number[],
  fromTime: DateTime
): DateTime | null {
  let candidate = fromTime;
  while (!daysOfWeek.includes(candidate.weekday % 7)) {
    candidate = candidate.plus({ days: 1 });
  }
  return findNextDailyOccurrence(times, candidate);
}

function findNextMonthlyOccurrence(
  times: DateTime[],
  daysOfMonth: number[],
  fromTime: DateTime
): DateTime | null {
  let candidate = fromTime;
  while (!daysOfMonth.includes(candidate.day)) {
    candidate = candidate.plus({ days: 1 });
    if (candidate.day === 1) { // Wrapped to next month
      // If no valid days in this month, move to first valid day of next month
      candidate = candidate.set({ day: Math.min(...daysOfMonth) });
    }
  }
  return findNextDailyOccurrence(times, candidate);
}

function alignDateTime(time: DateTime, reference: DateTime): DateTime {
  return reference.set({
    hour: time.hour,
    minute: time.minute,
    second: 0,
    millisecond: 0
  });
}

export function validateScheduleConfig(schedule: ScheduleConfig): ValidationError[] {
  const errors: ValidationError[] = [];

  switch (schedule.type) {
    case ScheduleType.FIXED_TIME:
      errors.push(...validateFixedTimeSchedule(schedule.fixedTimeSlots || []));
      break;
    case ScheduleType.INTERVAL:
      errors.push(...validateIntervalSchedule(schedule.interval));
      break;
    case ScheduleType.PRN:
      errors.push(...validatePRNSchedule(schedule.prn));
      break;
    case ScheduleType.CYCLIC:
      errors.push(...validateCyclicSchedule(schedule.cyclic));
      break;
    case ScheduleType.TAPERED:
      errors.push(...validateTaperedSchedule(schedule.tapered));
      break;
  }

  return errors;
}

export function detectConflicts(
  schedules: ScheduleConfig[],
  newSchedule: ScheduleConfig
): ValidationError[] {
  const timeWindows = getAllTimeWindows(schedules);
  const newTimeWindows = getScheduleTimeWindows(newSchedule);
  
  return findConflictingWindows(timeWindows, newTimeWindows);
}

function validateFixedTimeSchedule(slots: TimeSlot[]): ValidationError[] {
  const errors: ValidationError[] = [];
  
  // Check for minimum 30-minute spacing
  for (let i = 0; i < slots.length; i++) {
    for (let j = i + 1; j < slots.length; j++) {
      const time1 = parseISO(`2000-01-01T${slots[i].time}`);
      const time2 = parseISO(`2000-01-01T${slots[j].time}`);
      const diffInMinutes = Math.abs(time2.getTime() - time1.getTime()) / 60000;
      
      if (diffInMinutes < 30) {
        errors.push({
          type: 'UNSAFE_INTERVAL',
          message: `Doses must be at least 30 minutes apart. Found ${slots[i].time} and ${slots[j].time}`,
        });
      }
    }
  }
  
  return errors;
}

function validateIntervalSchedule(interval?: { hours: number; dose: number }): ValidationError[] {
  const errors: ValidationError[] = [];
  
  if (!interval) return errors;
  
  if (interval.hours < 4) {
    errors.push({
      type: 'UNSAFE_INTERVAL',
      message: 'Interval must be at least 4 hours between doses',
    });
  }
  
  if (24 % interval.hours !== 0) {
    errors.push({
      type: 'INVALID_TIME',
      message: 'Interval must divide evenly into 24 hours for consistent daily scheduling',
    });
  }
  
  return errors;
}

function validatePRNSchedule(prn?: { maxDailyDose: number; minHoursBetween: number; dose: number }): ValidationError[] {
  const errors: ValidationError[] = [];
  
  if (!prn) return errors;
  
  if (prn.minHoursBetween < 4) {
    errors.push({
      type: 'UNSAFE_INTERVAL',
      message: 'Minimum time between PRN doses must be at least 4 hours',
    });
  }
  
  if (prn.maxDailyDose > prn.dose * 6) {
    errors.push({
      type: 'EXCEED_DAILY_LIMIT',
      message: 'Maximum daily dose exceeds safe limits',
    });
  }
  
  return errors;
}

function validateCyclicSchedule(cyclic?: { daysOn: number; daysOff: number; dose: number }): ValidationError[] {
  const errors: ValidationError[] = [];
  
  if (!cyclic) return errors;
  
  if (cyclic.daysOn < 1 || cyclic.daysOff < 1) {
    errors.push({
      type: 'INVALID_TIME',
      message: 'Both "days on" and "days off" must be at least 1',
    });
  }
  
  return errors;
}

function validateTaperedSchedule(tapered?: { startDose: number; endDose: number; days: number; steps: number }): ValidationError[] {
  const errors: ValidationError[] = [];
  
  if (!tapered) return errors;
  
  if (tapered.days < tapered.steps) {
    errors.push({
      type: 'INVALID_TIME',
      message: 'Number of days must be greater than or equal to number of steps',
    });
  }
  
  if (tapered.days % tapered.steps !== 0) {
    errors.push({
      type: 'INVALID_TIME',
      message: 'Days must be evenly divisible by steps for consistent tapering',
    });
  }
  
  return errors;
}

function getAllTimeWindows(schedules: ScheduleConfig[]): TimeWindow[] {
  return schedules.flatMap(getScheduleTimeWindows);
}

function getScheduleTimeWindows(schedule: ScheduleConfig): TimeWindow[] {
  const windows: TimeWindow[] = [];
  const baseDate = new Date(2000, 0, 1); // Use a fixed date for time comparison
  
  switch (schedule.type) {
    case ScheduleType.FIXED_TIME:
      schedule.fixedTimeSlots?.forEach(slot => {
        const time = parseISO(`2000-01-01T${slot.time}`);
        windows.push({
          start: addMinutes(time, -15),
          end: addMinutes(time, 15),
          dose: slot.dose
        });
      });
      break;
      
    case ScheduleType.INTERVAL:
      if (schedule.interval) {
        const intervalsPerDay = 24 / schedule.interval.hours;
        for (let i = 0; i < intervalsPerDay; i++) {
          const time = addMinutes(baseDate, i * schedule.interval.hours * 60);
          windows.push({
            start: addMinutes(time, -15),
            end: addMinutes(time, 15),
            dose: schedule.interval.dose
          });
        }
      }
      break;
  }
  
  return windows;
}

function findConflictingWindows(existing: TimeWindow[], new_: TimeWindow[]): ValidationError[] {
  const errors: ValidationError[] = [];
  
  new_.forEach(newWindow => {
    existing.forEach(existingWindow => {
      if (
        isWithinInterval(newWindow.start, { start: existingWindow.start, end: existingWindow.end }) ||
        isWithinInterval(newWindow.end, { start: existingWindow.start, end: existingWindow.end })
      ) {
        errors.push({
          type: 'CONFLICT',
          message: `Schedule conflict at ${format(newWindow.start, 'HH:mm')}`,
          details: {
            newDose: newWindow,
            existingDose: existingWindow
          }
        });
      }
    });
  });
  
  return errors;
}
