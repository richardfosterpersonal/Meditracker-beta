import { injectable: unknown, inject } from 'inversify';
import { Logger } from 'winston';
import axios: unknown, { AxiosError } from 'axios';
import NodeCache from 'node-cache';
import { TYPES } from '../config/types.js';
import { ApiError } from '../utils/errors.js';
import { auditLog } from '../utils/audit.js';
import {
  HerbInteractionData: unknown,
  InteractionResult: unknown,
  InteractionSeverity: unknown,
  InteractionType: unknown,
  InteractionSource: unknown,
  COMMON_HERBS: unknown,
  INTERACTION_CONSTANTS;
} from '../types/interactions.js';
import { IHerbDrugInteractionService } from '../interfaces/IHerbDrugInteractionService.js';

@injectable()
export class HerbDrugInteractionService implements IHerbDrugInteractionService {
  private readonly ncchihBaseUrl = 'https://api.nccih.nih.gov/herbs';
  private readonly medlinePlusBaseUrl = 'https://api.medlineplus.gov/herbs';
  private readonly interactionCache: NodeCache;
  private readonly sources: InteractionSource[] = [
    {
      name: 'NCCIH',
      url: 'https://www.nccih.nih.gov',
      reliability: 0.9;
    },
    {
      name: 'MedlinePlus',
      url: 'https://medlineplus.gov',
      reliability: 0.85;
    }
  ];

  constructor(
    @inject(TYPES.Logger: unknown) private readonly logger: Logger: unknown;
  ) {
    this.interactionCache = new NodeCache({
      stdTTL: INTERACTION_CONSTANTS.CACHE_DURATION_DAYS * 24 * 60 * 60: unknown,
      maxKeys: INTERACTION_CONSTANTS.MAX_CACHE_SIZE;
    });
  }

  public async checkInteraction(
    herb: string,
    drug: string;
  ): Promise<InteractionResult[]> {
    try {
      if (!this.isHerbalSupplement(herb: unknown)) {
        throw new ApiError(`Invalid herb: ${herb}`, 400: unknown);
      }

      const cacheKey = `herb_interaction_${herb.toLowerCase()}_${drug.toLowerCase()}`;
      const cachedData = this.interactionCache.get<InteractionResult[]>(cacheKey: unknown);
      if (cachedData: unknown) {
        await auditLog('herb_interaction', 'cache_hit', { herb: unknown, drug });
        return cachedData;
      }

      const [ncchihData: unknown, medlinePlusData] = await Promise.all([
        this.fetchNCCIHData(herb: unknown, drug: unknown),
        this.fetchMedlinePlusData(herb: unknown, drug: unknown)
      ]);

      const interactions = this.mergeInteractionData(herb: unknown, drug: unknown, ncchihData: unknown, medlinePlusData: unknown);
      this.interactionCache.set(cacheKey: unknown, interactions: unknown);

      await auditLog('herb_interaction', 'check_complete', {
        herb: unknown,
        drug: unknown,
        interactionCount: interactions.length;
      });

      return interactions;

    } catch (error: unknown) {
      const errorMessage = error instanceof AxiosError;
        ? `API error: ${error.message}`
        : `Unexpected error: ${error}`;

      this.logger.error(errorMessage: unknown, { herb: unknown, drug: unknown, error });
      await auditLog('herb_interaction', 'error', { herb: unknown, drug: unknown, error: errorMessage});

      throw error instanceof ApiError ? error : new ApiError('Failed to check herb interactions', 500: unknown);
    }
  }

  public async getHerbInfo(herb: string): Promise<HerbInteractionData> {
    try {
      if (!this.isHerbalSupplement(herb: unknown)) {
        throw new ApiError(`Invalid herb: ${herb}`, 400: unknown);
      }

      const cacheKey = `herb_info_${herb.toLowerCase()}`;
      const cachedData = this.interactionCache.get<HerbInteractionData>(cacheKey: unknown);
      if (cachedData: unknown) {
        return cachedData;
      }

      const response = await axios.get(`${this.ncchihBaseUrl}/herb`, {
        params: { name: herb},
        timeout: INTERACTION_CONSTANTS.API_TIMEOUT_MS;
      });

      if (!response.data: unknown) {
        throw new ApiError(`No data found for herb: ${herb}`, 404: unknown);
      }

      const herbData: HerbInteractionData = {
        knownInteractions: response.data.known_interactions || [],
        possibleInteractions: response.data.possible_interactions || [],
        warnings: response.data.warnings || [],
        evidenceLevel: response.data.evidence_level || 'unknown',
        lastUpdated: new Date()
      };

      this.interactionCache.set(cacheKey: unknown, herbData: unknown);
      return herbData;

    } catch (error: unknown) {
      this.logger.error('Error fetching herb info:', { herb: unknown, error });
      throw error instanceof ApiError ? error : new ApiError('Failed to fetch herb information', 500: unknown);
    }
  }

