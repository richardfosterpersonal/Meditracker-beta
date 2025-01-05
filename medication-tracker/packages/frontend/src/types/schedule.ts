/**
 * Schedule Types
 * Last Updated: 2024-12-25T20:30:31+01:00
 * Status: BETA
 * Reference: ../../../docs/validation/critical_path/CRITICAL_PATH_STATUS.md
 */

/**
 * Schedule input interface
 * Critical Path: Data Safety
 */
export interface ScheduleInput {
  medication_id: number;
  user_id: number;
  time: string;
  is_active?: boolean;
}

/**
 * Schedule interface
 * Critical Path: Data Safety
 */
export interface Schedule extends ScheduleInput {
  id: number;
  created_at: string;
  updated_at: string;
  last_taken_at: string | null;
}

/**
 * Schedule conflict check interface
 * Critical Path: Schedule Safety
 */
export interface ScheduleConflict {
  has_conflict: boolean;
}

/**
 * Schedule error interface
 * Critical Path: Error Safety
 */
export interface ScheduleError {
  error: string;
}
