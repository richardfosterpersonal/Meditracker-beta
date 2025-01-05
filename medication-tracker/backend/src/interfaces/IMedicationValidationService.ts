import { 
  DosageSchedule,
  ValidationResult,
  FrequencyValidationOptions,
  TimeOfDay,
  TimeWindow
} from '@/types/validation.js';
import { DosageUnit } from '@/types/medication.js';

export interface IMedicationValidationService {
  /**
   * Validates a complete medication dosage schedule
   * @param schedule The dosage schedule to validate
   * @param options Validation options
   * @throws ApiError if validation fails critically
   */
  validateDosageSchedule(
    schedule: DosageSchedule,
    options?: Partial<FrequencyValidationOptions>
  ): Promise<ValidationResult>;

  /**
   * Validates a specific dosage amount for a medication
   * @param medicationId The medication identifier
   * @param amount The dosage amount
   * @param unit The dosage unit
   * @throws ApiError if validation fails critically
   */
  validateDosageAmount(
    medicationId: string,
    amount: number,
    unit: DosageUnit
  ): Promise<ValidationResult>;

  /**
   * Validates the frequency of medication doses
   * @param medicationId The medication identifier
   * @param frequency Number of doses per day
   * @param timeWindows Optional time windows for doses
   * @throws ApiError if validation fails critically
   */
  validateFrequency(
    medicationId: string,
    frequency: number,
    timeWindows?: TimeWindow[]
  ): Promise<ValidationResult>;

  /**
   * Validates if a specific time is appropriate for taking a medication
   * @param medicationId The medication identifier
   * @param timeOfDay The proposed time of day
   * @param exactTime Optional exact time (HH:mm)
   * @throws ApiError if validation fails critically
   */
  validateAdministrationTime(
    medicationId: string,
    timeOfDay: TimeOfDay,
    exactTime?: string
  ): Promise<ValidationResult>;

  /**
   * Checks if it's safe to take a medication dose based on previous doses
   * @param medicationId The medication identifier
   * @param proposedTime The proposed time for the dose
   * @throws ApiError if validation fails critically
   */
  validateSafetyWindow(
    medicationId: string,
    proposedTime: Date
  ): Promise<ValidationResult>;

  /**
   * Gets the next safe time to take a medication
   * @param medicationId The medication identifier
   * @param afterTime The time after which to check
   * @returns The next safe time or null if no safe time found
   */
  getNextSafeTime(
    medicationId: string,
    afterTime: Date
  ): Promise<Date | null>;

  /**
   * Validates a complete day's schedule for all medications
   * @param patientId The patient identifier
   * @param date The date to validate
   * @throws ApiError if validation fails critically
   */
  validateDailySchedule(
    patientId: string,
    date: Date
  ): Promise<ValidationResult>;
}
