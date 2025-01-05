import { liabilityProtection } from '../utils/liabilityProtection';

export interface Medication {
  id: string;
  name: string;
  dosage: string;
  frequency: string;
  purpose: string;
  startDate: string;
  endDate?: string;
  prescribedBy?: string;
  pharmacy?: string;
  instructions: string;
  sideEffects?: string[];
  interactions?: string[];
  requiresRefrigeration?: boolean;
  lastTaken?: string;
  nextDue?: string;
}

export interface MedicalCondition {
  id: string;
  name: string;
  diagnosedDate: string;
  severity: 'mild' | 'moderate' | 'severe';
  status: 'active' | 'managed' | 'resolved';
  symptoms: string[];
  treatments: string[];
  notes?: string;
}

export interface Allergy {
  id: string;
  allergen: string;
  severity: 'mild' | 'moderate' | 'severe';
  reactions: string[];
  diagnosed: string;
  notes?: string;
}

export interface EmergencyMedicalInfo {
  bloodType?: string;
  organDonor?: boolean;
  resuscitationPreference?: boolean;
  medications: Medication[];
  conditions: MedicalCondition[];
  allergies: Allergy[];
  emergencyNotes?: string;
  lastUpdated: string;
}

class MedicalInfoService {
  private medicalInfo: EmergencyMedicalInfo = {
    medications: [],
    conditions: [],
    allergies: [],
    lastUpdated: new Date().toISOString()
  };

  public async shareMedicalInfo(
    recipientId: string,
    accessLevel: {
      medications: boolean;
      conditions: boolean;
      allergies: boolean;
      fullAccess: boolean;
    }
  ): Promise<{
    success: boolean;
    sharedInfo: Partial<EmergencyMedicalInfo>;
    timestamp: string;
  }> {
    try {
      // Log sharing attempt
      liabilityProtection.logCriticalAction(
        'MEDICAL_INFO_SHARE_STARTED',
        'system',
        {
          recipientId,
          accessLevel,
          timestamp: new Date().toISOString()
        }
      );

      const sharedInfo: Partial<EmergencyMedicalInfo> = {
        lastUpdated: this.medicalInfo.lastUpdated
      };

      if (accessLevel.fullAccess || accessLevel.medications) {
        sharedInfo.medications = this.medicalInfo.medications;
      }

      if (accessLevel.fullAccess || accessLevel.conditions) {
        sharedInfo.conditions = this.medicalInfo.conditions;
      }

      if (accessLevel.fullAccess || accessLevel.allergies) {
        sharedInfo.allergies = this.medicalInfo.allergies;
      }

      if (accessLevel.fullAccess) {
        sharedInfo.bloodType = this.medicalInfo.bloodType;
        sharedInfo.organDonor = this.medicalInfo.organDonor;
        sharedInfo.resuscitationPreference = this.medicalInfo.resuscitationPreference;
        sharedInfo.emergencyNotes = this.medicalInfo.emergencyNotes;
      }

      // Log successful share
      liabilityProtection.logCriticalAction(
        'MEDICAL_INFO_SHARED',
        'system',
        {
          recipientId,
          sharedCategories: Object.keys(sharedInfo),
          timestamp: new Date().toISOString()
        }
      );

      return {
        success: true,
        sharedInfo,
        timestamp: new Date().toISOString()
      };
    } catch (error) {
      console.error('Failed to share medical info:', error);
      
      // Log share failure
      liabilityProtection.logCriticalAction(
        'MEDICAL_INFO_SHARE_FAILED',
        'system',
        {
          recipientId,
          error: error.message,
          timestamp: new Date().toISOString()
        }
      );

      throw error;
    }
  }

