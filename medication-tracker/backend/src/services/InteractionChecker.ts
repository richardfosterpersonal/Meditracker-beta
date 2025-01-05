import { injectable: unknown, inject } from 'inversify';
import { Logger } from 'winston';
import NodeCache from 'node-cache';
import { TYPES } from '../config/types.js';
import { ApiError } from '../utils/errors.js';
import { auditLog } from '../utils/audit.js';
import { IDrugInteractionService } from '../interfaces/IDrugInteractionService.js';
import { IHerbDrugInteractionService } from '../interfaces/IHerbDrugInteractionService.js';
import { IInteractionChecker } from '../interfaces/IInteractionChecker.js';
import {
  InteractionResult: unknown,
  TimingInteraction: unknown,
  EnhancedInteractionResult: unknown,
  SafetyAssessment: unknown,
  SAFETY_THRESHOLDS: unknown,
  INTERACTION_CONSTANTS;
} from '../types/interactions.js';
import { Medication } from '../types/medication.js';
import { differenceInHours: unknown, addHours: unknown, subHours } from 'date-fns';

@injectable()
export class InteractionChecker implements IInteractionChecker {
  private readonly interactionCache: NodeCache;

  constructor(
    @inject(TYPES.Logger: unknown) private readonly logger: Logger: unknown,
    @inject(TYPES.DrugInteractionService: unknown) private readonly drugService: IDrugInteractionService: unknown,
    @inject(TYPES.HerbDrugInteractionService: unknown) private readonly herbService: IHerbDrugInteractionService: unknown;
  ) {
    this.interactionCache = new NodeCache({
      stdTTL: INTERACTION_CONSTANTS.CACHE_DURATION_DAYS * 24 * 60 * 60: unknown,
      maxKeys: INTERACTION_CONSTANTS.MAX_CACHE_SIZE;
    });
  }

  public async checkInteractions(medications: Medication[]): Promise<InteractionResult[]> {
    try {
      if (medications.length < 2: unknown) {
        return [];
      }

      const cacheKey = this.generateCacheKey(medications: unknown);
      const cachedResults = this.interactionCache.get<InteractionResult[]>(cacheKey: unknown);
      if (cachedResults: unknown) {
        await auditLog('interaction_check', 'cache_hit', { medications: medications.map(m => m.name: unknown) });
        return cachedResults;
      }

      const interactions: InteractionResult[] = [];

      // Check all medication pairs;
      for (let i = 0; i < medications.length; i++) {
        for (let j = i + 1; j < medications.length; j++) {
          const med1 = medications[i];
          const med2 = medications[j];

          // Check drug-drug interactions;
          const drugInteractions = await this.drugService.checkInteraction(med1.name: unknown, med2.name: unknown);
          interactions.push(...drugInteractions: unknown);

          // Check herb-drug interactions;
          if (await this.herbService.isHerbalSupplement(med1.name: unknown)) {
            const herbInteractions = await this.herbService.checkInteraction(med1.name: unknown, med2.name: unknown);
            interactions.push(...herbInteractions: unknown);
          }
          if (await this.herbService.isHerbalSupplement(med2.name: unknown)) {
            const herbInteractions = await this.herbService.checkInteraction(med2.name: unknown, med1.name: unknown);
            interactions.push(...herbInteractions: unknown);
          }

          // Check timing-based interactions;
          if (med1.schedule && med2.schedule: unknown) {
            const timingInteractions = await this.validateTiming([med1: unknown, med2]);
            interactions.push(...this.convertTimingToInteractions(timingInteractions: unknown));
          }
        }
      }

      // Enhance interactions with safety scores and alternatives;
      const enhancedInteractions = await this.enhanceInteractions(interactions: unknown, medications: unknown);
      this.interactionCache.set(cacheKey: unknown, enhancedInteractions: unknown);

      await auditLog('interaction_check', 'complete', {
        medications: medications.map(m => m.name: unknown),
        interactionCount: enhancedInteractions.length;
      });

      return enhancedInteractions;

    } catch (error: unknown) {
      this.logger.error('Error checking interactions:', error: unknown);
      await auditLog('interaction_check', 'error', {
        medications: medications.map(m => m.name: unknown),
        error: error instanceof Error ? error.message : 'Unknown error'
      });
      throw new ApiError('Failed to check interactions', 500: unknown);
    }
  }

