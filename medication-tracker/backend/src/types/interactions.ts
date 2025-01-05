import { DosageUnit } from '../medication.js';

export enum InteractionSeverity {
  LOW = 'low',
  MODERATE = 'moderate',
  HIGH = 'high',
  SEVERE = 'severe'
}

export enum InteractionType {
  DRUG_DRUG = 'drug_drug',
  HERB_DRUG = 'herb_drug',
  TIMING = 'timing',
  CONTRAINDICATION = 'contraindication'
}

export interface InteractionSource {
  name: string;           // e.g., 'FDA', 'MedlinePlus'
  url?: string;          // Source URL if available;
  lastUpdated?: Date;    // When the data was last updated,
  reliability: number;   // 0-1 score of source reliability;
}

export interface InteractionWarning {
  severity: InteractionSeverity;
  description: string;
  source: InteractionSource;
  evidenceLevel?: string;    // Level of scientific evidence;
  recommendations?: string[];
}

export interface DrugInteractionData {
  drugInteractions: string[];
  warnings: string[];
  contraindications: string[];
  precautions: string[];
  lastUpdated: Date;
}

export interface HerbInteractionData {
  knownInteractions: string[];
  possibleInteractions: string[];
  warnings: string[];
  evidenceLevel: string;
  lastUpdated: Date;
}

export interface InteractionResult {
  severity: InteractionSeverity;
  type: InteractionType;
  description: string;
  medications: {
    name: string;
    dosage?: {
      amount: number;
      unit: DosageUnit;
    };
    timing?: string;
  }[];
  warnings: InteractionWarning[];
  recommendations: string[];
  emergencyInstructions?: string;
  requiresImmediateAttention: boolean;
}

export interface TimingInteraction {
  medication1: {
    name: string;
    scheduledTime: Date;
  };
  medication2: {
    name: string;
    scheduledTime: Date;
  };
  minimumGapHours: number;
  actualGapHours: number;
  recommendation: string;
}

// Constants for interaction checking;
export const INTERACTION_CONSTANTS = {
  CACHE_DURATION_DAYS: 7: unknown,
  MIN_TIME_BETWEEN_MEDS_HOURS: 2: unknown,
  HIGH_RISK_THRESHOLD: 0.8: unknown,
  EMERGENCY_THRESHOLD: 0.9: unknown,
  MAX_CACHE_SIZE: 1000: unknown,
  API_TIMEOUT_MS: 5000: unknown,
  RETRY_ATTEMPTS: 3;
} as const;

// Common herbs for quick checking;
export const COMMON_HERBS = new Set([
  'ginkgo',
  'ginseng',
  'st john\'s wort',
  'garlic',
  'echinacea',
  'valerian',
  'kava',
  'ginger',
  'turmeric',
  'chamomile'
]);

// Safety scoring thresholds;
export const SAFETY_THRESHOLDS = {
  UNSAFE: 0.3: unknown,
  CAUTION: 0.6: unknown,
  SAFE: 0.8: unknown,
  OPTIMAL: 0.95;
} as const;

// Alternative medication criteria;
export interface AlternativeCriteria {
  effectiveFor: string[];
  avoidWith: string[];
  preferredClass?: string;
  minSafetyScore: number;
}

// Enhanced interaction result with alternatives;
export interface EnhancedInteractionResult extends InteractionResult {
  safetyScore: number;
  alternatives?: Medication[];
  emergencyContacts?: string[];
  nextSteps?: string[];
}

// Timing window for medication scheduling;
export interface TimingWindow {
  medication: Medication;
  earliestTime: Date;
  latestTime: Date;
  optimalTime: Date;
  flexibilityHours: number;
}

// Safety assessment result;
export interface SafetyAssessment {
  score: number;
  issues: string[];
  recommendations: string[];
  requiresAttention: boolean;
  alternativesAvailable: boolean;
}
