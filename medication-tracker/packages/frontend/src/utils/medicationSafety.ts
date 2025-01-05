import { openDB } from 'idb';
import { AuditLogger } from './auditLog';

export interface MedicationInteraction {
  medicationA: string;
  medicationB: string;
  severity: 'high' | 'moderate' | 'low';
  description: string;
  recommendation: string;
}

export interface DosageCheck {
  medicationId: string;
  lastDose: Date;
  minimumInterval: number; // in minutes
  maximumDailyDoses: number;
}

interface SafetyCheckResult {
  safe: boolean;
  warnings: string[];
  errors: string[];
  interactions: MedicationInteraction[];
}

export class MedicationSafety {
  private static readonly DB_NAME = 'medication-safety';
  private static readonly STORE_DOSES = 'recent-doses';
  private static readonly STORE_INTERACTIONS = 'interactions';

  private static async getDB() {
    return openDB(this.DB_NAME, 1, {
      upgrade(db) {
        // Store for recent doses
        db.createObjectStore(this.STORE_DOSES, {
          keyPath: ['medicationId', 'timestamp'],
        });

        // Store for known interactions
        db.createObjectStore(this.STORE_INTERACTIONS, {
          keyPath: ['medicationA', 'medicationB'],
        });
      },
    });
  }

  static async checkSafety(
    medicationId: string,
    userId: string,
    proposedTime: Date = new Date()
  ): Promise<SafetyCheckResult> {
    const result: SafetyCheckResult = {
      safe: true,
      warnings: [],
      errors: [],
      interactions: [],
    };

    try {
      // Check for double dosing
      const doubleDoseCheck = await this.checkDoubleDose(medicationId, proposedTime);
      if (!doubleDoseCheck.safe) {
        result.safe = false;
        result.errors.push(doubleDoseCheck.error);
      }

      // Check for daily limit
      const dailyLimitCheck = await this.checkDailyLimit(medicationId, proposedTime);
      if (!dailyLimitCheck.safe) {
        result.safe = false;
        result.errors.push(dailyLimitCheck.error);
      }

      // Check for interactions with other medications
      const interactions = await this.checkInteractions(medicationId, userId);
      if (interactions.length > 0) {
        result.interactions = interactions;
        const severeInteractions = interactions.filter(i => i.severity === 'high');
        if (severeInteractions.length > 0) {
          result.safe = false;
          result.errors.push('Severe medication interaction detected');
        } else {
          result.warnings.push('Potential medication interaction detected');
        }
      }

      // Log safety check
      await AuditLogger.log(
        'medication_safety_check',
        userId,
        {
          medicationId,
          proposedTime: proposedTime.toISOString(),
          result: {
            safe: result.safe,
            warningCount: result.warnings.length,
            errorCount: result.errors.length,
            interactionCount: result.interactions.length,
          },
          success: true,
        },
        result.safe ? 'info' : 'warning'
      );

      return result;
    } catch (error) {
      console.error('Safety check failed:', error);
      await AuditLogger.log(
        'medication_safety_check_failed',
        userId,
        {
          medicationId,
          proposedTime: proposedTime.toISOString(),
          error: error.message,
          success: false,
        },
        'error'
      );

      throw new Error('Failed to perform medication safety check');
    }
  }

  private static async checkDoubleDose(
    medicationId: string,
    proposedTime: Date
  ): Promise<{ safe: boolean; error?: string }> {
    const db = await this.getDB();
    const minimumInterval = 60; // 60 minutes minimum between doses

    // Get recent doses
    const recentDoses = await db.getAllFromIndex(
      this.STORE_DOSES,
      'medicationId',
      medicationId
    );

    // Check if any dose is too close to the proposed time
    const tooRecentDose = recentDoses.find(dose => {
      const timeDiff = Math.abs(proposedTime.getTime() - new Date(dose.timestamp).getTime());
      const minutesDiff = timeDiff / (1000 * 60);
      return minutesDiff < minimumInterval;
    });

    if (tooRecentDose) {
      return {
        safe: false,
        error: `Too soon for next dose. Please wait at least ${minimumInterval} minutes between doses.`,
      };
    }

    return { safe: true };
  }

  private static async checkDailyLimit(
    medicationId: string,
    proposedTime: Date
  ): Promise<{ safe: boolean; error?: string }> {
    const db = await this.getDB();
    const maximumDailyDoses = 4; // Example maximum daily doses

    // Get today's doses
    const startOfDay = new Date(proposedTime);
    startOfDay.setHours(0, 0, 0, 0);
    
    const endOfDay = new Date(proposedTime);
    endOfDay.setHours(23, 59, 59, 999);

    const todayDoses = await db.getAllFromIndex(
      this.STORE_DOSES,
      'timestamp',
      IDBKeyRange.bound(startOfDay, endOfDay)
    );

    if (todayDoses.length >= maximumDailyDoses) {
      return {
        safe: false,
        error: `Maximum daily doses (${maximumDailyDoses}) reached for this medication.`,
      };
    }

    return { safe: true };
  }

  private static async checkInteractions(
    medicationId: string,
    userId: string
  ): Promise<MedicationInteraction[]> {
    const db = await this.getDB();
    const userMedications = await this.getUserActiveMedications(userId);
    const interactions: MedicationInteraction[] = [];

    for (const otherMedId of userMedications) {
      if (otherMedId === medicationId) continue;

      const interaction = await db.get(this.STORE_INTERACTIONS, [
        medicationId,
        otherMedId,
      ]);

      if (interaction) {
        interactions.push(interaction);
      }
    }

    return interactions;
  }

  static async recordDose(
    medicationId: string,
    userId: string,
    timestamp: Date = new Date()
  ): Promise<void> {
    const db = await this.getDB();
    
    await db.add(this.STORE_DOSES, {
      medicationId,
      userId,
      timestamp: timestamp.toISOString(),
    });

    // Cleanup old records (keep last 30 days)
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
    
    const tx = db.transaction(this.STORE_DOSES, 'readwrite');
    const store = tx.store;
    
    let cursor = await store.openCursor();
    while (cursor) {
      if (new Date(cursor.value.timestamp) < thirtyDaysAgo) {
        await cursor.delete();
      }
      cursor = await cursor.continue();
    }
  }

  private static async getUserActiveMedications(userId: string): Promise<string[]> {
    // This would typically come from your medication service
    // For now, return a mock list
    return ['med1', 'med2', 'med3'];
  }

  static async addInteraction(interaction: MedicationInteraction): Promise<void> {
    const db = await this.getDB();
    await db.add(this.STORE_INTERACTIONS, interaction);
  }
}
