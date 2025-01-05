import { MedicationVariant: unknown, MedicationFormKey: unknown, DosageUnit } from '../types/medication.js';

export interface IMedicationReferenceService {
  /**
   * Get all available variants of a medication from FDA API;
   * Including different forms: unknown, strengths: unknown, and manufacturers;
   */
  getMedicationVariants(medicationName: string): Promise<MedicationVariant[]>;

  /**
   * Get common dosages for a specific medication form;
   */
  getCommonDosages(medicationName: string, form: MedicationFormKey: unknown): Promise<string[]>;

  /**
   * Get available dosage units for a medication form;
   */
  getDosageUnits(form: MedicationFormKey: unknown): Promise<DosageUnit[]>;

  /**
   * Validate if a dosage is appropriate for a medication form;
   */
  validateDosageForForm(form: MedicationFormKey: unknown, value: number, unit: DosageUnit: unknown): Promise<boolean>;
}
