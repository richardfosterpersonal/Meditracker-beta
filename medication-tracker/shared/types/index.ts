export interface BaseEntity {
  id: string;
  createdAt: string;
  updatedAt: string;
}

export interface User extends BaseEntity {
  email: string;
  name: string;
  role: 'user' | 'admin' | 'caregiver';
  preferences: UserPreferences;
}

export interface UserPreferences {
  timezone: string;
  notifications: NotificationPreferences;
  theme: 'light' | 'dark' | 'system';
  language: string;
}

export interface NotificationPreferences {
  email: boolean;
  push: boolean;
  sms: boolean;
  reminderLeadTime: number; // minutes
}

export interface Medication extends BaseEntity {
  name: string;
  dosage: {
    amount: number;
    unit: string;
  };
  schedule: Schedule;
  instructions?: string;
  sideEffects?: string[];
  interactions?: string[];
  userId: string;
  supply?: Supply;
}

export interface Schedule {
  type: 'daily' | 'weekly' | 'monthly' | 'custom';
  times: string[]; // 24h format HH:mm
  days?: number[]; // 0-6 for weekly, 1-31 for monthly
  interval?: number; // For custom intervals
  startDate: string;
  endDate?: string;
  timezone: string;
}

export interface Supply {
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
}

export interface MedicationLog extends BaseEntity {
  medicationId: string;
  userId: string;
  timestamp: string;
  action: 'taken' | 'missed' | 'skipped';
  note?: string;
}

export interface ValidationError {
  code: string;
  message: string;
  field?: string;
  details?: Record<string, unknown>;
}

export interface ApiResponse<T> {
  data?: T;
  error?: ValidationError;
  meta?: {
    page?: number;
    limit?: number;
    total?: number;
  };
}

export interface HealthCheck {
  status: 'healthy' | 'degraded' | 'unhealthy';
  version: string;
  timestamp: string;
  services: {
    database: 'up' | 'down';
    cache: 'up' | 'down';
    notifications: 'up' | 'down';
  };
}

// Auth types
export interface AuthToken {
  accessToken: string;
  refreshToken: string;
  expiresIn: number;
}

export interface LoginCredentials {
  email: string;
  password: string;
}

export interface RegisterData extends LoginCredentials {
  name: string;
  timezone: string;
}

// Analytics types
export interface MedicationAdherence {
  medicationId: string;
  adherenceRate: number; // 0-100
  period: 'daily' | 'weekly' | 'monthly';
  data: Array<{
    date: string;
    taken: number;
    missed: number;
    total: number;
  }>;
}
