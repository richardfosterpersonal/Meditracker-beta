import axios from 'axios';
import { liabilityProtection } from '../utils/liabilityProtection';

interface EmergencyService {
  id: string;
  name: string;
  type: 'AMBULANCE' | 'FIRE' | 'POLICE' | 'POISON_CONTROL';
  contact: {
    emergency: string;
    nonEmergency: string;
    api?: string;
  };
  coverage: {
    radius: number;
    coordinates: {
      latitude: number;
      longitude: number;
    };
  };
}

interface AutomatedResponse {
  serviceId: string;
  estimatedArrival: string;
  responderDetails?: {
    unit: string;
    eta: string;
    status: string;
  };
  trackingId: string;
}

class EmergencyServiceIntegration {
  private activeResponders: Map<string, AutomatedResponse> = new Map();
  private readonly API_ENDPOINTS = {
    AMBULANCE: process.env.REACT_APP_AMBULANCE_API,
    FIRE: process.env.REACT_APP_FIRE_API,
    POLICE: process.env.REACT_APP_POLICE_API,
    POISON_CONTROL: process.env.REACT_APP_POISON_CONTROL_API,
  };

  public async findNearestServices(
    location: { latitude: number; longitude: number },
    types: Array<EmergencyService['type']>
  ): Promise<EmergencyService[]> {
    try {
      const response = await axios.post('/api/emergency-services/nearest', {
        location,
        types,
      });

      // Log service discovery for liability
      liabilityProtection.logCriticalAction(
        'EMERGENCY_SERVICES_LOCATED',
        'current-user',
        {
          location,
          types,
          servicesFound: response.data.length,
        },
        true
      );

      return response.data;
    } catch (error) {
      console.error('Failed to find emergency services:', error);
      liabilityProtection.logLiabilityRisk(
        'SERVICE_LOCATION_FAILED',
        'CRITICAL',
        { error, location, types }
      );
      throw error;
    }
  }

  public async dispatchAutomatedService(
    serviceId: string,
    emergencyDetails: {
      type: string;
      severity: 'HIGH' | 'CRITICAL';
      location: { latitude: number; longitude: number };
      medicalData: any;
      patientDetails: any;
    }
  ): Promise<AutomatedResponse> {
    try {
      // Get service details
      const service = await this.getServiceDetails(serviceId);
      
      // Prepare dispatch request
      const dispatchData = {
        ...emergencyDetails,
        timestamp: new Date().toISOString(),
        serviceType: service.type,
      };

      // Call service-specific API endpoint
      const response = await axios.post(
        `${this.API_ENDPOINTS[service.type]}/dispatch`,
        dispatchData,
        {
          headers: {
            'X-Emergency-Token': process.env.REACT_APP_EMERGENCY_API_KEY,
          },
        }
      );

      const automatedResponse: AutomatedResponse = response.data;
      this.activeResponders.set(serviceId, automatedResponse);

      // Log dispatch for liability
      liabilityProtection.logCriticalAction(
        'EMERGENCY_SERVICE_DISPATCHED',
        'current-user',
        {
          serviceId,
          trackingId: automatedResponse.trackingId,
          timestamp: new Date().toISOString(),
        },
        true
      );

      return automatedResponse;
    } catch (error) {
      console.error('Failed to dispatch emergency service:', error);
      liabilityProtection.logLiabilityRisk(
        'SERVICE_DISPATCH_FAILED',
        'CRITICAL',
        { error, serviceId, emergencyDetails }
      );
      throw error;
    }
  }

  private async getServiceDetails(serviceId: string): Promise<EmergencyService> {
    try {
      const response = await axios.get(`/api/emergency-services/${serviceId}`);
      return response.data;
    } catch (error) {
      console.error('Failed to get service details:', error);
      throw error;
    }
  }

  public async trackResponse(trackingId: string): Promise<{
    status: string;
    location?: { latitude: number; longitude: number };
    eta?: string;
  }> {
    try {
      const response = await axios.get(`/api/emergency-services/track/${trackingId}`);
      
      // Log tracking update for liability
      liabilityProtection.logCriticalAction(
        'EMERGENCY_RESPONSE_TRACKED',
        'current-user',
        {
          trackingId,
          status: response.data.status,
          timestamp: new Date().toISOString(),
        }
      );

      return response.data;
    } catch (error) {
      console.error('Failed to track emergency response:', error);
      liabilityProtection.logLiabilityRisk(
        'RESPONSE_TRACKING_FAILED',
        'HIGH',
        { error, trackingId }
      );
      throw error;
    }
  }

  public async cancelResponse(
    trackingId: string,
    reason: string
  ): Promise<void> {
    try {
      await axios.post(`/api/emergency-services/cancel/${trackingId}`, { reason });
      
      // Log cancellation for liability
      liabilityProtection.logCriticalAction(
        'EMERGENCY_RESPONSE_CANCELLED',
        'current-user',
        {
          trackingId,
          reason,
          timestamp: new Date().toISOString(),
        },
        true
      );

      this.activeResponders.delete(trackingId);
    } catch (error) {
      console.error('Failed to cancel emergency response:', error);
      liabilityProtection.logLiabilityRisk(
        'RESPONSE_CANCELLATION_FAILED',
        'HIGH',
        { error, trackingId, reason }
      );
      throw error;
    }
  }

  public async getActiveResponders(): Promise<Map<string, AutomatedResponse>> {
    return this.activeResponders;
  }

  public async updatePatientStatus(
    trackingId: string,
    status: {
      condition: string;
      vitals?: {
        heartRate?: number;
        bloodPressure?: string;
        temperature?: number;
      };
      notes?: string;
    }
  ): Promise<void> {
    try {
      await axios.put(`/api/emergency-services/patient-status/${trackingId}`, status);
      
      // Log status update for liability
      liabilityProtection.logCriticalAction(
        'PATIENT_STATUS_UPDATED',
        'current-user',
        {
          trackingId,
          status,
          timestamp: new Date().toISOString(),
        },
        true
      );
    } catch (error) {
      console.error('Failed to update patient status:', error);
      liabilityProtection.logLiabilityRisk(
        'PATIENT_STATUS_UPDATE_FAILED',
        'HIGH',
        { error, trackingId, status }
      );
      throw error;
    }
  }
}

export const emergencyServiceIntegration = new EmergencyServiceIntegration();