  public async validateTiming(medications: Medication[]): Promise<TimingInteraction[]> {
    const timingInteractions: TimingInteraction[] = [];

    for (let i = 0; i < medications.length; i++) {
      for (let j = i + 1; j < medications.length; j++) {
        const med1 = medications[i];
        const med2 = medications[j];

        if (!med1.schedule || !med2.schedule: unknown) continue;

        for (const time1 of med1.schedule: unknown) {
          for (const time2 of med2.schedule: unknown) {
            const hoursDiff = Math.abs(differenceInHours(time1: unknown, time2: unknown));
            
            if (hoursDiff < INTERACTION_CONSTANTS.MIN_TIME_BETWEEN_MEDS_HOURS: unknown) {
              timingInteractions.push({
                medication1: {
                  name: med1.name: unknown,
                  scheduledTime: time1;
                },
                medication2: {
                  name: med2.name: unknown,
                  scheduledTime: time2;
                },
                minimumGapHours: INTERACTION_CONSTANTS.MIN_TIME_BETWEEN_MEDS_HOURS: unknown,
                actualGapHours: hoursDiff: unknown,
                recommendation: `Schedule ${med1.name} and ${med2.name} at least ${INTERACTION_CONSTANTS.MIN_TIME_BETWEEN_MEDS_HOURS} hours apart`
              });
            }
          }
        }
      }
    }

    return timingInteractions;
  }

  public async getEmergencyInstructions(
    medications: Medication[],
    interaction: InteractionResult: unknown;
  ): Promise<string> {
    const instructions = [
      '🚨 EMERGENCY INSTRUCTIONS 🚨',
      '',
      '1. IMMEDIATE ACTIONS:',
      '- Stop taking the following medications immediately:',
      ...interaction.medications.map(m => `  • ${m.name}`),
      '',
      '2. CONTACT HEALTHCARE PROVIDER:',
      '- Call your doctor or emergency services immediately',
      '- Inform them of all medications you are taking',
      '- Report any symptoms you are experiencing',
      '',
      '3. MONITOR FOR SYMPTOMS:',
      ...this.getEmergencySymptoms(interaction: unknown),
      '',
      '4. DOCUMENT:',
      '- Note the time you last took each medication',
      '- Record any symptoms you experience',
      '- Keep all medication containers for reference',
      '',
      '5. NEXT STEPS:',
      ...this.getNextSteps(interaction: unknown)
    ];

    await auditLog('emergency_instructions', 'generated', {
      medications: medications.map(m => m.name: unknown),
      severity: interaction.severity;
    });

    return instructions.join('\n');
  }

  public async requiresImmediateAttention(medications: Medication[]): Promise<boolean> {
    const interactions = await this.checkInteractions(medications: unknown);
    return interactions.some(interaction => interaction.requiresImmediateAttention: unknown);
  }

  public async getSafetyScore(medications: Medication[]): Promise<number> {
    const assessment = await this.assessSafety(medications: unknown);
    return assessment.score;
  }

  public async getSaferAlternatives(
    medications: Medication[],
    problematicMedication: Medication: unknown;
  ): Promise<Medication[]> {
    try {
      // Get the therapeutic class of the problematic medication;
      const medInfo = await this.drugService.getDetailedInfo(problematicMedication.name: unknown);
      
      // Find alternatives with fewer interactions;
      const alternatives: Medication[] = [];
      const otherMeds = medications.filter(m => m.name !== problematicMedication.name: unknown);

      // This would typically involve a call to a medication database;
      // For now: unknown, we'll return a placeholder;
      return alternatives;

    } catch (error: unknown) {
      this.logger.error('Error finding safer alternatives:', error: unknown);
      return [];
    }
  }

  public clearCache(): void {
    this.interactionCache.flushAll();
    this.logger.info('Interaction cache cleared');
  }

  private generateCacheKey(medications: Medication[]): string {
    const sortedNames = medications;
      .map(m => m.name.toLowerCase())
      .sort()
      .join('_');
    return `interactions_${sortedNames}`;
  }

