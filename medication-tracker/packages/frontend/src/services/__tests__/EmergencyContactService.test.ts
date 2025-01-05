import { EmergencyContact } from '../../types/emergency';
import { emergencyContactService } from '../EmergencyContactService';
import { liabilityProtection } from '../../utils/liabilityProtection';

// Mock liabilityProtection
jest.mock('../../utils/liabilityProtection', () => ({
  liabilityProtection: {
    logCriticalAction: jest.fn(),
  },
}));

describe('EmergencyContactService', () => {
  const mockContact: Omit<EmergencyContact, 'id'> = {
    name: 'John Doe',
    relationship: 'Family',
    priority: 1,
    notificationMethods: {
      email: {
        address: 'john@example.com',
        verified: true,
      },
      phone: {
        number: '+1234567890',
        verified: true,
        canReceiveSMS: true,
      },
    },
    availability: {
      timezone: 'UTC',
    },
    accessLevel: {
      canViewMedicalHistory: true,
      canViewCurrentLocation: true,
      canViewMedications: true,
      canUpdateEmergencyStatus: false,
    },
  };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('addContact', () => {
    it('should add a contact and return an id', async () => {
      const id = await emergencyContactService.addContact(mockContact);
      
      expect(id).toBeTruthy();
      expect(typeof id).toBe('string');
      
      const savedContact = await emergencyContactService.getContact(id);
      expect(savedContact).toEqual({
        ...mockContact,
        id,
      });

      expect(liabilityProtection.logCriticalAction).toHaveBeenCalledWith(
        'EMERGENCY_CONTACT_ADDED',
        'current-user',
        expect.objectContaining({
          contactId: id,
          timestamp: expect.any(String),
        })
      );
    });
  });

  describe('updateContact', () => {
    it('should update an existing contact', async () => {
      const id = await emergencyContactService.addContact(mockContact);
      const updates = {
        name: 'Jane Doe',
        relationship: 'Spouse',
      };

      await emergencyContactService.updateContact(id, updates);
      
      const updatedContact = await emergencyContactService.getContact(id);
      expect(updatedContact).toEqual({
        ...mockContact,
        ...updates,
        id,
      });

      expect(liabilityProtection.logCriticalAction).toHaveBeenCalledWith(
        'EMERGENCY_CONTACT_UPDATED',
        'current-user',
        expect.objectContaining({
          contactId: id,
          timestamp: expect.any(String),
        })
      );
    });

    it('should throw error when updating non-existent contact', async () => {
      await expect(
        emergencyContactService.updateContact('non-existent', { name: 'Test' })
      ).rejects.toThrow('Contact not found');
    });
  });

  describe('removeContact', () => {
    it('should remove an existing contact', async () => {
      const id = await emergencyContactService.addContact(mockContact);
      await emergencyContactService.removeContact(id);
      
      const contact = await emergencyContactService.getContact(id);
      expect(contact).toBeNull();

      expect(liabilityProtection.logCriticalAction).toHaveBeenCalledWith(
        'EMERGENCY_CONTACT_REMOVED',
        'current-user',
        expect.objectContaining({
          contactId: id,
          timestamp: expect.any(String),
        })
      );
    });

    it('should throw error when removing non-existent contact', async () => {
      await expect(
        emergencyContactService.removeContact('non-existent')
      ).rejects.toThrow('Contact not found');
    });
  });

  describe('getAllContacts', () => {
    it('should return all contacts', async () => {
      const id1 = await emergencyContactService.addContact(mockContact);
      const id2 = await emergencyContactService.addContact({
        ...mockContact,
        name: 'Jane Doe',
        priority: 2,
      });

      const contacts = await emergencyContactService.getAllContacts();
      expect(contacts).toHaveLength(2);
      expect(contacts).toEqual(
        expect.arrayContaining([
          expect.objectContaining({ id: id1, name: 'John Doe' }),
          expect.objectContaining({ id: id2, name: 'Jane Doe' }),
        ])
      );
    });
  });

  describe('verifyContactMethod', () => {
    it('should verify email contact method', async () => {
      const id = await emergencyContactService.addContact(mockContact);
      const result = await emergencyContactService.verifyContactMethod(
        id,
        'email',
        'john@example.com'
      );

      expect(result).toBe(true);
      const contact = await emergencyContactService.getContact(id);
      expect(contact?.notificationMethods.email?.verified).toBe(true);
      expect(contact?.notificationMethods.email?.lastVerified).toBeTruthy();
    });

    it('should verify phone contact method', async () => {
      const id = await emergencyContactService.addContact(mockContact);
      const result = await emergencyContactService.verifyContactMethod(
        id,
        'phone',
        '+1234567890'
      );

      expect(result).toBe(true);
      const contact = await emergencyContactService.getContact(id);
      expect(contact?.notificationMethods.phone?.verified).toBe(true);
      expect(contact?.notificationMethods.phone?.lastVerified).toBeTruthy();
    });
  });
});
