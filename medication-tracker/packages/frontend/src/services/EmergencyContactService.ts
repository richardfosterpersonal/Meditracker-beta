import { liabilityProtection } from '../utils/liabilityProtection';
import { generateUUID } from '../utils/uuid';

export interface EmergencyContact {
  id: string;
  name: string;
  relationship: string;
  priority: number;
  notificationMethods: {
    email?: {
      address: string;
      verified: boolean;
      lastVerified?: string;
    };
    phone?: {
      number: string;
      verified: boolean;
      lastVerified?: string;
      canReceiveSMS: boolean;
    };
    pushNotification?: {
      enabled: boolean;
      token?: string;
    };
  };
  availability: {
    timezone: string;
    availableHours?: {
      start: string;  // 24h format "HH:mm"
      end: string;    // 24h format "HH:mm"
    };
    backupContact?: string;  // ID of backup contact
  };
  accessLevel: {
    canViewMedicalHistory: boolean;
    canViewCurrentLocation: boolean;
    canViewMedications: boolean;
    canUpdateEmergencyStatus: boolean;
  };
  lastNotified?: string;
  lastResponse?: {
    timestamp: string;
    status: 'acknowledged' | 'responding' | 'unavailable';
    message?: string;
  };
}

class EmergencyContactService {
  private contacts: Map<string, EmergencyContact> = new Map();

  public async notifyContacts(
    emergencyInfo: {
      severity: 'HIGH' | 'CRITICAL';
      location?: GeolocationCoordinates;
      medicalInfo?: any;
      message?: string;
    }
  ): Promise<{
    notified: string[];
    failed: string[];
    pending: string[];
  }> {
    const results = {
      notified: [] as string[],
      failed: [] as string[],
      pending: [] as string[],
    };

    try {
      // Get sorted contacts by priority
      const sortedContacts = Array.from(this.contacts.values())
        .sort((a, b) => a.priority - b.priority);

      // Log notification attempt
      liabilityProtection.logCriticalAction(
        'EMERGENCY_CONTACT_NOTIFICATION_STARTED',
        'system',
        {
          numberOfContacts: sortedContacts.length,
          severity: emergencyInfo.severity,
          timestamp: new Date().toISOString()
        }
      );

      for (const contact of sortedContacts) {
        try {
          const notified = await this.notifyContact(contact, emergencyInfo);
          
          if (notified) {
            results.notified.push(contact.id);
          } else {
            results.failed.push(contact.id);
          }

          // Log individual notification
          liabilityProtection.logCriticalAction(
            'EMERGENCY_CONTACT_NOTIFIED',
            'system',
            {
              contactId: contact.id,
              success: notified,
              methods: Object.keys(contact.notificationMethods),
              timestamp: new Date().toISOString()
            }
          );
        } catch (error) {
          results.failed.push(contact.id);
          console.error(`Failed to notify contact ${contact.id}:`, error);
        }
      }

      return results;
    } catch (error) {
      console.error('Failed to notify emergency contacts:', error);
      throw error;
    }
  }

  private async notifyContact(
    contact: EmergencyContact,
    emergencyInfo: any
  ): Promise<boolean> {
    const notifications: Promise<boolean>[] = [];

    // Email notification
    if (contact.notificationMethods.email?.verified) {
      notifications.push(this.sendEmailNotification(
        contact.notificationMethods.email.address,
        emergencyInfo
      ));
    }

    // SMS notification
    if (contact.notificationMethods.phone?.verified && 
        contact.notificationMethods.phone.canReceiveSMS) {
      notifications.push(this.sendSMSNotification(
        contact.notificationMethods.phone.number,
        emergencyInfo
      ));
    }

    // Push notification
    if (contact.notificationMethods.pushNotification?.enabled) {
      notifications.push(this.sendPushNotification(
        contact.notificationMethods.pushNotification.token!,
        emergencyInfo
      ));
    }

    try {
      const results = await Promise.allSettled(notifications);
      const success = results.some(result => 
        result.status === 'fulfilled' && result.value
      );

      // Update contact's last notification status
      if (success) {
        contact.lastNotified = new Date().toISOString();
      }

      return success;
    } catch (error) {
      console.error('Failed to send notifications:', error);
      return false;
    }
  }

