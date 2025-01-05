export type EmergencyAction = 
  | 'notify_user'
  | 'notify_family'
  | 'notify_provider'
  | 'notify_all'
  | 'activate_emergency_access';

export interface EmergencyLevel {
  name: string;
  actions: EmergencyAction[];
}

export interface EmergencyStatus {
  escalationLevel: number;
  missedDoses: number;
}

export interface EmergencyNotification {
  userId: string;
  medicationId: string;
  reason: string;
  priority?: 'high' | 'urgent' | 'emergency';
  notifyProvider?: boolean;
  data?: {
    patientName?: string;
    medicationName?: string;
    contactPhone?: string;
    [key: string]: any;
  };
}
