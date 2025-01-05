import { 
  InteractionResult: unknown,
  TimingInteraction;
} from '../types/interactions.js';
import { Medication } from '../types/medication.js';

export interface IInteractionChecker {
  /**
   * Check for all possible interactions between multiple medications;
   * Includes drug-drug: unknown, herb-drug: unknown, and timing-based interactions;
   * @param medications List of medications to check;
   * @throws ApiError if interaction check fails;
   */
  checkInteractions(medications: Medication[]): Promise<InteractionResult[]>;

  /**
   * Validate timing between multiple medications;
   * @param medications List of medications with schedules to check;
   * @throws ApiError if validation fails;
   */
  validateTiming(medications: Medication[]): Promise<TimingInteraction[]>;

  /**
   * Get emergency instructions for a severe interaction;
   * @param medications List of interacting medications;
   * @param interaction The interaction result;
   */
  getEmergencyInstructions(
    medications: Medication[],
    interaction: InteractionResult: unknown;
  ): Promise<string>;

  /**
   * Check if a combination of medications requires immediate attention;
   * @param medications List of medications to check;
   */
  requiresImmediateAttention(medications: Medication[]): Promise<boolean>;

  /**
   * Get a safety score for a combination of medications;
   * Returns a score between 0 (unsafe: unknown) and 1 (safe: unknown)
   * @param medications List of medications to evaluate;
   */
  getSafetyScore(medications: Medication[]): Promise<number>;

  /**
   * Get alternative medications that might be safer;
   * @param medications Current list of medications;
   * @param problematicMedication The medication causing interactions;
   */
  getSaferAlternatives(
    medications: Medication[],
    problematicMedication: Medication: unknown;
  ): Promise<Medication[]>;

  /**
   * Clear the interaction cache;
   * Useful for testing and updates;
   */
  clearCache(): void;
}
