import axios from 'axios';
import { webSocketService } from './WebSocketService';
import { pushNotificationService } from './PushNotificationService';
import { liabilityProtection } from '../utils/liabilityProtection';

interface EmergencyContact {
  id: string;
  name: string;
  phone: string;
  email: string;
  relationship: string;
  priority: number;
  notificationPreferences: string[];
}

interface Location {
  latitude: number;
  longitude: number;
  accuracy: number;
  timestamp: string;
}

interface MedicalData {
  medications: Array<{
    name: string;
    dosage: string;
    frequency: string;
    lastTaken: string;
    critical: boolean;
  }>;
  allergies: string[];
  conditions: string[];
  bloodType?: string;
  emergencyNotes?: string;
}

interface EmergencyResponse {
  id: string;
  status: 'INITIATED' | 'CONTACTING' | 'RESPONDING' | 'RESOLVED' | 'FAILED';
  timestamp: string;
  responderId?: string;
  responderType?: 'FAMILY' | 'MEDICAL' | 'EMERGENCY_SERVICES';
  location?: Location;
}

class EmergencyProtocolService {
  private currentEmergency: EmergencyResponse | null = null;
  private locationWatcher: number | null = null;
  private readonly LOCATION_UPDATE_INTERVAL = 30000; // 30 seconds

  constructor() {
    this.setupWebSocket();
  }

  private setupWebSocket() {
    webSocketService.subscribe('EMERGENCY', (payload) => {
      if (payload.type === 'RESPONSE_UPDATE') {
        this.handleResponseUpdate(payload.data);
      }
    });
  }

  private async getLocation(): Promise<Location> {
    return new Promise((resolve, reject) => {
      if (!navigator.geolocation) {
        reject(new Error('Geolocation not supported'));
        return;
      }

      navigator.geolocation.getCurrentPosition(
        (position) => {
          const location: Location = {
            latitude: position.coords.latitude,
            longitude: position.coords.longitude,
            accuracy: position.coords.accuracy,
            timestamp: new Date().toISOString()
          };
          resolve(location);
        },
        (error) => {
          reject(error);
        },
        { enableHighAccuracy: true, timeout: 5000, maximumAge: 0 }
      );
    });
  }

  private startLocationTracking() {
    if (this.locationWatcher !== null) return;

    this.locationWatcher = window.setInterval(async () => {
      try {
        const location = await this.getLocation();
        await this.updateEmergencyLocation(location);
      } catch (error) {
        console.error('Failed to update location:', error);
        liabilityProtection.logLiabilityRisk(
          'LOCATION_UPDATE_FAILED',
          'HIGH',
          { error }
        );
      }
    }, this.LOCATION_UPDATE_INTERVAL);
  }

  private stopLocationTracking() {
    if (this.locationWatcher !== null) {
      window.clearInterval(this.locationWatcher);
      this.locationWatcher = null;
    }
  }

  private async updateEmergencyLocation(location: Location) {
    if (!this.currentEmergency) return;

    try {
      await axios.put(`/api/emergency/${this.currentEmergency.id}/location`, location);
      
      // Log location update for liability
      liabilityProtection.logCriticalAction(
        'EMERGENCY_LOCATION_UPDATE',
        'current-user',
        {
          emergencyId: this.currentEmergency.id,
          timestamp: location.timestamp
        },
        true
      );
    } catch (error) {
      console.error('Failed to update emergency location:', error);
      liabilityProtection.logLiabilityRisk(
        'EMERGENCY_LOCATION_UPDATE_FAILED',
        'HIGH',
        { error, location }
      );
    }
  }

  private async handleResponseUpdate(update: Partial<EmergencyResponse>) {
    if (!this.currentEmergency) return;

    this.currentEmergency = { ...this.currentEmergency, ...update };

    // Log response update for liability
    liabilityProtection.logCriticalAction(
      'EMERGENCY_RESPONSE_UPDATE',
      'current-user',
      {
        emergencyId: this.currentEmergency.id,
        status: this.currentEmergency.status,
        timestamp: new Date().toISOString()
      },
      true
    );

    if (this.currentEmergency.status === 'RESOLVED') {
      this.stopLocationTracking();
      this.currentEmergency = null;
    }
  }

