export interface MedicationForm {
  form: string;
  route: string;
  dosageUnits: string[];
  commonDosages: string[];
}

export interface MedicationStrength {
  value: number;
  unit: string;
  form: string;
}

export interface MedicationVariant {
  name: string;
  form: string;
  strengths: MedicationStrength[];
  route: string;
  manufacturer: string;
}

export interface MedicationReference {
  id: string;
  name: string;
  variants: MedicationVariant[];
  createdAt: Date;
  updatedAt: Date;
}

export type MedicationFormKey = 
  | 'TABLET' 
  | 'TABLET_EXTENDED_RELEASE' 
  | 'TABLET_DELAYED_RELEASE'
  | 'TABLET_DISPERSIBLE'
  | 'CAPSULE'
  | 'CAPSULE_EXTENDED_RELEASE'
  | 'SOLUTION'
  | 'SUSPENSION'
  | 'SYRUP'
  | 'INJECTION_SOLUTION'
  | 'INJECTION_SUSPENSION'
  | 'CREAM'
  | 'OINTMENT'
  | 'GEL'
  | 'PATCH'
  | 'INHALER_MDI'
  | 'INHALER_DPI'
  | 'SUPPOSITORY'
  | 'EYE_DROPS'
  | 'HERBAL_TEA'
  | 'HERBAL_TINCTURE'
  | 'HERBAL_CAPSULE';

export type MedicationRoute = 
  | 'oral'
  | 'injection'
  | 'topical'
  | 'transdermal'
  | 'inhalation'
  | 'rectal'
  | 'ophthalmic';

export type DosageUnit = 
  | 'mg'
  | 'mcg'
  | 'g'
  | 'mg/ml'
  | 'ml'
  | 'teaspoon'
  | 'tablespoon'
  | 'IU'
  | 'application'
  | 'patch'
  | 'puff'
  | 'mcg/puff'
  | 'drop'
  | 'bag';

export interface InteractionResult {
  id: string;
  medications: string[];
  description: string;
  severity: 'severe' | 'high' | 'moderate' | 'low';
  mechanism: string;
  onset: 'rapid' | 'delayed' | 'unknown';
  documentation: 'established' | 'probable' | 'suspected' | 'unknown';
  symptoms: string[];
  requiresImmediateAttention: boolean;
  recommendations: string[];
  references: string[];
  timestamp: string;
}

export interface SafetyAssessment {
  score: number;
  severityScores: number[];
  timingScore: number;
  recommendations: string[];
  timestamp: string;
}

export interface TimingInteraction {
  id: string;
  medications: string[];
  type: 'overlap' | 'spacing' | 'food' | 'time-of-day';
  description: string;
  severity: 'high' | 'moderate' | 'low';
  recommendations: string[];
}

export interface EmergencyProtocol {
  id: string;
  medications: string[];
  interaction: string;
  severity: 'severe' | 'high' | 'moderate' | 'low';
  instructions: string[];
  emergencyContacts: Array<{
    name: string;
    number: string;
  }>;
  timestamp: string;
}

export interface Medication extends MedicationReference {
  fdaId?: string;
  herbId?: string;
  schedule: {
    frequency: string;
    timing: string[];
    dosage: {
      value: number;
      unit: DosageUnit;
    };
    instructions?: string;
    startDate?: string;
    endDate?: string;
    daysOfWeek?: string[];
    timeOfDay?: string[];
    withFood?: boolean;
    specialInstructions?: string[];
  };
  prescriber?: {
    id: string;
    name: string;
    phone: string;
    email?: string;
  };
  pharmacy?: {
    id: string;
    name: string;
    phone: string;
    address: string;
  };
  notes?: string[];
  alerts?: {
    type: 'refill' | 'interaction' | 'missed' | 'other';
    message: string;
    severity: 'high' | 'moderate' | 'low';
    timestamp: string;
  }[];
  status: 'active' | 'discontinued' | 'completed' | 'on-hold';
  adherence?: {
    lastTaken?: string;
    missedDoses?: number;
    compliance?: number;
  };
}