  private async sendEmailNotification(
    email: string,
    emergencyInfo: any
  ): Promise<boolean> {
    try {
      // Implement email sending logic here
      // For now, just log the attempt
      console.log('Would send email to:', email);
      return true;
    } catch (error) {
      console.error('Failed to send email:', error);
      return false;
    }
  }

  private async sendSMSNotification(
    phone: string,
    emergencyInfo: any
  ): Promise<boolean> {
    try {
      // Implement SMS sending logic here
      // For now, just log the attempt
      console.log('Would send SMS to:', phone);
      return true;
    } catch (error) {
      console.error('Failed to send SMS:', error);
      return false;
    }
  }

  private async sendPushNotification(
    token: string,
    emergencyInfo: any
  ): Promise<boolean> {
    try {
      // Implement push notification logic here
      // For now, just log the attempt
      console.log('Would send push notification to:', token);
      return true;
    } catch (error) {
      console.error('Failed to send push notification:', error);
      return false;
    }
  }

  public async addContact(contact: Omit<EmergencyContact, 'id'>): Promise<string> {
    try {
      const id = generateUUID();
      const newContact: EmergencyContact = {
        ...contact,
        id,
      };

      this.contacts.set(id, newContact);

      // Log contact addition
      liabilityProtection.logCriticalAction(
        'EMERGENCY_CONTACT_ADDED',
        'current-user',
        {
          contactId: id,
          timestamp: new Date().toISOString()
        }
      );

      return id;
    } catch (error) {
      console.error('Failed to add emergency contact:', error);
      throw error;
    }
  }

  public async updateContact(
    id: string,
    updates: Partial<EmergencyContact>
  ): Promise<void> {
    try {
      const contact = this.contacts.get(id);
      if (!contact) {
        throw new Error('Contact not found');
      }

      const updatedContact = {
        ...contact,
        ...updates,
      };

      this.contacts.set(id, updatedContact);

      // Log contact update
      liabilityProtection.logCriticalAction(
        'EMERGENCY_CONTACT_UPDATED',
        'current-user',
        {
          contactId: id,
          timestamp: new Date().toISOString()
        }
      );
    } catch (error) {
      console.error('Failed to update emergency contact:', error);
      throw error;
    }
  }

  public async removeContact(id: string): Promise<void> {
    try {
      if (!this.contacts.has(id)) {
        throw new Error('Contact not found');
      }

      this.contacts.delete(id);

      // Log contact removal
      liabilityProtection.logCriticalAction(
        'EMERGENCY_CONTACT_REMOVED',
        'current-user',
        {
          contactId: id,
          timestamp: new Date().toISOString()
        }
      );
    } catch (error) {
      console.error('Failed to remove emergency contact:', error);
      throw error;
    }
  }

  public async getContact(id: string): Promise<EmergencyContact | null> {
    return this.contacts.get(id) || null;
  }

  public async getAllContacts(): Promise<EmergencyContact[]> {
    return Array.from(this.contacts.values());
  }

  public async verifyContactMethod(
    contactId: string,
    method: 'email' | 'phone',
    value: string
  ): Promise<boolean> {
    try {
      const contact = await this.getContact(contactId);
      if (!contact) {
        throw new Error('Contact not found');
      }

      // In a real implementation, send verification code
      // For now, just mark as verified
      if (method === 'email' && contact.notificationMethods.email) {
        contact.notificationMethods.email.verified = true;
        contact.notificationMethods.email.lastVerified = new Date().toISOString();
      } else if (method === 'phone' && contact.notificationMethods.phone) {
        contact.notificationMethods.phone.verified = true;
        contact.notificationMethods.phone.lastVerified = new Date().toISOString();
      }

      await this.updateContact(contactId, contact);
      return true;
    } catch (error) {
      console.error('Failed to verify contact method:', error);
      return false;
    }
  }
}

export const emergencyContactService = new EmergencyContactService();
