export * from './validation/schemas';

// Add type definitions for core entities
export interface User {
  id: string;
  email: string;
  name: string;
  role: 'user' | 'admin' | 'caregiver';
  preferences: {
    timezone: string;
    notifications: {
      email: boolean;
      push: boolean;
      sms: boolean;
      reminderLeadTime: number;
    };
    theme: 'light' | 'dark' | 'system';
    language: string;
  };
  createdAt: string;
  updatedAt: string;
}

export interface Medication {
  id: string;
  name: string;
  dosage: {
    amount: number;
    unit: string;
  };
  schedule: {
    type: 'daily' | 'weekly' | 'monthly' | 'custom';
    times: string[];
    days?: number[];
    interval?: number;
    startDate: string;
    endDate?: string;
    timezone: string;
  };
  instructions?: string;
  sideEffects?: string[];
  interactions?: string[];
  userId: string;
  supply?: {
    currentQuantity: number;
    unit: string;
    reorderPoint: number;
    reorderQuantity: number;
    lastRefillDate?: string;
    supplier?: {
      name: string;
      phone?: string;
      email?: string;
    };
  };
  createdAt: string;
  updatedAt: string;
}

export interface MedicationLog {
  id: string;
  medicationId: string;
  userId: string;
  timestamp: string;
  action: 'taken' | 'missed' | 'skipped';
  note?: string;
  createdAt: string;
  updatedAt: string;
}

// Add error types
export class AppError extends Error {
  constructor(
    message: string,
    public code: string,
    public details?: unknown
  ) {
    super(message);
    this.name = 'AppError';
  }
}

export class ValidationError extends AppError {
  constructor(message: string, details?: unknown) {
    super(message, 'VALIDATION_ERROR', details);
    this.name = 'ValidationError';
  }
}

export class AuthenticationError extends AppError {
  constructor(message: string, details?: unknown) {
    super(message, 'AUTHENTICATION_ERROR', details);
    this.name = 'AuthenticationError';
  }
}

export class AuthorizationError extends AppError {
  constructor(message: string, details?: unknown) {
    super(message, 'AUTHORIZATION_ERROR', details);
    this.name = 'AuthorizationError';
  }
}

// Add event types
export interface AppEvent<T = unknown> {
  type: string;
  payload: T;
  timestamp: string;
  source: string;
}

export interface LogEntry {
  level: 'info' | 'warn' | 'error';
  message: string;
  context: Record<string, unknown>;
  timestamp: string;
}