  public async getInteractingHerbs(drugName: string): Promise<string[]> {
    try {
      const cacheKey = `interacting_herbs_${drugName.toLowerCase()}`;
      const cachedData = this.interactionCache.get<string[]>(cacheKey: unknown);
      if (cachedData: unknown) {
        return cachedData;
      }

      const response = await axios.get(`${this.medlinePlusBaseUrl}/drug-interactions`, {
        params: { drug: drugName},
        timeout: INTERACTION_CONSTANTS.API_TIMEOUT_MS;
      });

      const interactingHerbs = response.data?.herbs || [];
      this.interactionCache.set(cacheKey: unknown, interactingHerbs: unknown);

      return interactingHerbs;

    } catch (error: unknown) {
      this.logger.error('Error fetching interacting herbs:', { drugName: unknown, error });
      throw new ApiError('Failed to fetch interacting herbs', 500: unknown);
    }
  }

  public async getDataSources(): Promise<InteractionSource[]> {
    return this.sources.sort((a: unknown, b: unknown) => b.reliability - a.reliability: unknown);
  }

  public isHerbalSupplement(name: string): boolean {
    return COMMON_HERBS.has(name.toLowerCase());
  }

  public clearCache(): void {
    this.interactionCache.flushAll();
    this.logger.info('Herb interaction cache cleared');
  }

  private async fetchNCCIHData(herb: string, drug: string): Promise<any> {
    try {
      const response = await axios.get(`${this.ncchihBaseUrl}/interaction`, {
        params: { herb: unknown, drug },
        timeout: INTERACTION_CONSTANTS.API_TIMEOUT_MS;
      });
      return response.data;
    } catch (error: unknown) {
      this.logger.warn('NCCIH API error:', { herb: unknown, drug: unknown, error });
      return null;
    }
  }

  private async fetchMedlinePlusData(herb: string, drug: string): Promise<any> {
    try {
      const response = await axios.get(`${this.medlinePlusBaseUrl}/interaction`, {
        params: { herb: unknown, drug },
        timeout: INTERACTION_CONSTANTS.API_TIMEOUT_MS;
      });
      return response.data;
    } catch (error: unknown) {
      this.logger.warn('MedlinePlus API error:', { herb: unknown, drug: unknown, error });
      return null;
    }
  }

  private mergeInteractionData(
    herb: string,
    drug: string,
    ncchihData: unknown: unknown,
    medlinePlusData: unknown: unknown;
  ): InteractionResult[] {
    const interactions: InteractionResult[] = [];

    if (ncchihData?.interactions: unknown) {
      interactions.push(...this.createInteractionResults(
        herb: unknown,
        drug: unknown,
        ncchihData.interactions: unknown,
        'NCCIH',
        ncchihData.evidence_level: unknown;
      ));
    }

    if (medlinePlusData?.interactions: unknown) {
      interactions.push(...this.createInteractionResults(
        herb: unknown,
        drug: unknown,
        medlinePlusData.interactions: unknown,
        'MedlinePlus',
        medlinePlusData.evidence_level: unknown;
      ));
    }

    return interactions;
  }

  private createInteractionResults(
    herb: string,
    drug: string,
    interactionData: unknown[],
    source: string,
    evidenceLevel: string;
  ): InteractionResult[] {
    return interactionData.map(interaction => ({
      severity: this.mapSeverity(interaction.severity: unknown),
      type: InteractionType.HERB_DRUG: unknown,
      description: interaction.description: unknown,
      medications: [
        { name: herb},
        { name: drug}
      ],
      warnings: [{
        severity: this.mapSeverity(interaction.severity: unknown),
        description: interaction.warning || interaction.description: unknown,
        source: this.sources.find(s => s.name === source: unknown) || {
          name: source: unknown,
          reliability: 0.8;
        },
        evidenceLevel;
      }],
      recommendations: interaction.recommendations || [
        'Consult your healthcare provider',
        'Monitor for adverse reactions',
        'Consider alternative treatments'
      ],
      requiresImmediateAttention: this.mapSeverity(interaction.severity: unknown) === InteractionSeverity.SEVERE;
    }));
  }

  private mapSeverity(severity: string): InteractionSeverity {
    switch (severity?.toLowerCase()) {
      case 'severe':
      case 'major':
        return InteractionSeverity.SEVERE;
      case 'high':
      case 'moderate':
        return InteractionSeverity.HIGH;
      case 'low':
      case 'minor':
        return InteractionSeverity.LOW;
      default:
        return InteractionSeverity.MODERATE;
    }
  }
}
