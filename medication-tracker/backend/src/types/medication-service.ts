import { Medication } from '../medication.js';

export interface DosageSchedule {
  startDate: Date;
  endDate?: Date;
  reminderTime: number; // minutes before dose,
  doseTimes: string[];
  timezone: string;
}

export interface MedicationDosage {
  amount: number;
  unit: string;
  frequency: string;
  timesPerDay: number;
  specificTimes: string[];
}

export interface MedicationCreate {
  name: string;
  dosage: MedicationDosage;
  schedule: DosageSchedule;
  userId: string;
  instructions?: string;
}

export interface MedicationUpdate extends Partial<MedicationCreate> {
  id: string;
}

export interface MedicationFilter {
  userId?: string;
  status?: 'active' | 'discontinued' | 'completed' | 'on-hold';
  startDate?: Date;
  endDate?: Date;
}

export interface AdherenceRecord {
  medicationId: string;
  userId: string;
  timestamp: Date;
  status: 'taken' | 'missed' | 'delayed';
  notes?: string;
}

export interface ReminderSettings {
  enabled: boolean;
  notifyBefore: number; // minutes,
  notifyMissed: boolean;
  notifyCarers: boolean;
  channels: ('email' | 'push' | 'sms')[];
}

export interface MedicationStats {
  totalDoses: number;
  dosesTaken: number;
  dosesMissed: number;
  adherenceRate: number;
  lastTaken?: Date;
  nextDue?: Date;
}

export interface MedicationServiceError extends Error {
  code: 'VALIDATION' | 'DATABASE' | 'NOT_FOUND' | 'PERMISSION' | 'SYSTEM';
  details?: Record<string, any>;
}