  public async updateMedicalInfo(
    updates: Partial<EmergencyMedicalInfo>
  ): Promise<void> {
    try {
      this.medicalInfo = {
        ...this.medicalInfo,
        ...updates,
        lastUpdated: new Date().toISOString()
      };

      // Log update
      liabilityProtection.logCriticalAction(
        'MEDICAL_INFO_UPDATED',
        'current-user',
        {
          updatedFields: Object.keys(updates),
          timestamp: new Date().toISOString()
        }
      );
    } catch (error) {
      console.error('Failed to update medical info:', error);
      throw error;
    }
  }

  public async addMedication(medication: Omit<Medication, 'id'>): Promise<string> {
    try {
      const id = crypto.randomUUID();
      const newMedication: Medication = {
        ...medication,
        id
      };

      this.medicalInfo.medications.push(newMedication);
      this.medicalInfo.lastUpdated = new Date().toISOString();

      // Log medication addition
      liabilityProtection.logCriticalAction(
        'MEDICATION_ADDED',
        'current-user',
        {
          medicationId: id,
          timestamp: new Date().toISOString()
        }
      );

      return id;
    } catch (error) {
      console.error('Failed to add medication:', error);
      throw error;
    }
  }

  public async updateMedication(
    id: string,
    updates: Partial<Medication>
  ): Promise<void> {
    try {
      const index = this.medicalInfo.medications.findIndex(m => m.id === id);
      if (index === -1) {
        throw new Error('Medication not found');
      }

      this.medicalInfo.medications[index] = {
        ...this.medicalInfo.medications[index],
        ...updates
      };

      this.medicalInfo.lastUpdated = new Date().toISOString();

      // Log medication update
      liabilityProtection.logCriticalAction(
        'MEDICATION_UPDATED',
        'current-user',
        {
          medicationId: id,
          updatedFields: Object.keys(updates),
          timestamp: new Date().toISOString()
        }
      );
    } catch (error) {
      console.error('Failed to update medication:', error);
      throw error;
    }
  }

  public async removeMedication(id: string): Promise<void> {
    try {
      const index = this.medicalInfo.medications.findIndex(m => m.id === id);
      if (index === -1) {
        throw new Error('Medication not found');
      }

      this.medicalInfo.medications.splice(index, 1);
      this.medicalInfo.lastUpdated = new Date().toISOString();

      // Log medication removal
      liabilityProtection.logCriticalAction(
        'MEDICATION_REMOVED',
        'current-user',
        {
          medicationId: id,
          timestamp: new Date().toISOString()
        }
      );
    } catch (error) {
      console.error('Failed to remove medication:', error);
      throw error;
    }
  }

  public async getMedicalInfoSnapshot(): Promise<EmergencyMedicalInfo> {
    try {
      // Log snapshot access
      liabilityProtection.logCriticalAction(
        'MEDICAL_INFO_ACCESSED',
        'current-user',
        {
          timestamp: new Date().toISOString()
        }
      );

      return { ...this.medicalInfo };
    } catch (error) {
      console.error('Failed to get medical info snapshot:', error);
      throw error;
    }
  }

  public async validateMedicalInfo(): Promise<{
    valid: boolean;
    issues: string[];
  }> {
    const issues: string[] = [];

    try {
      // Check medications
      this.medicalInfo.medications.forEach(med => {
        if (!med.name || !med.dosage || !med.frequency) {
          issues.push(`Incomplete medication info: ${med.id}`);
        }
      });

      // Check conditions
      this.medicalInfo.conditions.forEach(condition => {
        if (!condition.name || !condition.severity || !condition.status) {
          issues.push(`Incomplete condition info: ${condition.id}`);
        }
      });

      // Check allergies
      this.medicalInfo.allergies.forEach(allergy => {
        if (!allergy.allergen || !allergy.severity || !allergy.reactions) {
          issues.push(`Incomplete allergy info: ${allergy.id}`);
        }
      });

      return {
        valid: issues.length === 0,
        issues
      };
    } catch (error) {
      console.error('Failed to validate medical info:', error);
      throw error;
    }
  }
}

export const medicalInfoService = new MedicalInfoService();
