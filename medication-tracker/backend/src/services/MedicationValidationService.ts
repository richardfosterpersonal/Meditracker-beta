import { injectable, inject } from 'inversify';
import { Logger } from 'winston';
import { PrismaClient } from '@prisma/client';
import { parseISO, format, differenceInMinutes, addMinutes } from 'date-fns';
import { 
  DosageSchedule,
  ValidationResult,
  FrequencyValidationOptions,
  TimeOfDay,
  TimeWindow,
  ValidationError,
  ValidationWarning,
  VALIDATION_CONSTANTS
} from '@/types/validation.js';
import { DosageUnit } from '@/types/medication.js';
import { IMedicationValidationService } from '@/interfaces/IMedicationValidationService.js';
import { IMedicationReferenceService } from '@/interfaces/IMedicationReferenceService.js';
import { TYPES } from '@/config/types.js';
import { ApiError } from '@/utils/errors.js';
import { auditLog } from '@/utils/audit.js';
import { monitorPerformance } from '@/utils/monitoring.js';

@injectable()
export class MedicationValidationService implements IMedicationValidationService {
  private readonly prisma: PrismaClient;

  constructor(
    @inject(TYPES.Logger) private readonly logger: Logger,
    @inject(TYPES.MedicationReferenceService) private readonly referenceService: IMedicationReferenceService
  ) {
    this.prisma = new PrismaClient();
  }

  private createValidationResult(
    isValid: boolean,
    errors: ValidationError[] = [],
    warnings: ValidationWarning[] = []
  ): ValidationResult {
    return { isValid, errors, warnings };
  }

  private async logValidationAttempt(
    action: string,
    medicationId: string,
    result: ValidationResult,
    details?: Record<string, any>
  ): Promise<void> {
    await auditLog('medication_validation', action, {
      medicationId,
      isValid: result.isValid,
      errorCount: result.errors.length,
      warningCount: result.warnings.length,
      ...details
    });
  }

  @monitorPerformance('validateDosageSchedule')
  public async validateDosageSchedule(
    schedule: DosageSchedule,
    options: Partial<FrequencyValidationOptions> = {}
  ): Promise<ValidationResult> {
    try {
      const errors: ValidationError[] = [];
      const warnings: ValidationWarning[] = [];

      // Validate dosage amount
      const dosageResult = await this.validateDosageAmount(
        schedule.medicationId,
        schedule.dosageAmount,
        schedule.dosageUnit
      );
      errors.push(...dosageResult.errors);
      warnings.push(...dosageResult.warnings);

      // Validate frequency
      const frequencyResult = await this.validateFrequency(
        schedule.medicationId,
        schedule.frequency,
        schedule.timeWindows
      );
      errors.push(...frequencyResult.errors);
      warnings.push(...frequencyResult.warnings);

      // Validate time windows if provided
      if (schedule.timeWindows?.length) {
        for (const window of schedule.timeWindows) {
          if (!this.isValidTimeWindow(window)) {
            errors.push({
              code: 'INVALID_TIME_WINDOW',
              message: `Invalid time window: ${window.start}-${window.end}`
            });
          }
        }
      }

      const isValid = errors.length === 0;
      const result = this.createValidationResult(isValid, errors, warnings);

      await this.logValidationAttempt('validate_schedule', schedule.medicationId, result, {
        schedule,
        options
      });

      return result;
    } catch (error) {
      this.logger.error('Error validating dosage schedule:', error);
      throw new ApiError('Failed to validate dosage schedule', 500);
    }
  }

  @monitorPerformance('validateDosageAmount')
  public async validateDosageAmount(
    medicationId: string,
    amount: number,
    unit: DosageUnit
  ): Promise<ValidationResult> {
    try {
      const errors: ValidationError[] = [];
      const warnings: ValidationWarning[] = [];

      const isValidAmount = await this.referenceService.validateDosageForForm(
        medicationId,
        amount,
        unit
      );

      if (!isValidAmount) {
        errors.push({
          code: 'INVALID_DOSAGE',
          message: `Invalid dosage amount ${amount}${unit} for medication ${medicationId}`
        });
      }

      const result = this.createValidationResult(errors.length === 0, errors, warnings);
      await this.logValidationAttempt('validate_dosage', medicationId, result, { amount, unit });
      return result;
    } catch (error) {
      this.logger.error('Error validating dosage amount:', error);
      throw error instanceof ApiError ? error : new ApiError('Failed to validate dosage amount', 500);
    }
  }

  private isValidTimeWindow(window: TimeWindow): boolean {
    try {
      const start = parseISO(`2000-01-01T${window.start}`);
      const end = parseISO(`2000-01-01T${window.end}`);
      return format(start, 'HH:mm') === window.start && 
             format(end, 'HH:mm') === window.end && 
             differenceInMinutes(end, start) >= VALIDATION_CONSTANTS.MIN_DOSE_INTERVAL_MINUTES;
    } catch {
      return false;
    }
  }

  @monitorPerformance('validateFrequency')
  public async validateFrequency(
    medicationId: string,
    frequency: number,
    timeWindows?: TimeWindow[]
  ): Promise<ValidationResult> {
    try {
      const errors: ValidationError[] = [];
      const warnings: ValidationWarning[] = [];

      if (frequency <= 0 || frequency > VALIDATION_CONSTANTS.MAX_DAILY_DOSES) {
        errors.push({
          code: 'INVALID_FREQUENCY',
          message: `Invalid frequency: ${frequency} doses per day`
        });
      }

      if (timeWindows?.length) {
        const totalMinutes = timeWindows.reduce((total, window) => {
          const start = parseISO(`2000-01-01T${window.start}`);
          const end = parseISO(`2000-01-01T${window.end}`);
          return total + differenceInMinutes(end, start);
        }, 0);

        const minRequiredMinutes = frequency * VALIDATION_CONSTANTS.MIN_DOSE_INTERVAL_MINUTES;
        if (totalMinutes < minRequiredMinutes) {
          errors.push({
            code: 'INSUFFICIENT_TIME_WINDOWS',
            message: `Time windows too short for ${frequency} doses per day`
          });
        }
      }

      const result = this.createValidationResult(errors.length === 0, errors, warnings);
      await this.logValidationAttempt('validate_frequency', medicationId, result, { frequency, timeWindows });
      return result;
    } catch (error) {
      this.logger.error('Error validating frequency:', error);
      throw error instanceof ApiError ? error : new ApiError('Failed to validate frequency', 500);
    }
  }
}
