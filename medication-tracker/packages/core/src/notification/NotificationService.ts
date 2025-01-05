import { User, Medication, AppEvent } from '@medication-tracker/shared';
import { MedicationService } from '../medication/MedicationService';

export interface NotificationProvider {
  sendNotification(user: User, message: string): Promise<void>;
}

export class NotificationService {
  private medicationService: MedicationService;
  private providers: NotificationProvider[];

  constructor(providers: NotificationProvider[] = []) {
    this.medicationService = new MedicationService();
    this.providers = providers;
  }

  async sendMedicationReminder(user: User, medication: Medication): Promise<void> {
    const nextDose = this.medicationService.calculateNextDose(medication);
    const message = this.generateReminderMessage(medication, nextDose);

    await Promise.all(
      this.providers.map(provider => provider.sendNotification(user, message))
    );

    // Emit reminder sent event
    const event: AppEvent<{ userId: string; medicationId: string }> = {
      type: 'REMINDER_SENT',
      payload: {
        userId: user.id,
        medicationId: medication.id
      },
      timestamp: new Date().toISOString(),
      source: 'notification-service'
    };

    // TODO: Emit event to event bus
    console.log('Event emitted:', event);
  }

  private generateReminderMessage(medication: Medication, nextDose: Date): string {
    const timeStr = nextDose.toLocaleTimeString('en-US', {
      hour: 'numeric',
      minute: 'numeric',
      hour12: true
    });

    return `Time to take ${medication.name} (${medication.dosage.amount} ${medication.dosage.unit}) at ${timeStr}.${
      medication.instructions ? ` Instructions: ${medication.instructions}` : ''
    }`;
  }

  async sendLowSupplyAlert(user: User, medication: Medication): Promise<void> {
    if (!medication.supply) return;

    const { currentQuantity, reorderPoint, unit } = medication.supply;
    if (currentQuantity <= reorderPoint) {
      const message = `Low supply alert: ${medication.name} is running low (${currentQuantity} ${unit} remaining).`;
      
      await Promise.all(
        this.providers.map(provider => provider.sendNotification(user, message))
      );

      // Emit low supply event
      const event: AppEvent<{ userId: string; medicationId: string; currentQuantity: number }> = {
        type: 'LOW_SUPPLY_ALERT',
        payload: {
          userId: user.id,
          medicationId: medication.id,
          currentQuantity
        },
        timestamp: new Date().toISOString(),
        source: 'notification-service'
      };

      // TODO: Emit event to event bus
      console.log('Event emitted:', event);
    }
  }

  async sendRefillReminder(user: User, medication: Medication): Promise<void> {
    if (!medication.supply?.supplier) return;

    const message = `Time to refill ${medication.name}. Please contact ${medication.supply.supplier.name} ${
      medication.supply.supplier.phone ? `at ${medication.supply.supplier.phone}` : ''
    } to arrange a refill.`;

    await Promise.all(
      this.providers.map(provider => provider.sendNotification(user, message))
    );

    // Emit refill reminder event
    const event: AppEvent<{ userId: string; medicationId: string }> = {
      type: 'REFILL_REMINDER_SENT',
      payload: {
        userId: user.id,
        medicationId: medication.id
      },
      timestamp: new Date().toISOString(),
      source: 'notification-service'
    };

    // TODO: Emit event to event bus
    console.log('Event emitted:', event);
  }
}
