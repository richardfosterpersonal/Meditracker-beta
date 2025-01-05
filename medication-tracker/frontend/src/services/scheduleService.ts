/**
 * Schedule Service
 * Last Updated: 2024-12-25T20:30:31+01:00
 * Status: BETA
 * Reference: ../../../docs/validation/critical_path/CRITICAL_PATH_STATUS.md
 *
 * Implements critical path requirements for frontend schedule management:
 * 1. Data Safety: API validation
 * 2. User Safety: Response validation
 * 3. System Stability: Error handling
 */

import axios from 'axios';
import { Schedule, ScheduleInput, ScheduleConflict } from '../types/schedule';
import { ScheduleValidation, ResponseValidation, ErrorHandling } from '../validation/scheduleValidation';

/**
 * Schedule service class
 * Critical Path: API Safety
 */
export class ScheduleService {
  private readonly baseUrl: string;

  constructor() {
    this.baseUrl = process.env.REACT_APP_API_URL || '';
  }

  /**
   * Create schedule
   * Critical Path: Schedule Creation
   */
  async createSchedule(input: ScheduleInput): Promise<Schedule> {
    try {
      // Critical Path: Input Validation
      ScheduleValidation.validateScheduleInput(input);

      const response = await axios.post<Schedule>(`${this.baseUrl}/schedules`, input);
      
      // Critical Path: Response Validation
      ResponseValidation.validateScheduleResponse(response.data);
      
      return response.data;
    } catch (error) {
      throw new Error(ErrorHandling.formatValidationError(error));
    }
  }

  /**
   * Get schedule
   * Critical Path: Data Safety
   */
  async getSchedule(id: number): Promise<Schedule> {
    try {
      const response = await axios.get<Schedule>(`${this.baseUrl}/schedules/${id}`);
      
      // Critical Path: Response Validation
      ResponseValidation.validateScheduleResponse(response.data);
      
      return response.data;
    } catch (error) {
      throw new Error(ErrorHandling.formatValidationError(error));
    }
  }

  /**
   * Update schedule
   * Critical Path: Schedule Safety
   */
  async updateSchedule(id: number, input: Partial<ScheduleInput>): Promise<Schedule> {
    try {
      // Critical Path: Input Validation
      ScheduleValidation.validateScheduleUpdate(input);

      const response = await axios.put<Schedule>(`${this.baseUrl}/schedules/${id}`, input);
      
      // Critical Path: Response Validation
      ResponseValidation.validateScheduleResponse(response.data);
      
      return response.data;
    } catch (error) {
      throw new Error(ErrorHandling.formatValidationError(error));
    }
  }

  /**
   * Delete schedule
   * Critical Path: Data Safety
   */
  async deleteSchedule(id: number): Promise<boolean> {
    try {
      await axios.delete(`${this.baseUrl}/schedules/${id}`);
      return true;
    } catch (error) {
      throw new Error(ErrorHandling.formatValidationError(error));
    }
  }

  /**
   * List user schedules
   * Critical Path: Data Safety
   */
  async listUserSchedules(userId: number): Promise<Schedule[]> {
    try {
      const response = await axios.get<Schedule[]>(`${this.baseUrl}/schedules?user_id=${userId}`);
      
      // Critical Path: Response Validation
      ResponseValidation.validateScheduleListResponse(response.data);
      
      return response.data;
    } catch (error) {
      throw new Error(ErrorHandling.formatValidationError(error));
    }
  }

  /**
   * Record medication taken
   * Critical Path: User Safety
   */
  async recordMedicationTaken(id: number): Promise<Schedule> {
    try {
      const response = await axios.post<Schedule>(`${this.baseUrl}/schedules/${id}/taken`);
      
      // Critical Path: Response Validation
      ResponseValidation.validateScheduleResponse(response.data);
      
      return response.data;
    } catch (error) {
      throw new Error(ErrorHandling.formatValidationError(error));
    }
  }

  /**
   * Check schedule conflicts
   * Critical Path: Schedule Safety
   */
  async checkConflicts(userId: number, time: string): Promise<boolean> {
    try {
      // Critical Path: Time Validation
      ScheduleValidation.validateTimeFormat(time);

      const response = await axios.get<ScheduleConflict>(
        `${this.baseUrl}/schedules/conflicts?user_id=${userId}&time=${time}`
      );
      
      return response.data.has_conflict;
    } catch (error) {
      throw new Error(ErrorHandling.formatValidationError(error));
    }
  }
}
