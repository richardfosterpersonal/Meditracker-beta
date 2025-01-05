export interface Medication {
  id: string;
  name: string;
  dosage: {
    amount: string;
    unit: string;
    frequency: MedicationFrequency;
    times_per_day: number;
    specific_times: string[];
  };
  schedule: {
    start_date: string;
    end_date?: string;
    reminder_time: number;
    dose_times: string[];
    timezone: string;
  };
  instructions?: string;
  category?: string;
  compliance: number;
  daily_doses_taken: number;
  is_prn: boolean;
  remaining_doses?: number;
  user_id: string;
  status: MedicationStatus;
  reminderEnabled: boolean;
}

export type MedicationFrequency = 
  | 'daily'
  | 'twice-daily'
  | 'weekly'
  | 'monthly'
  | 'as-needed';

export type MedicationStatus = 
  | 'active'
  | 'inactive'
  | 'completed'
  | 'discontinued';

export interface MedicationFormData {
  name: string;
  dosage: {
    amount: string;
    unit: string;
    frequency: MedicationFrequency;
    times_per_day: number;
    specific_times: string[];
  };
  schedule: {
    start_date: Date;
    end_date?: Date;
    reminder_time: number;
    dose_times: string[];
    timezone: string;
  };
  instructions: string;
  category: string;
  is_prn: boolean;
  remaining_doses?: number;
}

export interface AddMedicationProps {
  open: boolean;
  handleClose: () => void;
  onMedicationAdded: (medication: Medication) => void;
}

export interface EditMedicationProps extends Omit<AddMedicationProps, 'onMedicationAdded'> {
  medication: Medication;
  onMedicationUpdated: (medication: Medication) => void;
}

export interface MedicationListProps {
  medications: Medication[];
  onEdit: (id: string) => void;
  onDelete: (id: string) => void;
  onTakeDose?: (id: string) => void;
  showCompliance?: boolean;
}

export interface MedicationFiltersState {
  search: string;
  category: string;
  status: string;
}

export interface MedicationDose {
  id?: string;
  medicationId: string;
  userId: string;
  takenAt: string;
  scheduledFor: string;
  amount: string;
  skipped?: boolean;
  notes?: string;
}

export interface MedicationSchedule {
  userId: string;
  type: 'fixed_time' | 'flexible' | 'as_needed';
  frequency: MedicationFrequency;
  times?: string[];
  intervalHours?: number;
  daysOfWeek?: number[];
  startDate: string;
  endDate?: string;
  timezone: string;
  reminderEnabled: boolean;
  reminderMinutesBefore?: number;
}

export interface MedicationHistory {
  doses: MedicationDose[];
  compliance: number;
  missedDoses: number;
  totalDoses: number;
}

export interface MedicationAlert {
  type: 'missed' | 'upcoming' | 'interaction' | 'refill';
  medicationId: string;
  timestamp: string;
  message: string;
  priority: 'low' | 'medium' | 'high';
  acknowledged: boolean;
}
