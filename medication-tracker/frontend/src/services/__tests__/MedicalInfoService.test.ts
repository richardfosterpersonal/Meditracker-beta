import { medicalInfoService } from '../MedicalInfoService';
import { liabilityProtection } from '../../utils/liabilityProtection';

// Mock the liabilityProtection module
jest.mock('../../utils/liabilityProtection', () => ({
  liabilityProtection: {
    logCriticalAction: jest.fn(),
  },
}));

// Mock crypto.randomUUID
const mockUUID = '123e4567-e89b-12d3-a456-426614174000';
global.crypto = {
  ...global.crypto,
  randomUUID: () => mockUUID,
};

describe('MedicalInfoService', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('shareMedicalInfo', () => {
    const mockRecipientId = 'recipient123';
    const mockAccessLevel = {
      medications: true,
      conditions: false,
      allergies: true,
      fullAccess: false,
    };

    it('should share medical info based on access level', async () => {
      const result = await medicalInfoService.shareMedicalInfo(mockRecipientId, mockAccessLevel);

      expect(result.success).toBe(true);
      expect(result.sharedInfo).toHaveProperty('medications');
      expect(result.sharedInfo).toHaveProperty('allergies');
      expect(result.sharedInfo).not.toHaveProperty('conditions');
      expect(result.timestamp).toBeTruthy();

      expect(liabilityProtection.logCriticalAction).toHaveBeenCalledWith(
        'MEDICAL_INFO_SHARE_STARTED',
        'system',
        expect.any(Object)
      );
    });

    it('should share all info when fullAccess is true', async () => {
      const fullAccessLevel = { ...mockAccessLevel, fullAccess: true };
      const result = await medicalInfoService.shareMedicalInfo(mockRecipientId, fullAccessLevel);

      expect(result.sharedInfo).toHaveProperty('medications');
      expect(result.sharedInfo).toHaveProperty('conditions');
      expect(result.sharedInfo).toHaveProperty('allergies');
      expect(result.sharedInfo).toHaveProperty('bloodType');
      expect(result.sharedInfo).toHaveProperty('organDonor');
    });

    it('should handle invalid recipient IDs', async () => {
      await expect(
        medicalInfoService.shareMedicalInfo('', mockAccessLevel)
      ).rejects.toThrow('Invalid recipient ID');

      expect(liabilityProtection.logCriticalAction).toHaveBeenCalledWith(
        'MEDICAL_INFO_SHARE_ERROR',
        'system',
        expect.any(Object)
      );
    });

    it('should validate access level configuration', async () => {
      const invalidAccessLevel = { medications: 'true' };
      await expect(
        // @ts-ignore - Testing invalid type
        medicalInfoService.shareMedicalInfo(mockRecipientId, invalidAccessLevel)
      ).rejects.toThrow('Invalid access level configuration');
    });

    it('should handle emergency share requests with priority', async () => {
      const emergencyAccessLevel = {
        ...mockAccessLevel,
        emergency: true,
        fullAccess: true
      };
      
      const result = await medicalInfoService.shareMedicalInfo(
        mockRecipientId,
        emergencyAccessLevel
      );

      expect(result.success).toBe(true);
      expect(result.priority).toBe('emergency');
      expect(result.sharedInfo).toHaveProperty('medications');
      expect(result.sharedInfo).toHaveProperty('conditions');
      expect(result.sharedInfo).toHaveProperty('allergies');
      expect(result.sharedInfo).toHaveProperty('emergencyNotes');
      
      expect(liabilityProtection.logCriticalAction).toHaveBeenCalledWith(
        'EMERGENCY_INFO_SHARE',
        'system',
        expect.any(Object)
      );
    });
  });

  describe('medication management', () => {
    const mockMedication = {
      name: 'Test Med',
      dosage: '10mg',
      frequency: 'daily',
      purpose: 'testing',
      startDate: '2024-01-01',
      instructions: 'Take with food',
    };

    it('should add a new medication', async () => {
      const id = await medicalInfoService.addMedication(mockMedication);
      expect(id).toBe(mockUUID);

      const snapshot = await medicalInfoService.getMedicalInfoSnapshot();
      expect(snapshot.medications).toHaveLength(1);
      expect(snapshot.medications[0]).toEqual({
        ...mockMedication,
        id: mockUUID,
      });
    });

    it('should update an existing medication', async () => {
      const id = await medicalInfoService.addMedication(mockMedication);
      const updates = { dosage: '20mg' };
      
      await medicalInfoService.updateMedication(id, updates);
      
      const snapshot = await medicalInfoService.getMedicalInfoSnapshot();
      expect(snapshot.medications[0].dosage).toBe('20mg');
      expect(liabilityProtection.logCriticalAction).toHaveBeenCalledWith(
        'MEDICATION_UPDATED',
        'current-user',
        expect.any(Object)
      );
    });

    it('should remove a medication', async () => {
      const id = await medicalInfoService.addMedication(mockMedication);
      await medicalInfoService.removeMedication(id);
      
      const snapshot = await medicalInfoService.getMedicalInfoSnapshot();
      expect(snapshot.medications).toHaveLength(0);
      expect(liabilityProtection.logCriticalAction).toHaveBeenCalledWith(
        'MEDICATION_REMOVED',
        'current-user',
        expect.any(Object)
      );
    });

    it('should throw error when updating non-existent medication', async () => {
      await expect(
        medicalInfoService.updateMedication('non-existent', { dosage: '20mg' })
      ).rejects.toThrow('Medication not found');
    });
  });

  describe('validateMedicalInfo', () => {
    it('should validate complete medical info', async () => {
      const mockMedication = {
        name: 'Test Med',
        dosage: '10mg',
        frequency: 'daily',
        purpose: 'testing',
        startDate: '2024-01-01',
        instructions: 'Take with food',
      };
      
      await medicalInfoService.addMedication(mockMedication);
      const validation = await medicalInfoService.validateMedicalInfo();
      
      expect(validation.valid).toBe(true);
      expect(validation.issues).toHaveLength(0);
    });

    it('should identify incomplete medical info', async () => {
      const incompleteMedication = {
        name: '',  // Missing required field
        dosage: '10mg',
        frequency: 'daily',
        purpose: 'testing',
        startDate: '2024-01-01',
        instructions: 'Take with food',
      };
      
      await medicalInfoService.addMedication(incompleteMedication as any);
      const validation = await medicalInfoService.validateMedicalInfo();
      
      expect(validation.valid).toBe(false);
      expect(validation.issues.length).toBeGreaterThan(0);
    });
  });

  describe('getMedicalInfoSnapshot', () => {
    it('should return a copy of medical info', async () => {
      const snapshot1 = await medicalInfoService.getMedicalInfoSnapshot();
      const snapshot2 = await medicalInfoService.getMedicalInfoSnapshot();
      
      expect(snapshot1).toEqual(snapshot2);
      expect(snapshot1).not.toBe(snapshot2);  // Different object references
      
      expect(liabilityProtection.logCriticalAction).toHaveBeenCalledWith(
        'MEDICAL_INFO_ACCESSED',
        'current-user',
        expect.any(Object)
      );
    });

    it('should handle empty medical info gracefully', async () => {
      // @ts-ignore - Testing internal state
      medicalInfoService.clearMedicalInfo();
      
      const snapshot = await medicalInfoService.getMedicalInfoSnapshot();
      expect(snapshot).toEqual({
        medications: [],
        conditions: [],
        allergies: [],
        lastUpdated: expect.any(String)
      });
    });

    it('should maintain data integrity across snapshots', async () => {
      const snapshot1 = await medicalInfoService.getMedicalInfoSnapshot();
      
      // Attempt to modify the snapshot
      if (snapshot1.medications) {
        snapshot1.medications.push({
          id: 'test',
          name: 'Test Med',
          dosage: '10mg',
          frequency: 'daily',
          instructions: 'Take with food',
          startDate: new Date().toISOString()
        });
      }
      
      const snapshot2 = await medicalInfoService.getMedicalInfoSnapshot();
      expect(snapshot2.medications).not.toContainEqual({
        id: 'test',
        name: 'Test Med',
        dosage: '10mg',
        frequency: 'daily',
        instructions: 'Take with food',
        startDate: expect.any(String)
      });
    });

    it('should include emergency-specific fields in snapshots', async () => {
      const snapshot = await medicalInfoService.getMedicalInfoSnapshot();
      expect(snapshot).toHaveProperty('bloodType');
      expect(snapshot).toHaveProperty('organDonor');
      expect(snapshot).toHaveProperty('resuscitationPreference');
      expect(snapshot).toHaveProperty('emergencyNotes');
    });
  });

  describe('updateMedicalInfo', () => {
    const mockUpdateInfo = {
      medications: [{
        id: 'med1',
        name: 'Test Medication',
        dosage: '10mg',
        frequency: 'daily',
        instructions: 'Take with food',
        startDate: new Date().toISOString()
      }],
      bloodType: 'A+',
      emergencyNotes: 'Test emergency notes'
    };

    it('should update medical info and log the change', async () => {
      const result = await medicalInfoService.updateMedicalInfo(mockUpdateInfo);
      
      expect(result.success).toBe(true);
      expect(result.timestamp).toBeTruthy();
      
      const snapshot = await medicalInfoService.getMedicalInfoSnapshot();
      expect(snapshot.medications).toContainEqual(mockUpdateInfo.medications[0]);
      expect(snapshot.bloodType).toBe(mockUpdateInfo.bloodType);
      expect(snapshot.emergencyNotes).toBe(mockUpdateInfo.emergencyNotes);
      
      expect(liabilityProtection.logCriticalAction).toHaveBeenCalledWith(
        'MEDICAL_INFO_UPDATE',
        'system',
        expect.any(Object)
      );
    });

    it('should validate medical info updates', async () => {
      const invalidUpdateInfo = {
        medications: [{
          id: 'med1',
          // Missing required fields
          name: 'Test Medication'
        }]
      };

      await expect(
        // @ts-ignore - Testing invalid type
        medicalInfoService.updateMedicalInfo(invalidUpdateInfo)
      ).rejects.toThrow('Invalid medical info update');
    });
  });
});
