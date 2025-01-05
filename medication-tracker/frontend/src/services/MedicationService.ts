import { EventTrackingService } from './monitoring/EventTrackingService';
import { OfflineQueueService } from './offline/OfflineQueueService';
import { NetworkService } from './network/NetworkService';
import { HIPAAComplianceService } from './security/HIPAAComplianceService';
import { Medication, MedicationDose, MedicationSchedule } from '../types/medication';

export class MedicationService {
  private static instance: MedicationService;
  private eventTracking: EventTrackingService;
  private offlineQueue: OfflineQueueService;
  private networkService: NetworkService;
  private hipaaCompliance: HIPAAComplianceService;

  private constructor() {
    this.eventTracking = EventTrackingService.getInstance();
    this.offlineQueue = OfflineQueueService.getInstance();
    this.networkService = NetworkService.getInstance();
    this.hipaaCompliance = HIPAAComplianceService.getInstance();
  }

  public static getInstance(): MedicationService {
    if (!MedicationService.instance) {
      MedicationService.instance = new MedicationService();
    }
    return MedicationService.instance;
  }

  public async addMedication(medication: Omit<Medication, 'id'>): Promise<Medication> {
    try {
      const response = await fetch('/api/v1/medications', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(medication)
      });

      if (!response.ok) throw new Error('Failed to add medication');

      const newMedication = await response.json();

      // Track the event
      await this.eventTracking.trackEvent({
        type: 'MEDICATION_ADDED',
        category: 'medication',
        action: 'added',
        metadata: {
          medicationId: newMedication.id,
          name: newMedication.name,
          schedule: newMedication.schedule
        },
        userId: medication.userId
      });

      return newMedication;
    } catch (error) {
      console.error('Error adding medication:', error);
      throw error;
    }
  }

  public async recordDose(medicationId: string, dose: MedicationDose): Promise<void> {
    try {
      const response = await fetch(`/api/v1/medications/${medicationId}/doses`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(dose)
      });

      if (!response.ok) throw new Error('Failed to record dose');

      // Track the event
      await this.eventTracking.trackEvent({
        type: 'MEDICATION_TAKEN',
        category: 'medication',
        action: 'taken',
        metadata: {
          medicationId,
          doseTime: dose.takenAt,
          scheduledTime: dose.scheduledFor
        },
        userId: dose.userId
      });
    } catch (error) {
      // If offline, queue the dose recording
      if (!this.networkService.isOnline()) {
        await this.offlineQueue.add({
          type: 'RECORD_DOSE',
          data: { medicationId, dose },
          priority: 'high'
        });
      } else {
        console.error('Error recording dose:', error);
        throw error;
      }
    }
  }

  public async updateSchedule(
    medicationId: string, 
    schedule: MedicationSchedule
  ): Promise<void> {
    try {
      const response = await fetch(`/api/v1/medications/${medicationId}/schedule`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(schedule)
      });

      if (!response.ok) throw new Error('Failed to update schedule');

      // Track the event
      await this.eventTracking.trackEvent({
        type: 'SCHEDULE_UPDATED',
        category: 'medication',
        action: 'schedule_updated',
        metadata: {
          medicationId,
          newSchedule: this.hipaaCompliance.sanitize(schedule)
        },
        userId: schedule.userId
      });
    } catch (error) {
      console.error('Error updating schedule:', error);
      throw error;
    }
  }

  public async deleteMedication(medicationId: string, userId: string): Promise<void> {
    try {
      const response = await fetch(`/api/v1/medications/${medicationId}`, {
        method: 'DELETE'
      });

      if (!response.ok) throw new Error('Failed to delete medication');

      // Track the event
      await this.eventTracking.trackEvent({
        type: 'MEDICATION_DELETED',
        category: 'medication',
        action: 'deleted',
        metadata: {
          medicationId
        },
        userId,
        critical: true // Important for audit trails
      });
    } catch (error) {
      console.error('Error deleting medication:', error);
      throw error;
    }
  }

  public async getMedicationHistory(
    medicationId: string,
    startDate: Date,
    endDate: Date
  ): Promise<MedicationDose[]> {
    try {
      const response = await fetch(
        `/api/v1/medications/${medicationId}/history?` +
        `start=${startDate.toISOString()}&end=${endDate.toISOString()}`
      );

      if (!response.ok) throw new Error('Failed to fetch medication history');

      const history = await response.json();

      // Track the access event (important for HIPAA compliance)
      await this.eventTracking.trackEvent({
        type: 'HISTORY_ACCESSED',
        category: 'medication',
        action: 'history_accessed',
        metadata: {
          medicationId,
          dateRange: {
            start: startDate.toISOString(),
            end: endDate.toISOString()
          }
        },
        userId: 'current-user' // Should be replaced with actual user ID
      });

      return history;
    } catch (error) {
      console.error('Error fetching medication history:', error);
      throw error;
    }
  }
}