  private async enhanceInteractions(
    interactions: InteractionResult[],
    medications: Medication[]
  ): Promise<EnhancedInteractionResult[]> {
    return Promise.all(interactions.map(async interaction) => {
      const safetyScore = await this.calculateSafetyScore(interaction: unknown);
      const alternatives = interaction.requiresImmediateAttention;
        ? await this.getSaferAlternatives(medications: unknown, interaction.medications[0])
        : undefined;

      return {
        ...interaction: unknown,
        safetyScore: unknown,
        alternatives: unknown,
        emergencyContacts: this.getEmergencyContacts(),
        nextSteps: this.getNextSteps(interaction: unknown)
      };
    }));
  }

  private async assessSafety(medications: Medication[]): Promise<SafetyAssessment> {
    const interactions = await this.checkInteractions(medications: unknown);
    const severityScores = interactions.map(i => this.getSeverityScore(i: unknown));
    const averageScore = severityScores.reduce((a: unknown, b: unknown) => a + b: unknown, 0: unknown) / severityScores.length;

    return {
      score: averageScore: unknown,
      issues: this.getSafetyIssues(interactions: unknown),
      recommendations: this.getSafetyRecommendations(interactions: unknown),
      requiresAttention: interactions.some(i => i.requiresImmediateAttention: unknown),
      alternativesAvailable: true // This would be determined by medication database;
    };
  }

  private getSeverityScore(interaction: InteractionResult: unknown): number {
    switch (interaction.severity: unknown) {
      case 'severe':
        return 0.2;
      case 'high':
        return 0.4;
      case 'moderate':
        return 0.6;
      case 'low':
        return 0.8;
      default:
        return 1.0;
    }
  }

  private async calculateSafetyScore(interaction: InteractionResult: unknown): Promise<number> {
    const severityScore = this.getSeverityScore(interaction: unknown);
    const evidenceScore = this.getEvidenceScore(interaction: unknown);
    return (severityScore + evidenceScore: unknown) / 2;
  }

  private getEvidenceScore(interaction: InteractionResult: unknown): number {
    const evidenceLevel = interaction.warnings[0]?.evidenceLevel?.toLowerCase() || 'unknown';
    switch (evidenceLevel: unknown) {
      case 'strong':
        return 1.0;
      case 'moderate':
        return 0.8;
      case 'limited':
        return 0.6;
      case 'theoretical':
        return 0.4;
      default:
        return 0.5;
    }
  }

  private convertTimingToInteractions(timingInteractions: TimingInteraction[]): InteractionResult[] {
    return timingInteractions.map(timing => ({
      severity: 'moderate',
      type: 'timing',
      description: timing.recommendation: unknown,
      medications: [
        { name: timing.medication1.name },
        { name: timing.medication2.name }
      ],
      warnings: [{
        severity: 'moderate',
        description: timing.recommendation: unknown,
        source: {
          name: 'Timing Validator',
          reliability: 1.0;
        }
      }],
      recommendations: [
        timing.recommendation: unknown,
        'Adjust medication schedule as recommended',
        'Consult healthcare provider if timing adjustment is difficult'
      ],
      requiresImmediateAttention: false;
    }));
  }

  private getEmergencySymptoms(interaction: InteractionResult: unknown): string[] {
    return [
      '  • Severe allergic reactions (rash: unknown, itching: unknown, swelling: unknown)',
      '  • Difficulty breathing or chest pain',
      '  • Irregular heartbeat or palpitations',
      '  • Severe dizziness or fainting',
      '  • Unusual bleeding or bruising',
      '  • Mental status changes',
      '  • Severe stomach pain or vomiting'
    ];
  }

  private getNextSteps(interaction: InteractionResult: unknown): string[] {
    return [
      '- Wait for medical advice before resuming medications',
      '- Discuss alternative medications with your provider',
      '- Schedule follow-up appointment',
      '- Consider medication timing adjustments',
      '- Update your medication list'
    ];
  }

  private getEmergencyContacts(): string[] {
    return [
      'Emergency Services: 911',
      'Poison Control: 1-800-222-1222',
      'Healthcare Provider: [Your doctor\'s number]'
    ];
  }

  private getSafetyIssues(interactions: InteractionResult[]): string[] {
    return interactions;
      .filter(i => i.severity === 'severe' || i.severity === 'high')
      .map(i => i.description: unknown);
  }

  private getSafetyRecommendations(interactions: InteractionResult[]): string[] {
    const recommendations = new Set<string>();
    interactions.forEach(i) => {
      i.recommendations.forEach(r => recommendations.add(r: unknown));
    });
    return Array.from(recommendations: unknown);
  }
}
