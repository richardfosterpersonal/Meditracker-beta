import { injectable, inject } from 'inversify';
import { Logger } from 'winston';
import axios from 'axios';
import NodeCache from 'node-cache';
import { 
  MedicationVariant, 
  MedicationForm, 
  MedicationFormKey,
  DosageUnit,
  MedicationStrength,
  MedicationDetails
} from '@/types/medication.js';
import { IMedicationReferenceService } from '@/interfaces/IMedicationReferenceService.js';
import { TYPES } from '@/config/types.js';
import { ApiError } from '@/utils/errors.js';
import { auditLog } from '@/utils/audit.js';
import { monitorPerformance } from '@/utils/monitoring.js';

@injectable()
export class MedicationReferenceService implements IMedicationReferenceService {
  private readonly fdaBaseUrl = 'https://api.fda.gov/drug';
  private readonly dailymedBaseUrl = 'https://dailymed.nlm.nih.gov/dailymed/services';
  private readonly ndcBaseUrl = 'https://ndclist.com/api/v1';
  private readonly medicationCache: NodeCache;
  private readonly dosageForms: Record<MedicationFormKey, MedicationForm>;

  constructor(
    @inject(TYPES.Logger) private readonly logger: Logger
  ) {
    this.medicationCache = new NodeCache({ stdTTL: 86400 });
    this.dosageForms = this.initializeDosageForms();
  }

  private initializeDosageForms(): Record<MedicationFormKey, MedicationForm> {
    return {
      TABLET: {
        form: 'Tablet',
        route: 'oral',
        dosageUnits: ['mg', 'mcg', 'g'],
        commonDosages: ['5mg', '10mg', '20mg', '25mg', '50mg', '100mg', '200mg', '500mg']
      },
      TABLET_EXTENDED_RELEASE: {
        form: 'Extended Release Tablet',
        route: 'oral',
        dosageUnits: ['mg', 'mcg', 'g'],
        commonDosages: ['10mg', '20mg', '50mg', '100mg']
      },
      CAPSULE: {
        form: 'Capsule',
        route: 'oral',
        dosageUnits: ['mg', 'mcg', 'g'],
        commonDosages: ['5mg', '10mg', '20mg', '50mg', '100mg']
      },
      LIQUID: {
        form: 'Liquid',
        route: 'oral',
        dosageUnits: ['ml', 'mg/ml'],
        commonDosages: ['5ml', '10ml', '15ml', '20ml']
      },
      INJECTION: {
        form: 'Injection',
        route: 'injection',
        dosageUnits: ['mg/ml', 'mcg/ml'],
        commonDosages: ['1mg/ml', '2mg/ml', '5mg/ml', '10mg/ml']
      }
    };
  }

  @monitorPerformance('getMedicationVariants')
  public async getMedicationVariants(medicationName: string): Promise<MedicationVariant[]> {
    try {
      const cacheKey = `med_variants_${medicationName}`;
      const cachedData = this.medicationCache.get<MedicationVariant[]>(cacheKey);
      
      if (cachedData) {
        return cachedData;
      }

      const response = await axios.get(`${this.fdaBaseUrl}/ndc.json`, {
        params: {
          search: `generic_name:"${medicationName}" OR brand_name:"${medicationName}"`,
          limit: 10
        }
      });

      const variants = this.processMedicationData(response.data);
      this.medicationCache.set(cacheKey, variants);
      
      return variants;
    } catch (error) {
      this.logger.error('Error fetching medication variants:', error);
      throw new ApiError('Failed to fetch medication variants', 500);
    }
  }

  @monitorPerformance('validateDosageForForm')
  public async validateDosageForForm(form: MedicationFormKey, value: number, unit: DosageUnit): Promise<boolean> {
    try {
      if (!this.dosageForms[form]) {
        throw new ApiError(`Invalid medication form: ${form}`, 400);
      }

      const formConfig = this.dosageForms[form];
      
      if (!formConfig.dosageUnits.includes(unit)) {
        throw new ApiError(`Invalid dosage unit ${unit} for form ${form}`, 400);
      }

      // Implement form-specific validation logic here
      await auditLog('medication_validation', {
        form,
        value,
        unit,
        result: true
      });

      return true;
    } catch (error) {
      this.logger.error('Error validating dosage:', error);
      throw error;
    }
  }

  private processMedicationData(data: any): MedicationVariant[] {
    try {
      return data.results.map((result: any) => ({
        name: result.generic_name[0],
        form: result.dosage_form[0],
        strengths: this.processStrengths(result.active_ingredients),
        route: result.route[0],
        manufacturer: result.labeler_name
      }));
    } catch (error) {
      this.logger.error('Error processing medication data:', error);
      throw new ApiError('Failed to process medication data', 500);
    }
  }

  private processStrengths(ingredients: any[]): MedicationStrength[] {
    return ingredients.map(ingredient => ({
      value: parseFloat(ingredient.strength),
      unit: ingredient.unit,
      form: ingredient.form || 'standard'
    }));
  }
}
