export interface EmergencyContact {
  id: string;
  name: string;
  relationship: string;
  priority: number;
  notificationMethods: {
    email?: {
      address: string;
      verified: boolean;
    };
    phone?: {
      number: string;
      verified: boolean;
    };
  };
  availability: {
    timezone: string;
    preferredTimes?: string[];
  };
  accessLevel: {
    canViewMedicalHistory: boolean;
    canViewCurrentLocation: boolean;
    canViewMedications: boolean;
    canUpdateEmergencyStatus: boolean;
  };
}

export interface EmergencyContactFormData {
  name: string;
  relationship: string;
  phone: string;
  email: string;
}

export interface EmergencyService {
  id: string;
  name: string;
  type: 'HOSPITAL' | 'POLICE' | 'FIRE' | 'AMBULANCE';
  contact: {
    phone: string;
    emergency: string;
  };
  location: {
    latitude: number;
    longitude: number;
    address: string;
  };
  availability: '24/7' | 'LIMITED';
  services: string[];
}

export interface RegionInfo {
  countryCode: string;
  emergencyNumbers: {
    police: string;
    ambulance: string;
    fire: string;
  };
  timezone: string;
}
