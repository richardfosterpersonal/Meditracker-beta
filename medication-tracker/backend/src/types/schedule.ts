import { z } from 'zod';

export const ScheduleType = {
  FIXED_TIME: 'fixed_time',
  INTERVAL: 'interval',
  PRN: 'prn',
  COMPLEX: 'complex',
  CYCLIC: 'cyclic',
  TAPERED: 'tapered',
  MEAL_BASED: 'meal_based',
  SLIDING_SCALE: 'sliding_scale',
} as const;

export type ScheduleType = typeof ScheduleType[keyof typeof ScheduleType];

export const MealTime = {
  BEFORE_BREAKFAST: 'before_breakfast',
  WITH_BREAKFAST: 'with_breakfast',
  AFTER_BREAKFAST: 'after_breakfast',
  BEFORE_LUNCH: 'before_lunch',
  WITH_LUNCH: 'with_lunch',
  AFTER_LUNCH: 'after_lunch',
  BEFORE_DINNER: 'before_dinner',
  WITH_DINNER: 'with_dinner',
  AFTER_DINNER: 'after_dinner',
  BEDTIME: 'bedtime',
} as const;

export type MealTime = typeof MealTime[keyof typeof MealTime];

export const scheduleSchema = z.object({
  id: z.string().optional(),
  medicationId: z.string(),
  userId: z.string(),
  type: z.nativeEnum(ScheduleType),
  startDate: z.date(),
  endDate: z.date().optional(),
  times: z.array(z.string()), // HH:mm format
  interval: z.number().optional(), // minutes
  daysOfWeek: z.array(z.number()).optional(), // 0-6, where 0 is Sunday
  mealTimes: z.array(z.nativeEnum(MealTime)).optional(),
  dosage: z.number(),
  unit: z.string(),
  instructions: z.string().optional(),
  reminderTime: z.number(), // minutes before dose
  active: z.boolean().default(true),
  createdAt: z.date().optional(),
  updatedAt: z.date().optional(),
});

export type Schedule = z.infer<typeof scheduleSchema>;

export interface ScheduleConflict {
  medication1: string;
  medication2: string;
  time: Date;
  conflictType: 'timing' | 'interaction';
  severity: 'low' | 'medium' | 'high';
  recommendation: string;
}

export const ConflictType = {
  TIMING: 'timing',
  INTERACTION: 'interaction',
} as const;

export type ConflictType = typeof ConflictType[keyof typeof ConflictType];

export const ConflictSeverity = {
  LOW: 'low',
  MEDIUM: 'medium',
  HIGH: 'high',
} as const;

export type ConflictSeverity = typeof ConflictSeverity[keyof typeof ConflictSeverity];
