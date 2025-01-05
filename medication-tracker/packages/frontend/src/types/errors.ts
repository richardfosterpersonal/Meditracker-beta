export enum ErrorSeverity {
  LOW = 'low',
  MEDIUM = 'medium',
  HIGH = 'high',
  CRITICAL = 'critical'
}

export enum ErrorCategory {
  VALIDATION = 'validation',
  NETWORK = 'network',
  SCHEDULE = 'schedule',
  MEDICATION = 'medication',
  SYSTEM = 'system'
}

export interface AppError {
  id: string;
  message: string;
  severity: ErrorSeverity;
  category: ErrorCategory;
  timestamp: number;
  componentStack?: string;
  error?: Error;
  context?: Record<string, unknown>;
  recoveryAction?: () => Promise<void>;
}

export interface ErrorState {
  errors: AppError[];
  lastError?: AppError;
  isRecovering: boolean;
}

export type ErrorAction = 
  | { type: 'ADD_ERROR'; payload: AppError }
  | { type: 'REMOVE_ERROR'; payload: string }
  | { type: 'CLEAR_ERRORS' }
  | { type: 'SET_RECOVERING'; payload: boolean };
