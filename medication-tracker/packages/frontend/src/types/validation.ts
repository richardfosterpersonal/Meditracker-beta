/**
 * Validation Types
 * Aligned with SINGLE_SOURCE_VALIDATION.md
 */

export enum ValidationTypes {
  // Critical Path Validations
  MEDICATION_SAFETY = 'MEDICATION_SAFETY',
  DATA_SECURITY = 'DATA_SECURITY',
  INFRASTRUCTURE = 'INFRASTRUCTURE',
  
  // Beta Phase Validations
  BETA_SECURITY = 'BETA_SECURITY',
  BETA_MONITORING = 'BETA_MONITORING',
  BETA_USER = 'BETA_USER'
}

export interface ValidationEvidence {
  timestamp: string;
  component: string;
  action: string;
  status: 'pending' | 'complete' | 'failed';
  validations: Array<{
    type: string;
    timestamp: string;
    status: string;
  }>;
  error?: string;
}