  public async initiateEmergencyProtocol(
    reason: string,
    severity: 'HIGH' | 'CRITICAL'
  ): Promise<EmergencyResponse> {
    try {
      // Get current location
      const location = await this.getLocation();

      // Get medical data
      const medicalData = await this.getMedicalData();

      // Create emergency record
      const response = await axios.post('/api/emergency', {
        reason,
        severity,
        location,
        medicalData,
        timestamp: new Date().toISOString()
      });

      this.currentEmergency = response.data;

      // Start location tracking
      this.startLocationTracking();

      // Notify emergency contacts
      await this.notifyEmergencyContacts(reason, severity);

      // Log emergency initiation for liability
      liabilityProtection.logCriticalAction(
        'EMERGENCY_INITIATED',
        'current-user',
        {
          emergencyId: this.currentEmergency.id,
          reason,
          severity,
          timestamp: new Date().toISOString()
        },
        true
      );

      return this.currentEmergency;
    } catch (error) {
      console.error('Failed to initiate emergency protocol:', error);
      liabilityProtection.logLiabilityRisk(
        'EMERGENCY_INITIATION_FAILED',
        'CRITICAL',
        { error, reason, severity }
      );
      throw error;
    }
  }

  private async getMedicalData(): Promise<MedicalData> {
    try {
      const response = await axios.get('/api/medical-data');
      return response.data;
    } catch (error) {
      console.error('Failed to fetch medical data:', error);
      liabilityProtection.logLiabilityRisk(
        'MEDICAL_DATA_FETCH_FAILED',
        'HIGH',
        { error }
      );
      throw error;
    }
  }

  private async notifyEmergencyContacts(
    reason: string,
    severity: 'HIGH' | 'CRITICAL'
  ): Promise<void> {
    try {
      // Get emergency contacts
      const response = await axios.get('/api/emergency-contacts');
      const contacts: EmergencyContact[] = response.data;

      // Sort contacts by priority
      contacts.sort((a, b) => a.priority - b.priority);

      // Notify each contact based on their preferences
      for (const contact of contacts) {
        for (const preference of contact.notificationPreferences) {
          switch (preference) {
            case 'PUSH':
              await pushNotificationService.sendNotification(
                'Emergency Alert',
                {
                  body: `Emergency situation: ${reason}. Severity: ${severity}`,
                  priority: severity,
                  data: {
                    emergencyId: this.currentEmergency?.id,
                    contactId: contact.id
                  }
                }
              );
              break;
            case 'SMS':
              await axios.post('/api/notifications/sms', {
                to: contact.phone,
                message: `Emergency Alert: ${reason}. Severity: ${severity}`,
                emergencyId: this.currentEmergency?.id
              });
              break;
            case 'EMAIL':
              await axios.post('/api/notifications/email', {
                to: contact.email,
                subject: `Emergency Alert - ${severity} Priority`,
                message: `Emergency situation: ${reason}`,
                emergencyId: this.currentEmergency?.id
              });
              break;
          }
        }
      }

      // Log notifications for liability
      liabilityProtection.logCriticalAction(
        'EMERGENCY_CONTACTS_NOTIFIED',
        'current-user',
        {
          contactCount: contacts.length,
          emergencyId: this.currentEmergency?.id,
          timestamp: new Date().toISOString()
        },
        true
      );
    } catch (error) {
      console.error('Failed to notify emergency contacts:', error);
      liabilityProtection.logLiabilityRisk(
        'EMERGENCY_NOTIFICATION_FAILED',
        'CRITICAL',
        { error }
      );
      throw error;
    }
  }

  public async cancelEmergency(reason: string): Promise<void> {
    if (!this.currentEmergency) {
      throw new Error('No active emergency to cancel');
    }

    try {
      await axios.put(`/api/emergency/${this.currentEmergency.id}/cancel`, { reason });
      
      this.stopLocationTracking();
      this.currentEmergency = null;

      // Log cancellation for liability
      liabilityProtection.logCriticalAction(
        'EMERGENCY_CANCELLED',
        'current-user',
        {
          reason,
          timestamp: new Date().toISOString()
        },
        true
      );
    } catch (error) {
      console.error('Failed to cancel emergency:', error);
      liabilityProtection.logLiabilityRisk(
        'EMERGENCY_CANCELLATION_FAILED',
        'HIGH',
        { error, reason }
      );
      throw error;
    }
  }

  public getCurrentEmergency(): EmergencyResponse | null {
    return this.currentEmergency;
  }
}

export const emergencyProtocolService = new EmergencyProtocolService();
