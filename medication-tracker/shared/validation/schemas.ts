import { z } from 'zod';

// Base schemas
export const baseEntitySchema = z.object({
  id: z.string().uuid(),
  createdAt: z.string().datetime(),
  updatedAt: z.string().datetime(),
});

// User schemas
export const userPreferencesSchema = z.object({
  timezone: z.string(),
  notifications: z.object({
    email: z.boolean(),
    push: z.boolean(),
    sms: z.boolean(),
    reminderLeadTime: z.number().min(0).max(60),
  }),
  theme: z.enum(['light', 'dark', 'system']),
  language: z.string(),
});

export const userSchema = baseEntitySchema.extend({
  email: z.string().email(),
  name: z.string().min(2),
  role: z.enum(['user', 'admin', 'caregiver']),
  preferences: userPreferencesSchema,
});

// Medication schemas
export const dosageSchema = z.object({
  amount: z.number().positive(),
  unit: z.string(),
});

export const scheduleSchema = z.object({
  type: z.enum(['daily', 'weekly', 'monthly', 'custom']),
  times: z.array(z.string().regex(/^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/)),
  days: z.array(z.number()).optional(),
  interval: z.number().positive().optional(),
  startDate: z.string().datetime(),
  endDate: z.string().datetime().optional(),
  timezone: z.string(),
});

export const supplySchema = z.object({
  currentQuantity: z.number().min(0),
  unit: z.string(),
  reorderPoint: z.number().min(0),
  reorderQuantity: z.number().positive(),
  lastRefillDate: z.string().datetime().optional(),
  supplier: z.object({
    name: z.string(),
    phone: z.string().optional(),
    email: z.string().email().optional(),
  }).optional(),
});

export const medicationSchema = baseEntitySchema.extend({
  name: z.string().min(1),
  dosage: dosageSchema,
  schedule: scheduleSchema,
  instructions: z.string().optional(),
  sideEffects: z.array(z.string()).optional(),
  interactions: z.array(z.string()).optional(),
  userId: z.string().uuid(),
  supply: supplySchema.optional(),
});

export const medicationLogSchema = baseEntitySchema.extend({
  medicationId: z.string().uuid(),
  userId: z.string().uuid(),
  timestamp: z.string().datetime(),
  action: z.enum(['taken', 'missed', 'skipped']),
  note: z.string().optional(),
});

// Auth schemas
export const loginCredentialsSchema = z.object({
  email: z.string().email(),
  password: z.string().min(8),
});

export const registerDataSchema = loginCredentialsSchema.extend({
  name: z.string().min(2),
  timezone: z.string(),
});

// Validation helper functions
export const validateMedication = (data: unknown) => medicationSchema.parse(data);
export const validateUser = (data: unknown) => userSchema.parse(data);
export const validateSchedule = (data: unknown) => scheduleSchema.parse(data);
export const validateMedicationLog = (data: unknown) => medicationLogSchema.parse(data);
export const validateLoginCredentials = (data: unknown) => loginCredentialsSchema.parse(data);
export const validateRegisterData = (data: unknown) => registerDataSchema.parse(data);
