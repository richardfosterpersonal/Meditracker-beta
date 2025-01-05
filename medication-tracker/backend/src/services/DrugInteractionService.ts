import { injectable, inject } from 'inversify';
import { Logger } from 'winston';
import axios, { AxiosError } from 'axios';
import NodeCache from 'node-cache';
import { TYPES } from '@/config/types.js';
import { ApiError } from '@/utils/errors.js';
import { auditLog } from '@/utils/audit.js';
import { monitorPerformance } from '@/utils/monitoring.js';
import { 
  DrugInteractionData,
  InteractionResult,
  InteractionSeverity,
  InteractionType,
  TimingInteraction,
  INTERACTION_CONSTANTS
} from '@/types/interactions.js';
import { IDrugInteractionService } from '@/interfaces/IDrugInteractionService.js';
import { differenceInHours } from 'date-fns';

@injectable()
export class DrugInteractionService implements IDrugInteractionService {
  private readonly baseUrl = 'https://api.fda.gov/drug/label.json';
  private readonly interactionCache: NodeCache;

  constructor(
    @inject(TYPES.Logger) private readonly logger: Logger
  ) {
    this.interactionCache = new NodeCache({
      stdTTL: INTERACTION_CONSTANTS.CACHE_DURATION_DAYS * 24 * 60 * 60, // Convert days to seconds
      maxKeys: INTERACTION_CONSTANTS.MAX_CACHE_SIZE
    });
  }

  @monitorPerformance('get_drug_interactions')
  public async getDrugInteractions(drugName: string): Promise<DrugInteractionData | null> {
    try {
      // Check cache first
      const cacheKey = `interactions_${drugName.toLowerCase()}`;
      const cachedData = this.interactionCache.get<DrugInteractionData>(cacheKey);
      if (cachedData) {
        await auditLog('drug_interaction', 'cache_hit', { drugName });
        return cachedData;
      }

      // Query FDA API
      const params = {
        search: `openfda.brand_name:"${drugName}" OR openfda.generic_name:"${drugName}"`,
        limit: 1
      };

      const response = await axios.get(this.baseUrl, {
        params,
        timeout: INTERACTION_CONSTANTS.API_TIMEOUT_MS
      });

      if (!response.data.results?.[0]) {
        await auditLog('drug_interaction', 'not_found', { drugName });
        return null;
      }

      const data = this.parseInteractionData(response.data.results[0]);
      this.interactionCache.set(cacheKey, data);
      await auditLog('drug_interaction', 'api_success', { drugName });
      return data;

    } catch (error) {
      this.logger.error('Error getting drug interactions:', error);
      if (error instanceof AxiosError && error.response?.status === 404) {
        return null;
      }
      throw error instanceof ApiError ? error : new ApiError('Failed to get drug interactions', 500);
    }
  }

  @monitorPerformance('check_interaction')
  public async checkInteraction(
    med1Name: string,
    med2Name: string
  ): Promise<InteractionResult[]> {
    try {
      const [med1Data, med2Data] = await Promise.all([
        this.getDrugInteractions(med1Name),
        this.getDrugInteractions(med2Name)
      ]);

      if (!med1Data || !med2Data) {
        throw new ApiError('One or both medications not found', 404);
      }

      const interactions: InteractionResult[] = [];

      // Check if med2 is mentioned in med1's interactions
      for (const interaction of med1Data.drugInteractions) {
        if (interaction.toLowerCase().includes(med2Name.toLowerCase())) {
          interactions.push(this.createInteractionResult(
            'severe',
            'drug_interaction',
            med1Name,
            med2Name,
            interaction
          ));
        }
      }

      // Check if med1 is mentioned in med2's interactions
      for (const interaction of med2Data.drugInteractions) {
        if (interaction.toLowerCase().includes(med1Name.toLowerCase())) {
          interactions.push(this.createInteractionResult(
            'severe',
            'drug_interaction',
            med2Name,
            med1Name,
            interaction
          ));
        }
      }

      // Check warnings and precautions from med1
      for (const warning of [...med1Data.warnings, ...med1Data.precautions]) {
        if (warning.toLowerCase().includes(med2Name.toLowerCase())) {
          interactions.push(this.createInteractionResult(
            'moderate',
            'warning',
            med1Name,
            med2Name,
            warning
          ));
        }
      }

      // Check warnings and precautions from med2
      for (const warning of [...med2Data.warnings, ...med2Data.precautions]) {
        if (warning.toLowerCase().includes(med1Name.toLowerCase())) {
          interactions.push(this.createInteractionResult(
            'moderate',
            'warning',
            med2Name,
            med1Name,
            warning
          ));
        }
      }

      await auditLog('drug_interaction', 'check_complete', {
        med1Name,
        med2Name,
        interactionCount: interactions.length
      });

      return interactions;
    } catch (error) {
      this.logger.error('Error checking drug interaction:', error);
      throw error instanceof ApiError ? error : new ApiError('Failed to check drug interaction', 500);
    }
  }

  @monitorPerformance('check_timing_interaction')
  public async checkTimingInteraction(
    med1Name: string,
    med1Time: Date,
    med2Name: string,
    med2Time: Date
  ): Promise<TimingInteraction | null> {
    try {
      const hoursDifference = Math.abs(differenceInHours(med1Time, med2Time));
      
      if (hoursDifference < INTERACTION_CONSTANTS.MIN_HOURS_BETWEEN_DOSES) {
        const [med1Data, med2Data] = await Promise.all([
          this.getDrugInteractions(med1Name),
          this.getDrugInteractions(med2Name)
        ]);

        if (!med1Data || !med2Data) {
          return null;
        }

        return {
          med1Name,
          med2Name,
          timeDifference: hoursDifference,
          recommendation: `Consider spacing out ${med1Name} and ${med2Name} by at least ${INTERACTION_CONSTANTS.MIN_HOURS_BETWEEN_DOSES} hours`,
          severity: hoursDifference < 2 ? 'high' : 'moderate'
        };
      }

      return null;
    } catch (error) {
      this.logger.error('Error checking timing interaction:', error);
      throw error instanceof ApiError ? error : new ApiError('Failed to check timing interaction', 500);
    }
  }

  private createInteractionResult(
    severity: InteractionSeverity,
    type: InteractionType,
    sourceMed: string,
    targetMed: string,
    description: string
  ): InteractionResult {
    return {
      severity,
      type,
      sourceMed,
      targetMed,
      description,
      timestamp: new Date()
    };
  }

  private parseInteractionData(rawData: any): DrugInteractionData {
    return {
      drugInteractions: rawData.drug_interactions || [],
      warnings: rawData.boxed_warning || [],
      precautions: rawData.precautions || [],
      contraindications: rawData.contraindications || []
    };
  }
}
