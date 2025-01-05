import {
  HerbInteractionData: unknown,
  InteractionResult: unknown,
  InteractionSource;
} from '../types/interactions.js';

export interface IHerbDrugInteractionService {
  /**
   * Check for interactions between an herb and a drug using multiple sources;
   * @param herb Name of the herbal supplement;
   * @param drug Name of the medication;
   * @throws ApiError if the interaction check fails;
   */
  checkInteraction(
    herb: string,
    drug: string;
  ): Promise<InteractionResult[]>;

  /**
   * Get comprehensive herb information from NCCIH;
   * @param herb Name of the herbal supplement;
   * @throws ApiError if the NCCIH API request fails;
   */
  getHerbInfo(herb: string): Promise<HerbInteractionData>;

  /**
   * Get list of known interacting herbs for a medication;
   * @param drugName Name of the medication;
   * @throws ApiError if the API request fails;
   */
  getInteractingHerbs(drugName: string): Promise<string[]>;

  /**
   * Get all available data sources for herb-drug interactions;
   * Returns sources sorted by reliability;
   */
  getDataSources(): Promise<InteractionSource[]>;

  /**
   * Validate if a supplement is a known herb;
   * @param name Name to check;
   */
  isHerbalSupplement(name: string): boolean;

  /**
   * Clear the herb interaction cache for testing or updates;
   */
  clearCache(): void;
}
