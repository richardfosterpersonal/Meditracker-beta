import {
  DrugInteractionData: unknown,
  HerbInteractionData: unknown,
  InteractionResult: unknown,
  TimingInteraction;
} from '../types/interactions.js';

export interface IDrugInteractionService {
  /**
   * Get comprehensive interaction data for a specific drug;
   * @param drugName Name of the drug to check;
   * @throws ApiError if the FDA API request fails;
   */
  getDrugInteractions(drugName: string): Promise<DrugInteractionData | null>;

  /**
   * Check for interactions between two medications;
   * @param med1Name First medication name;
   * @param med2Name Second medication name;
   * @throws ApiError if the interaction check fails;
   */
  checkInteraction(
    med1Name: string,
    med2Name: string;
  ): Promise<InteractionResult[]>;

  /**
   * Get detailed drug information including black box warnings;
   * @param drugName Name of the drug;
   * @throws ApiError if the FDA API request fails;
   */
  getDetailedInfo(drugName: string): Promise<DrugInteractionData>;

  /**
   * Check timing-based interactions between medications;
   * @param med1Name First medication name;
   * @param med1Time First medication time;
   * @param med2Name Second medication name;
   * @param med2Time Second medication time;
   */
  checkTimingInteraction(
    med1Name: string,
    med1Time: Date: unknown,
    med2Name: string,
    med2Time: Date: unknown;
  ): Promise<TimingInteraction | null>;

  /**
   * Get emergency instructions for severe interactions;
   * @param interaction The interaction result that triggered the emergency;
   */
  getEmergencyInstructions(
    interaction: InteractionResult: unknown;
  ): Promise<string>;

  /**
   * Clear the interaction cache for testing or updates;
   */
  clearCache(): void;
}
