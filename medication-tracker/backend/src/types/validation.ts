import { DosageUnit } from '@/types/medication.js';

export enum TimeOfDay {
  MORNING = 'morning',
  NOON = 'noon',
  AFTERNOON = 'afternoon',
  EVENING = 'evening',
  BEDTIME = 'bedtime'
}

export interface TimeWindow {
  start: string; // HH:mm format
  end: string;   // HH:mm format
}

export interface DosageFrequencyRule {
  timeUnit: 'minute' | '15_minutes' | '30_minutes' | 'hour' | 'day' | 'week';
  maxDoses: number;
  minInterval?: number; // Minimum time between doses in minutes
}

export interface DosageValidationRule {
  unit: DosageUnit;
  minValue: number;
  maxValue: number;
  increment: number;
  requiresDoubleCheck: boolean;
}

export interface TimeBasedRule {
  timeOfDay: TimeOfDay;
  window: TimeWindow;
  preferredTime: string; // HH:mm format
  flexibility: number;   // Minutes of flexibility around preferred time
}

export interface ValidationResult {
  isValid: boolean;
  errors: ValidationError[];
  warnings: ValidationWarning[];
}

export interface ValidationError {
  code: string;
  message: string;
  details?: Record<string, any>;
}

export interface ValidationWarning {
  code: string;
  message: string;
  details?: Record<string, any>;
}

export interface DosageSchedule {
  medicationId: string;
  dosageAmount: number;
  dosageUnit: DosageUnit;
  frequency: number;
  timeWindows: TimeWindow[];
  preferredTimes?: string[];  // HH:mm format
  flexibility?: number;       // Minutes of flexibility
}

export interface FrequencyValidationOptions {
  checkTimeWindows: boolean;
  enforcePreferredTimes: boolean;
  allowFlexibility: boolean;
  considerOtherMedications: boolean;
}

// Constants for validation rules
export const VALIDATION_CONSTANTS = {
  MAX_DAILY_DOSES: 24,
  MIN_DOSE_INTERVAL_MINUTES: 15,
  DEFAULT_FLEXIBILITY_MINUTES: 30,
  MAX_FLEXIBILITY_MINUTES: 120,
  PREFERRED_TIME_FORMAT: 'HH:mm',
  DOSAGE_CHECK_THRESHOLD: 0.8  // 80% of max dosage triggers double-check
} as const;
