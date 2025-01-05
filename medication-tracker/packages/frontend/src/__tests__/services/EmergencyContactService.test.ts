import { emergencyContactService } from '../../services/EmergencyContactService';
import { liabilityProtection } from '../../utils/liabilityProtection';

// Mock the liability protection service
jest.mock('../../utils/liabilityProtection');

describe('EmergencyContactService', () => {
  beforeEach(() => {
    // Clear all mocks before each test
    jest.clearAllMocks();
  });

  describe('addContact', () => {
    const mockContact = {
      name: 'John Doe',
      relationship: 'Family',
      priority: 1,
      notificationMethods: {
        email: {
          address: 'john@example.com',
          verified: false,
        },
        phone: {
          number: '+1234567890',
          verified: false,
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

    it('should successfully add a contact', async () => {
      const contactId = await emergencyContactService.addContact(mockContact);
      
      expect(contactId).toBeDefined();
      expect(typeof contactId).toBe('string');
      expect(liabilityProtection.logCriticalAction).toHaveBeenCalledWith(
        'EMERGENCY_CONTACT_ADDED',
        'current-user',
        expect.any(Object)
      );
    });

    it('should throw error if contact data is invalid', async () => {
      const invalidContact = { ...mockContact, name: '' };
      
      await expect(emergencyContactService.addContact(invalidContact))
        .rejects
        .toThrow();
    });
  });

  describe('notifyContacts', () => {
    const mockEmergencyInfo = {
      severity: 'HIGH' as const,
      message: 'Emergency assistance needed',
    };

    it('should notify contacts in priority order', async () => {
      // Add test contacts
      const contact1 = await emergencyContactService.addContact({
        ...mockContact,
        priority: 1,
        name: 'First Contact',
      });
      const contact2 = await emergencyContactService.addContact({
        ...mockContact,
        priority: 2,
        name: 'Second Contact',
      });

      const result = await emergencyContactService.notifyContacts(mockEmergencyInfo);

      expect(result.notified).toContain(contact1);
      expect(result.notified).toContain(contact2);
      expect(liabilityProtection.logCriticalAction).toHaveBeenCalledWith(
        'EMERGENCY_CONTACT_NOTIFICATION_STARTED',
        'system',
        expect.any(Object)
      );
    });

    it('should handle failed notifications gracefully', async () => {
      // Mock a failed notification
      jest.spyOn(emergencyContactService as any, 'notifyContact')
        .mockRejectedValueOnce(new Error('Failed to send notification'));

      const contact = await emergencyContactService.addContact(mockContact);
      const result = await emergencyContactService.notifyContacts(mockEmergencyInfo);

      expect(result.failed).toContain(contact);
      expect(liabilityProtection.logCriticalAction).toHaveBeenCalledWith(
        'EMERGENCY_CONTACT_NOTIFICATION_STARTED',
        'system',
        expect.any(Object)
      );
    });
  });

  describe('verifyContactMethod', () => {
    it('should verify email successfully', async () => {
      const contact = await emergencyContactService.addContact(mockContact);
      const result = await emergencyContactService.verifyContactMethod(
        contact,
        'email',
        mockContact.notificationMethods.email!.address
      );

      expect(result).toBe(true);
      const updatedContact = await emergencyContactService.getContact(contact);
      expect(updatedContact?.notificationMethods.email?.verified).toBe(true);
    });

    it('should verify phone successfully', async () => {
      const contact = await emergencyContactService.addContact(mockContact);
      const result = await emergencyContactService.verifyContactMethod(
        contact,
        'phone',
        mockContact.notificationMethods.phone!.number
      );

      expect(result).toBe(true);
      const updatedContact = await emergencyContactService.getContact(contact);
      expect(updatedContact?.notificationMethods.phone?.verified).toBe(true);
    });
  });

  describe('updateContact', () => {
    it('should update contact information', async () => {
      const contact = await emergencyContactService.addContact(mockContact);
      const updates = {
        name: 'Updated Name',
        relationship: 'Updated Relationship',
      };

      await emergencyContactService.updateContact(contact, updates);
      const updatedContact = await emergencyContactService.getContact(contact);

      expect(updatedContact?.name).toBe(updates.name);
      expect(updatedContact?.relationship).toBe(updates.relationship);
      expect(liabilityProtection.logCriticalAction).toHaveBeenCalledWith(
        'EMERGENCY_CONTACT_UPDATED',
        'current-user',
        expect.any(Object)
      );
    });

    it('should throw error when updating non-existent contact', async () => {
      await expect(emergencyContactService.updateContact(
        'non-existent-id',
        { name: 'New Name' }
      )).rejects.toThrow('Contact not found');
    });
  });

  describe('removeContact', () => {
    it('should remove contact successfully', async () => {
      const contact = await emergencyContactService.addContact(mockContact);
      await emergencyContactService.removeContact(contact);

      const removedContact = await emergencyContactService.getContact(contact);
      expect(removedContact).toBeNull();
      expect(liabilityProtection.logCriticalAction).toHaveBeenCalledWith(
        'EMERGENCY_CONTACT_REMOVED',
        'current-user',
        expect.any(Object)
      );
    });

    it('should throw error when removing non-existent contact', async () => {
      await expect(emergencyContactService.removeContact('non-existent-id'))
        .rejects
        .toThrow('Contact not found');
    });
  });
});
