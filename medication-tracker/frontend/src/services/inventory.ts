import axiosInstance from './axiosConfig';

export interface MedicationSupply {
  medicationId: string;
  currentQuantity: number;
  unitType: string;
  refillThreshold: number;
  lastRefillDate: string;
  nextRefillDate: string;
  daysRemaining: number;
  refillsRemaining: number;
  pharmacyInfo?: {
    name: string;
    phone?: string;
    email?: string;
    address?: string;
    prescriptionNumber?: string;
  };
}

export interface RefillHistory {
  id: string;
  medicationId: string;
  refillDate: string;
  quantity: number;
  source: string;
  notes?: string;
}

export interface UsageData {
  date: string;
  quantity: number;
  expected: number;
}

export interface SupplySummary {
  totalMedications: number;
  lowSupplyCount: number;
  averageDaysRemaining: number;
  nextRefillDate: string;
}

export interface PredictionData {
  date: string;
  predicted: number;
  upperBound: number;
  lowerBound: number;
  anomaly?: boolean;
  anomalyDescription?: string;
}

export interface RefillPrediction {
  nextRefillDate: string;
  daysUntilRefill: number;
  confidence: number;
  factors: string[];
}

export interface NotificationSettings {
  enabled: boolean;
  channels: {
    email: boolean;
    push: boolean;
    sms: boolean;
  };
  thresholds: {
    lowSupply: number;
    refillReminder: number;
    unusualUsage: number;
  };
  schedule: {
    frequency: 'daily' | 'weekly' | 'custom';
    customHours?: number[];
    timezone: string;
  };
  contacts: {
    email?: string;
    phone?: string;
    caregivers?: string[];
  };
}

export const inventoryService = {
  async getSupplyInfo(medicationId: string): Promise<MedicationSupply> {
    const response = await axiosInstance.get(`/inventory/${medicationId}/supply`);
    return response.data;
  },

  async updateSupply(medicationId: string, supplyData: Partial<MedicationSupply>): Promise<MedicationSupply> {
    const response = await axiosInstance.put(`/inventory/${medicationId}/supply`, supplyData);
    return response.data;
  },

  async recordRefill(medicationId: string, refillData: {
    amount: number;
    refillDate: string;
    source?: string;
    notes?: string;
  }): Promise<void> {
    await axiosInstance.post(`/inventory/${medicationId}/refill`, refillData);
  },

  async getRefillHistory(medicationId: string): Promise<RefillHistory[]> {
    const response = await axiosInstance.get(`/inventory/${medicationId}/refill-history`);
    return response.data;
  },

  async getRefillReminders(): Promise<{
    medicationId: string;
    name: string;
    daysUntilRefill: number;
    currentQuantity: number;
    refillThreshold: number;
  }[]> {
    const response = await axiosInstance.get('/inventory/refill-reminders');
    return response.data;
  },

  async updatePharmacyInfo(medicationId: string, pharmacyInfo: MedicationSupply['pharmacyInfo']): Promise<void> {
    await axiosInstance.put(`/inventory/${medicationId}/pharmacy`, pharmacyInfo);
  },

  calculateDaysRemaining(
    currentQuantity: number,
    dailyDoses: number,
    doseAmount: number
  ): number {
    return Math.floor(currentQuantity / (dailyDoses * doseAmount));
  },

  shouldNotifyRefill(
    currentQuantity: number,
    refillThreshold: number,
    daysRemaining: number
  ): boolean {
    return currentQuantity <= refillThreshold || daysRemaining <= 7;
  },

  async exportInventoryReport(): Promise<Blob> {
    const response = await axiosInstance.get('/inventory/export', {
      responseType: 'blob'
    });
    return response.data;
  },

  async getUsageHistory(medicationId: string): Promise<UsageData[]> {
    const response = await axiosInstance.get(`/inventory/${medicationId}/usage`);
    return response.data;
  },

  async getSupplySummary(medicationId: string): Promise<SupplySummary> {
    const response = await axiosInstance.get(`/inventory/${medicationId}/summary`);
    return response.data;
  },

  async analyzeUsagePatterns(medicationId: string): Promise<{
    adherenceRate: number;
    averageUsage: number;
    unusualPatterns: {
      date: string;
      pattern: string;
      severity: 'low' | 'medium' | 'high';
    }[];
  }> {
    const response = await axiosInstance.get(`/inventory/${medicationId}/analysis`);
    return response.data;
  },

  async getPredictedUsage(medicationId: string): Promise<PredictionData[]> {
    const response = await axiosInstance.get(`/inventory/${medicationId}/predictions`);
    return response.data;
  },

  async getPredictedRefill(medicationId: string): Promise<RefillPrediction> {
    const response = await axiosInstance.get(`/inventory/${medicationId}/refill-prediction`);
    return response.data;
  },

  async getNotificationSettings(): Promise<NotificationSettings> {
    const response = await axiosInstance.get('/inventory/notifications/settings');
    return response.data;
  },

  async updateNotificationSettings(settings: NotificationSettings): Promise<void> {
    await axiosInstance.put('/inventory/notifications/settings', settings);
  },

  async testNotification(channel: keyof NotificationSettings['channels']): Promise<void> {
    await axiosInstance.post('/inventory/notifications/test', { channel });
  }
};
