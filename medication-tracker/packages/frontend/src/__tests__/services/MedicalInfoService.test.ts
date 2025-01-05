import { medicalInfoService } from '../../services/MedicalInfoService';
import { liabilityProtection } from '../../utils/liabilityProtection';

jest.mock('../../utils/liabilityProtection');

describe('MedicalInfoService', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  const mockMedication = {
    name: 'Test Medication',
    dosage: '10mg',
    frequency: 'Daily',
    purpose: 'Testing',
    startDate: '2024-01-01',
    instructions: 'Take with food',
    sideEffects: ['drowsiness'],
    interactions: ['alcohol'],
  };

  describe('Medication Management', () => {
    it('should add medication successfully', async () => {
      const medicationId = await medicalInfoService.addMedication(mockMedication);

      expect(medicationId).toBeDefined();
      expect(typeof medicationId).toBe('string');
      expect(liabilityProtection.logCriticalAction).toHaveBeenCalledWith(
        'MEDICATION_ADDED',
        'current-user',
        expect.any(Object)
      );
    });

    it('should update medication successfully', async () => {
      const medicationId = await medicalInfoService.addMedication(mockMedication);
      const updates = {
        dosage: '20mg',
        frequency: 'Twice daily',
      };

      await medicalInfoService.updateMedication(medicationId, updates);
      const snapshot = await medicalInfoService.getMedicalInfoSnapshot();
      const updatedMed = snapshot.medications.find(m => m.id === medicationId);

      expect(updatedMed?.dosage).toBe(updates.dosage);
      expect(updatedMed?.frequency).toBe(updates.frequency);
      expect(liabilityProtection.logCriticalAction).toHaveBeenCalledWith(
        'MEDICATION_UPDATED',
        'current-user',
        expect.any(Object)
      );
    });

    it('should remove medication successfully', async () => {
      const medicationId = await medicalInfoService.addMedication(mockMedication);
      await medicalInfoService.removeMedication(medicationId);

      const snapshot = await medicalInfoService.getMedicalInfoSnapshot();
      expect(snapshot.medications.find(m => m.id === medicationId)).toBeUndefined();
      expect(liabilityProtection.logCriticalAction).toHaveBeenCalledWith(
        'MEDICATION_REMOVED',
        'current-user',
        expect.any(Object)
      );
    });
  });

  describe('Medical Info Sharing', () => {
    it('should share medical info with proper access levels', async () => {
      const medicationId = await medicalInfoService.addMedication(mockMedication);
      
      const shareResult = await medicalInfoService.shareMedicalInfo('recipient-id', {
        medications: true,
        conditions: false,
        allergies: false,
        fullAccess: false,
      });

      expect(shareResult.success).toBe(true);
      expect(shareResult.sharedInfo.medications).toBeDefined();
      expect(shareResult.sharedInfo.conditions).toBeUndefined();
      expect(shareResult.sharedInfo.allergies).toBeUndefined();
      expect(liabilityProtection.logCriticalAction).toHaveBeenCalledWith(
        'MEDICAL_INFO_SHARED',
        'system',
        expect.any(Object)
      );
    });

    it('should share full medical info when fullAccess is true', async () => {
      await medicalInfoService.addMedication(mockMedication);
      
      const shareResult = await medicalInfoService.shareMedicalInfo('recipient-id', {
        medications: false,
        conditions: false,
        allergies: false,
        fullAccess: true,
      });

      expect(shareResult.success).toBe(true);
      expect(shareResult.sharedInfo.medications).toBeDefined();
      expect(shareResult.sharedInfo.conditions).toBeDefined();
      expect(shareResult.sharedInfo.allergies).toBeDefined();
      expect(shareResult.sharedInfo.bloodType).toBeDefined();
    });
  });

  describe('Medical Info Validation', () => {
    it('should identify incomplete medication information', async () => {
      const incompleteMedication = {
        name: 'Test Med',
        // Missing required fields
      };

      await medicalInfoService.addMedication(incompleteMedication as any);
      const validation = await medicalInfoService.validateMedicalInfo();

      expect(validation.valid).toBe(false);
      expect(validation.issues.length).toBeGreaterThan(0);
      expect(validation.issues[0]).toContain('Incomplete medication info');
    });

    it('should validate complete medical information', async () => {
      await medicalInfoService.addMedication(mockMedication);
      const validation = await medicalInfoService.validateMedicalInfo();

      expect(validation.valid).toBe(true);
      expect(validation.issues.length).toBe(0);
    });
  });

  describe('Medical Info Snapshot', () => {
    it('should return current medical info snapshot', async () => {
      await medicalInfoService.addMedication(mockMedication);
      const snapshot = await medicalInfoService.getMedicalInfoSnapshot();

      expect(snapshot.medications.length).toBeGreaterThan(0);
      expect(snapshot.lastUpdated).toBeDefined();
      expect(liabilityProtection.logCriticalAction).toHaveBeenCalledWith(
        'MEDICAL_INFO_ACCESSED',
        'current-user',
        expect.any(Object)
      );
    });

    it('should update lastUpdated timestamp when info changes', async () => {
      const initialSnapshot = await medicalInfoService.getMedicalInfoSnapshot();
      await new Promise(resolve => setTimeout(resolve, 100)); // Small delay
      
      await medicalInfoService.addMedication(mockMedication);
      const updatedSnapshot = await medicalInfoService.getMedicalInfoSnapshot();

      expect(new Date(updatedSnapshot.lastUpdated).getTime())
        .toBeGreaterThan(new Date(initialSnapshot.lastUpdated).getTime());
    });
  });
});
