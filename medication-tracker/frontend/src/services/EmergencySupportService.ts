import axios from 'axios';
import { liabilityProtection } from '../utils/liabilityProtection';

interface EmergencyContact {
  id: string;
  name: string;
  relationship: string;
  phone: string;
  email: string;
  isCaregiver: boolean;
  notificationPreferences: ('SMS' | 'EMAIL' | 'PUSH')[];
  availability: {
    timezone: string;
    preferredHours?: {
      start: string;
      end: string;
    };
  };
}

interface EmergencySituation {
  id: string;
  userId: string;
  timestamp: string;
  type: 'MEDICATION' | 'HEALTH' | 'OTHER';
  description: string;
  status: 'ACTIVE' | 'RESOLVED' | 'CANCELLED';
  notifiedContacts: Array<{
    contactId: string;
    notifiedAt: string;
    method: string;
    acknowledged: boolean;
  }>;
}

export class EmergencySupportService {
  private readonly EMERGENCY_SERVICES_DISCLAIMER = `
    IMPORTANT: This app is not an emergency service. 
    In case of emergency, directly call your local emergency services:
    - Emergency: 911 (US)
    - Police
    - Ambulance
    - Fire Department
  `;

  public async initiateSupport(
    description: string,
    type: EmergencySituation['type']
  ): Promise<EmergencySituation> {
    try {
      // Log support initiation
      liabilityProtection.logCriticalAction(
        'SUPPORT_INITIATED',
        'current-user',
        {
          type,
          timestamp: new Date().toISOString()
        },
        true
      );

      // Create support situation record
      const response = await axios.post('/api/emergency-support', {
        type,
        description,
        timestamp: new Date().toISOString()
      });

      const situation: EmergencySituation = response.data;

      // Show emergency services disclaimer
      await this.showEmergencyDisclaimer();

      return situation;
    } catch (error) {
      console.error('Failed to initiate support:', error);
      liabilityProtection.logLiabilityRisk(
        'SUPPORT_INITIATION_FAILED',
        'HIGH',
        { error, type, description }
      );
      throw error;
    }
  }

  private async showEmergencyDisclaimer(): Promise<void> {
    // Implementation would show disclaimer to user
    console.info(this.EMERGENCY_SERVICES_DISCLAIMER);
  }

  public async notifyContacts(
    situationId: string,
    message: string
  ): Promise<void> {
    try {
      // Get prioritized contacts
      const contacts = await this.getPrioritizedContacts();

      for (const contact of contacts) {
        // Notify each contact based on their preferences
        for (const method of contact.notificationPreferences) {
          await this.sendNotification(contact, method, message, situationId);
        }
      }

      // Log notifications for liability
      liabilityProtection.logCriticalAction(
        'CONTACTS_NOTIFIED',
        'current-user',
        {
          situationId,
          contactCount: contacts.length,
          timestamp: new Date().toISOString()
        },
        true
      );
    } catch (error) {
      console.error('Failed to notify contacts:', error);
      liabilityProtection.logLiabilityRisk(
        'CONTACT_NOTIFICATION_FAILED',
        'HIGH',
        { error, situationId }
      );
      throw error;
    }
  }

  private async getPrioritizedContacts(): Promise<EmergencyContact[]> {
    const response = await axios.get('/api/emergency-contacts');
    const contacts: EmergencyContact[] = response.data;

    // Prioritize caregivers and sort by availability
    return contacts.sort((a, b) => {
      if (a.isCaregiver !== b.isCaregiver) {
        return a.isCaregiver ? -1 : 1;
      }
      return 0;
    });
  }

  private async sendNotification(
    contact: EmergencyContact,
    method: string,
    message: string,
    situationId: string
  ): Promise<void> {
    const notification = {
      recipient: contact,
      message: `${message}\n\n${this.EMERGENCY_SERVICES_DISCLAIMER}`,
      timestamp: new Date().toISOString(),
      situationId
    };

    switch (method) {
      case 'SMS':
        await axios.post('/api/notifications/sms', notification);
        break;
      case 'EMAIL':
        await axios.post('/api/notifications/email', notification);
        break;
      case 'PUSH':
        await axios.post('/api/notifications/push', notification);
        break;
    }
  }

  public async prepareSupportInfo(): Promise<string> {
    try {
      // Generate printable emergency info
      const response = await axios.get('/api/emergency-support/info');
      
      // Log info generation for liability
      liabilityProtection.logCriticalAction(
        'SUPPORT_INFO_GENERATED',
        'current-user',
        { timestamp: new Date().toISOString() }
      );

      return response.data;
    } catch (error) {
      console.error('Failed to prepare support info:', error);
      throw error;
    }
  }

  public async updateSituationStatus(
    situationId: string,
    status: EmergencySituation['status'],
    notes?: string
  ): Promise<void> {
    try {
      await axios.put(`/api/emergency-support/${situationId}/status`, {
        status,
        notes,
        timestamp: new Date().toISOString()
      });

      // Log status update for liability
      liabilityProtection.logCriticalAction(
        'SITUATION_STATUS_UPDATED',
        'current-user',
        {
          situationId,
          status,
          timestamp: new Date().toISOString()
        }
      );
    } catch (error) {
      console.error('Failed to update situation status:', error);
      throw error;
    }
  }

  public async getLocalEmergencyNumbers(): Promise<{
    emergency: string;
    police: string;
    ambulance: string;
    fire: string;
  }> {
    // This would typically get local emergency numbers based on location
    return {
      emergency: '911',
      police: '911',
      ambulance: '911',
      fire: '911'
    };
  }
}
